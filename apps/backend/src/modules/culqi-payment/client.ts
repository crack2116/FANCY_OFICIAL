import type { Logger } from "@medusajs/framework/types"
import { CulqiApiError, CulqiConfigError, CulqiTimeoutError } from "./errors"
import type {
  CulqiChargeRequest,
  CulqiChargeResponse,
  CulqiOptions,
  CulqiRefundRequest,
  CulqiRefundResponse,
} from "./types"

export class CulqiClient {
  private secretKey?: string
  private baseUrl: string
  private logger?: Logger

  constructor(options: CulqiOptions, logger?: Logger) {
    this.secretKey = options.secretKey
    this.baseUrl = (options.baseUrl || process.env.CULQI_API_URL || "https://api.culqi.com/v2").replace(/\/+$/, "")
    this.logger = logger
  }

  private getAuthHeaders(): Record<string, string> {
    if (!this.secretKey) {
      throw new CulqiConfigError(
        "Culqi Secret Key is not configured. External operations require CULQI_SECRET_KEY."
      )
    }

    return {
      Authorization: `Bearer ${this.secretKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    }
  }

  private async request<T>(
    endpoint: string,
    options: {
      method: "GET" | "POST"
      body?: unknown
      retries?: number
      timeoutMs?: number
      safeToRetry?: boolean
    }
  ): Promise<T> {
    const { method, body, timeoutMs = 15000, safeToRetry = method === "GET" } = options
    const retries = safeToRetry ? (options.retries ?? 2) : 0
    const url = `${this.baseUrl}${endpoint}`
    const headers = this.getAuthHeaders()

    let attempt = 0
    let lastError: Error | null = null

    while (attempt <= retries) {
      attempt++
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        const text = await response.text()
        let parsedData: any
        try {
          parsedData = text ? JSON.parse(text) : {}
        } catch {
          parsedData = { message: text }
        }

        if (!response.ok) {
          const userMessage =
            parsedData?.user_message ||
            parsedData?.merchant_message ||
            parsedData?.message ||
            "Error procesando la solicitud con Culqi"
          const code = parsedData?.code || parsedData?.type || `HTTP_${response.status}`

          this.logger?.warn?.(
            `[CulqiClient] Request failed (${response.status}) at ${endpoint}: code=${code}`
          )

          // 5xx errors can ONLY be retried if operation is safe (e.g. read-only GET queries)
          if (safeToRetry && response.status >= 500 && attempt <= retries) {
            await new Promise((res) => setTimeout(res, 500 * attempt))
            continue
          }

          throw new CulqiApiError(
            `Culqi error: ${userMessage} (${code})`,
            response.status,
            code,
            userMessage
          )
        }

        return parsedData as T
      } catch (err: any) {
        clearTimeout(timeoutId)
        if (err instanceof CulqiApiError) {
          throw err
        }

        lastError = err
        const isTimeout = err?.name === "AbortError"
        this.logger?.warn?.(
          `[CulqiClient] Network error on attempt ${attempt} at ${endpoint}: ${isTimeout ? "Timeout" : err?.message}`
        )

        // Non-idempotent writes (POST /charges, /refunds, /capture) MUST NEVER be retried on timeout
        if (!safeToRetry) {
          if (isTimeout) {
            throw new CulqiTimeoutError(
              `Culqi communication timed out after ${timeoutMs}ms for ${method} ${endpoint}. State is uncertain.`,
              { endpoint, method }
            )
          }
          throw new CulqiTimeoutError(
            `Culqi network failure during ${method} ${endpoint}: ${err?.message || "Unknown error"}. State is uncertain.`,
            { endpoint, method }
          )
        }

        if (attempt <= retries) {
          await new Promise((res) => setTimeout(res, 500 * attempt))
        }
      }
    }

    throw new CulqiApiError(
      `Culqi communication failed after ${retries + 1} attempts: ${lastError?.message || "Unknown error"}`,
      504,
      "GATEWAY_TIMEOUT"
    )
  }

  /**
   * Creates a card charge in Culqi.
   * Server-to-server call with client token (`source_id`).
   * Non-idempotent write: NEVER automatically retried on timeout.
   */
  async createCharge(chargeData: CulqiChargeRequest): Promise<CulqiChargeResponse> {
    return this.request<CulqiChargeResponse>("/charges", {
      method: "POST",
      body: chargeData,
      safeToRetry: false,
    })
  }

  /**
   * Retrieves an existing charge from Culqi.
   * Safe read-only query: retries allowed on transient failures.
   */
  async getCharge(chargeId: string): Promise<CulqiChargeResponse> {
    if (!chargeId) {
      throw new CulqiConfigError("chargeId is required to retrieve charge.")
    }
    return this.request<CulqiChargeResponse>(`/charges/${encodeURIComponent(chargeId)}`, {
      method: "GET",
      safeToRetry: true,
      retries: 2,
    })
  }

  /**
   * Lists charges matching query criteria.
   * Essential for timeout recovery and financial reconciliation.
   * Safe read-only query.
   */
  async listCharges(
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<{ data: CulqiChargeResponse[]; paging?: Record<string, unknown> }> {
    const query = new URLSearchParams()
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          query.set(key, String(value))
        }
      }
    }
    const qs = query.toString()
    const endpoint = `/charges${qs ? `?${qs}` : ""}`
    return this.request<{ data: CulqiChargeResponse[]; paging?: Record<string, unknown> }>(endpoint, {
      method: "GET",
      safeToRetry: true,
      retries: 2,
    })
  }

  /**
   * Captures an authorized charge.
   * Non-idempotent write: not retried automatically on network timeout.
   */
  async captureCharge(chargeId: string): Promise<CulqiChargeResponse> {
    if (!chargeId) {
      throw new CulqiConfigError("chargeId is required to capture charge.")
    }
    return this.request<CulqiChargeResponse>(`/charges/${encodeURIComponent(chargeId)}/capture`, {
      method: "POST",
      safeToRetry: false,
    })
  }

  /**
   * Refunds a captured charge (full or partial).
   * Non-idempotent write: not retried automatically on network timeout.
   */
  async createRefund(refundData: CulqiRefundRequest): Promise<CulqiRefundResponse> {
    return this.request<CulqiRefundResponse>("/refunds", {
      method: "POST",
      body: refundData,
      safeToRetry: false,
    })
  }
}
