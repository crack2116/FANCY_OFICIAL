import {
  AbstractPaymentProvider,
  ContainerRegistrationKeys,
  MedusaError,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import type {
  AuthorizePaymentInput,
  BigNumberInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  Logger,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"

import { CulqiClient } from "./client"
import { CulqiApiError, CulqiConfigError, CulqiTimeoutError, CulqiUncertainStateError } from "./errors"
import { CulqiIdempotencyStore } from "./idempotency"
import { CulqiReconciliationService } from "./reconciliation"
import type { CulqiOptions } from "./types"
import {
  assertAmountMatchCents,
  fromCulqiCentimos,
  requireStoredCentimos,
  sanitizePhone,
  toCulqiCentimos,
  validateCurrency,
} from "./utils"

type InjectedDependencies = {
  logger?: Logger
  [ContainerRegistrationKeys.PG_CONNECTION]?: any
  pgConnection?: any
}

export class CulqiPaymentProviderService extends AbstractPaymentProvider<CulqiOptions> {
  static identifier = "culqi"

  protected logger_: Logger | undefined
  protected options_: CulqiOptions
  protected client_: CulqiClient
  protected idempotencyStore_: CulqiIdempotencyStore
  protected reconciliationService_: CulqiReconciliationService

  static validateOptions(options: Record<string, unknown>): void {
    const isExplicitlyEnabled = process.env.CULQI_ENABLED === "true"
    if (isExplicitlyEnabled && !options.secretKey) {
      throw new CulqiConfigError(
        "CULQI_ENABLED is true, but 'secretKey' is missing in provider options or environment."
      )
    }
  }

  constructor(container: InjectedDependencies, options: CulqiOptions) {
    super(container, options)

    this.logger_ = container.logger
    this.options_ = {
      autoCapture: true,
      ...options,
      baseUrl: (options.baseUrl || process.env.CULQI_API_URL || "https://api.culqi.com/v2").replace(/\/+$/, ""),
    }

    this.client_ = new CulqiClient(this.options_, this.logger_)
    const knex = container[ContainerRegistrationKeys.PG_CONNECTION] || (container as any).pgConnection
    this.idempotencyStore_ = new CulqiIdempotencyStore(knex, this.logger_)
    this.reconciliationService_ = new CulqiReconciliationService(
      this.client_,
      this.idempotencyStore_,
      this.logger_
    )
  }

  getIdempotencyStore(): CulqiIdempotencyStore {
    return this.idempotencyStore_
  }

  getReconciliationService(): CulqiReconciliationService {
    return this.reconciliationService_
  }

  /**
   * Initializes a payment session in Medusa.
   * Medusa passes `input.amount` in MAJOR currency units (S/ 79.90 => 79.9);
   * the authoritative amount stored in session data is the equivalent integer
   * céntimos (7990), which is what Culqi requires downstream.
   */
  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const currency = validateCurrency(input.currency_code)
    const amountInCentimos = toCulqiCentimos(input.amount, currency)

    const sessionId =
      (input.data?.session_id as string) ||
      (input.data?.id as string) ||
      `culqi_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    this.logger_?.info?.(
      `[CulqiProvider] Initiating payment session ${sessionId} for ${amountInCentimos} céntimos (${currency}).`
    )

    return {
      id: sessionId,
      status: PaymentSessionStatus.PENDING,
      data: {
        ...(input.data || {}),
        session_id: sessionId,
        amount: amountInCentimos,
        currency_code: currency,
        status: PaymentSessionStatus.PENDING,
        created_at: new Date().toISOString(),
      },
    }
  }

  /**
   * Authorizes a payment using the token obtained on the frontend.
   * If autoCapture is enabled, Culqi creates and captures the charge immediately.
   *
   * Amount handling (verified against @medusajs/payment 2.21.2): the core calls
   * authorizePayment with session data only — `AuthorizePaymentInput` carries
   * NO amount field — so the authoritative charging amount is the céntimos
   * value this provider stored in session data during initiatePayment or
   * updatePayment. It is used as-is and must NOT be scaled again. If a future
   * core (or an explicit caller) passes `input.amount` it arrives in MAJOR
   * units (BigNumberInput), so it is scaled once with toCulqiCentimos.
   */
  /**
   * Authorizes a payment using the token obtained on the frontend.
   * If autoCapture is enabled, Culqi creates and captures the charge immediately.
   *
   * Amount handling (verified against @medusajs/payment 2.21.2): the core calls
   * authorizePayment with session data only — `AuthorizePaymentInput` carries
   * NO amount field — so the authoritative charging amount is the céntimos
   * value this provider stored in session data during initiatePayment or
   * updatePayment. It is used as-is and must NOT be scaled again. If a future
   * core (or an explicit caller) passes `input.amount` it arrives in MAJOR
   * units (BigNumberInput), so it is scaled once with toCulqiCentimos.
   */
  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const data = input.data || {}
    const context = input.context || {}
    const currency = validateCurrency((data.currency_code as string) || "PEN")

    const explicitAmount = (input as { amount?: BigNumberInput }).amount
    const amountInCentimos =
      explicitAmount !== undefined && explicitAmount !== null
        ? toCulqiCentimos(explicitAmount, currency)
        : requireStoredCentimos(data.amount, currency)

    // Idempotency: if charge was already processed and stored in session data, verify and return it
    if (data.charge_id) {
      this.logger_?.info?.(
        `[CulqiProvider] Payment already contains charge_id: ${data.charge_id}. Verifying idempotently.`
      )
      try {
        const existingCharge = await this.client_.getCharge(data.charge_id as string)
        const isCaptured = existingCharge.capture && existingCharge.capture_date
        return {
          status: isCaptured ? PaymentSessionStatus.CAPTURED : PaymentSessionStatus.AUTHORIZED,
          data: {
            ...data,
            charge_id: existingCharge.id,
            captured: existingCharge.capture,
            outcome: existingCharge.outcome,
          },
        }
      } catch (err: any) {
        this.logger_?.error?.(
          `[CulqiProvider] Failed to verify existing charge ${data.charge_id}: ${err.message}`
        )
      }
    }

    const sessionId = String(data.session_id || "")
    const idempotencyKey = context.idempotency_key
      ? `idem:${context.idempotency_key}`
      : CulqiIdempotencyStore.sessionKey(
          sessionId || `tok_${String(data.token_id || data.source_id || "").slice(0, 16)}`
        )

    // Acquire persistent transactional lock to prevent concurrent double charges
    const lock = await this.idempotencyStore_.acquireLock(idempotencyKey, {
      operation_type: "authorize",
      session_id: sessionId,
      amount: amountInCentimos,
      currency_code: currency,
    })

    if (lock.isDuplicate) {
      if (lock.record.status === "completed" && lock.record.charge_id) {
        this.logger_?.info?.(
          `[CulqiProvider] Idempotent hit: reusing completed charge ${lock.record.charge_id} for key ${idempotencyKey}`
        )
        const existingCharge = await this.client_.getCharge(lock.record.charge_id)
        const isCaptured = existingCharge.capture === true
        return {
          status: isCaptured ? PaymentSessionStatus.CAPTURED : PaymentSessionStatus.AUTHORIZED,
          data: {
            ...data,
            charge_id: existingCharge.id,
            amount: existingCharge.amount,
            currency_code: existingCharge.currency_code,
            captured: isCaptured,
            card_brand: existingCharge.source?.brand,
            card_last_four: existingCharge.source?.last_four,
            outcome: existingCharge.outcome,
            authorized_at: new Date(lock.record.created_at).toISOString(),
          },
        }
      }

      if (lock.record.status === "processing") {
        throw new CulqiUncertainStateError(
          "Un cobro concurrente está siendo procesado para esta sesión de pago. Espere a que finalice la transacción."
        )
      }
    }

    // Handle recovery of an expired lease or uncertain operation (H3)
    if (lock.recovered || lock.record.status === "uncertain") {
      this.logger_?.warn?.(
        `[CulqiProvider] Lock for key ${idempotencyKey} was recovered from an uncertain/expired state. Performing remote verification before proceeding.`
      )

      let recoveredCharge: any = null

      if (lock.record.charge_id) {
        try {
          recoveredCharge = await this.client_.getCharge(lock.record.charge_id)
        } catch (err: any) {
          this.logger_?.error?.(
            `[CulqiProvider] Could not retrieve previously recorded charge ${lock.record.charge_id}: ${err.message}`
          )
          await this.idempotencyStore_.fail(
            idempotencyKey,
            `Recovery verification of charge ${lock.record.charge_id} failed: ${err.message}`,
            { uncertain: true }
          )
          throw new CulqiUncertainStateError(
            "No se pudo verificar el estado del cargo registrado en Culqi tras un timeout. Por seguridad financiera, la operación queda bloqueada hasta su conciliación."
          )
        }
      }

      if (!recoveredCharge) {
        const customerEmail =
          (data.email as string) ||
          context.customer?.email ||
          (context.account_holder?.data?.email as string)

        if (!sessionId || !customerEmail) {
          this.logger_?.error?.(
            `[CulqiProvider] Cannot perform recovery reverse lookup for key ${idempotencyKey}: missing sessionId (${sessionId}) or customerEmail (${customerEmail}).`
          )
          await this.idempotencyStore_.fail(
            idempotencyKey,
            "Cannot perform recovery reverse lookup: missing sessionId or customerEmail",
            { uncertain: true }
          )
          throw new CulqiUncertainStateError(
            "No se pudo verificar el estado previo del cargo en Culqi por falta de identificadores. Por seguridad financiera, la operación queda bloqueada hasta su conciliación."
          )
        }

        try {
          const listRes = await this.client_.listCharges({
            email: customerEmail,
            amount: amountInCentimos,
            currency_code: currency,
            limit: 50,
          })
          const match = listRes.data?.find(
            (c: any) => c.metadata?.session_id === sessionId
          )
          if (match) {
            recoveredCharge = match
          }
        } catch (listErr: any) {
          this.logger_?.error?.(
            `[CulqiProvider] Reverse lookup failed during recovery of key ${idempotencyKey}: ${listErr.message}`
          )
          await this.idempotencyStore_.fail(
            idempotencyKey,
            `Recovery verification failed: ${listErr.message}`,
            { uncertain: true }
          )
          throw new CulqiUncertainStateError(
            "No se pudo verificar el estado previo del cargo en Culqi tras un timeout. Por seguridad financiera, la operación queda bloqueada hasta su conciliación."
          )
        }
      }

      if (recoveredCharge) {
        const isCaptured = recoveredCharge.capture === true
        const isSuccessful =
          recoveredCharge.state === "successful" ||
          isCaptured ||
          recoveredCharge.outcome?.type === "venta_exitosa"

        if (isSuccessful) {
          this.logger_?.info?.(
            `[CulqiProvider] Recovery confirmed charge ${recoveredCharge.id} already exists in Culqi. Reusing without double charge.`
          )
          await this.idempotencyStore_.complete(idempotencyKey, {
            charge_id: recoveredCharge.id,
            amount: recoveredCharge.amount,
            status: "completed",
            response_payload: recoveredCharge as any,
          })

          return {
            status: isCaptured ? PaymentSessionStatus.CAPTURED : PaymentSessionStatus.AUTHORIZED,
            data: {
              ...data,
              charge_id: recoveredCharge.id,
              amount: recoveredCharge.amount,
              currency_code: recoveredCharge.currency_code,
              captured: isCaptured,
              card_brand: recoveredCharge.source?.brand,
              card_last_four: recoveredCharge.source?.last_four,
              outcome: recoveredCharge.outcome,
              authorized_at: new Date(lock.record.created_at).toISOString(),
            },
          }
        }
      }
    }

    const tokenId = (data.token_id || data.source_id) as string | undefined

    if (!tokenId) {
      throw new MedusaError(
        MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
        "No se proporcionó un token de pago válido de Culqi (source_id requerido)."
      )
    }

    const customerEmail =
      (data.email as string) ||
      context.customer?.email ||
      (context.account_holder?.data?.email as string)

    if (!customerEmail) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "El correo electrónico del cliente es obligatorio para procesar el pago con Culqi."
      )
    }

    const autoCapture = this.options_.autoCapture !== false

    this.logger_?.info?.(
      `[CulqiProvider] Authorizing charge for token [REDACTED] with autoCapture=${autoCapture}`
    )

    try {
      const charge = await this.client_.createCharge({
        amount: amountInCentimos,
        currency_code: currency,
        email: customerEmail,
        source_id: tokenId,
        capture: autoCapture,
        description: `FancyPeru Pedido ${sessionId || ""}`.trim(),
        metadata: {
          session_id: sessionId,
          idempotency_key: String(context.idempotency_key || ""),
        },
        antifraud_details: {
          first_name: context.customer?.first_name || undefined,
          last_name: context.customer?.last_name || undefined,
          phone: sanitizePhone(context.customer?.phone),
          address: context.customer?.billing_address?.address_1 || undefined,
          address_city: context.customer?.billing_address?.city || undefined,
          country_code: "PE",
        },
      })

      await this.idempotencyStore_.complete(idempotencyKey, {
        charge_id: charge.id,
        amount: charge.amount,
        status: "completed",
        response_payload: charge as any,
      })

      const isCaptured = charge.capture === true

      return {
        status: isCaptured ? PaymentSessionStatus.CAPTURED : PaymentSessionStatus.AUTHORIZED,
        data: {
          ...data,
          charge_id: charge.id,
          amount: charge.amount,
          currency_code: charge.currency_code,
          captured: isCaptured,
          card_brand: charge.source?.brand,
          card_last_four: charge.source?.last_four,
          outcome: charge.outcome,
          authorized_at: new Date().toISOString(),
        },
      }
    } catch (err: any) {
      if (err instanceof CulqiTimeoutError) {
        // Timeout during charge creation: DO NOT retry createCharge blindly!
        await this.idempotencyStore_.fail(idempotencyKey, err.message, { uncertain: true })

        // Attempt immediate reverse lookup on Culqi before failing to check if charge succeeded
        try {
          const list = await this.client_.listCharges({
            email: customerEmail,
            amount: amountInCentimos,
            currency_code: currency,
            limit: 5,
          })
          const match = list.data?.find((c: any) => c.metadata?.session_id === sessionId)
          if (match) {
            await this.idempotencyStore_.complete(idempotencyKey, {
              charge_id: match.id,
              amount: match.amount,
              status: "completed",
              response_payload: match as any,
            })
            const isCaptured = match.capture === true
            return {
              status: isCaptured ? PaymentSessionStatus.CAPTURED : PaymentSessionStatus.AUTHORIZED,
              data: {
                ...data,
                charge_id: match.id,
                amount: match.amount,
                currency_code: match.currency_code,
                captured: isCaptured,
                card_brand: match.source?.brand,
                card_last_four: match.source?.last_four,
                outcome: match.outcome,
                authorized_at: new Date().toISOString(),
              },
            }
          }
        } catch {
          // Ignore lookup error and proceed to throw uncertain state
        }

        throw new CulqiUncertainStateError(
          `La solicitud de cobro con Culqi excedió el tiempo de espera. La operación quedó registrada en estado de verificación para evitar cobros duplicados.`,
          "El cobro está en proceso de verificación bancaria. Por favor espere un momento antes de volver a intentar."
        )
      }

      await this.idempotencyStore_.fail(idempotencyKey, err.message, { uncertain: false })
      this.logger_?.error?.(`[CulqiProvider] Authorization error: ${err.message}`)
      const userMessage: string =
        (err instanceof CulqiApiError && err.userMessage)
          ? err.userMessage
          : "No se pudo procesar el cobro con la tarjeta proporcionada. Verifique sus datos o intente con otra tarjeta."

      throw new MedusaError(MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR, userMessage)
    }
  }

  /**
   * Captures an authorized Culqi charge if capture was deferred.
   */
  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const data = input.data || {}
    const chargeId = data.charge_id as string | undefined

    if (!chargeId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No charge_id found in payment session to capture."
      )
    }

    if (data.captured === true) {
      this.logger_?.info?.(`[CulqiProvider] Charge ${chargeId} is already captured.`)
      return { data }
    }

    const key = `capture:${chargeId}`
    const lock = await this.idempotencyStore_.acquireLock(key, {
      operation_type: "capture",
      charge_id: chargeId,
      session_id: data.session_id as string,
    })

    if (lock.isDuplicate) {
      if (lock.record.status === "completed") {
        this.logger_?.info?.(`[CulqiProvider] Idempotent hit: Charge ${chargeId} already captured.`)
        return {
          data: {
            ...data,
            captured: true,
            capture_date: Date.now(),
          },
        }
      }

      if (lock.record.status === "processing") {
        throw new CulqiUncertainStateError(
          "Una captura concurrente está siendo procesada para este cargo. Espere a que finalice la transacción."
        )
      }
    }

    // If remote charge is already captured on Culqi, complete ledger and return idempotently
    try {
      const remote = await this.client_.getCharge(chargeId)
      if (remote.capture === true) {
        this.logger_?.info?.(
          `[CulqiProvider] Remote charge ${chargeId} is already captured on Culqi. Reusing without redundant capture call.`
        )
        await this.idempotencyStore_.complete(key, {
          charge_id: chargeId,
          status: "completed",
          response_payload: remote as any,
        })
        return {
          data: {
            ...data,
            captured: true,
            capture_date: remote.capture_date || Date.now(),
          },
        }
      }
    } catch (checkErr: any) {
      this.logger_?.warn?.(
        `[CulqiProvider] Could not pre-verify remote charge ${chargeId} before capture: ${checkErr.message}`
      )
    }

    try {
      const charge = await this.client_.captureCharge(chargeId)
      await this.idempotencyStore_.complete(key, {
        charge_id: chargeId,
        status: "completed",
        response_payload: charge as any,
      })

      return {
        data: {
          ...data,
          captured: true,
          capture_date: charge.capture_date || Date.now(),
        },
      }
    } catch (err: any) {
      await this.idempotencyStore_.fail(key, err.message)
      this.logger_?.error?.(`[CulqiProvider] Capture error on charge ${chargeId}: ${err.message}`)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Error al capturar el cargo Culqi: ${err.message}`
      )
    }
  }

  /**
   * Refunds a captured Culqi charge.
   *
   * Medusa passes `refund.raw_amount` as `input.amount` — a BigNumberInput in
   * MAJOR units, very often the JSONB BigNumberRawValue object
   * `{ value: "169.96", precision }` (big-number-field.js). toCulqiCentimos
   * normalizes that shape and scales it exactly once to céntimos for the Culqi
   * refund API. The accumulation below stays in céntimos (charge.amount and
   * refund.amount are Culqi céntimos), so it remains consistent with
   * data.amount.
   */
  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const data = input.data || {}
    const chargeId = data.charge_id as string | undefined

    if (!chargeId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No charge_id found in payment session to refund."
      )
    }

    const currency = validateCurrency(
      (data.currency_code as string) || "PEN"
    )
    const refundAmount = toCulqiCentimos(input.amount, currency)

    // Remote check on Culqi before issuing refund (H5)
    let remoteCharge: any = null
    try {
      remoteCharge = await this.client_.getCharge(chargeId)
    } catch (err: any) {
      this.logger_?.error?.(
        `[CulqiProvider] Could not fetch remote charge ${chargeId} before refund: ${err.message}`
      )
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `No se pudo verificar el estado remoto en Culqi antes de emitir el reembolso: ${err.message}`
      )
    }

    const prevRefunded = (data.amount_refunded as number) || (remoteCharge?.amount_refunded as number) || 0
    const targetTotalRefunded = prevRefunded + refundAmount

    if (remoteCharge?.amount && targetTotalRefunded > Number(remoteCharge.amount)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `El monto acumulado a reembolsar (${targetTotalRefunded} céntimos) excede el monto del cargo original (${remoteCharge.amount} céntimos).`
      )
    }

    const key = `refund:${chargeId}:target:${targetTotalRefunded}`
    const lock = await this.idempotencyStore_.acquireLock(key, {
      operation_type: "refund",
      charge_id: chargeId,
      amount: refundAmount,
      currency_code: currency,
    })

    if (lock.isDuplicate) {
      if (lock.record.status === "completed") {
        this.logger_?.info?.(
          `[CulqiProvider] Duplicate refund detected for key ${key}. Returning idempotent result.`
        )
        const recordedRefund = lock.record.response_payload as any
        return {
          data: {
            ...data,
            last_refund_id: recordedRefund?.id || data.last_refund_id,
            amount_refunded: targetTotalRefunded,
            refunded_at: recordedRefund?.metadata?.refunded_at || new Date().toISOString(),
          },
        }
      }

      if (lock.record.status === "processing") {
        throw new CulqiUncertainStateError(
          "Un reembolso concurrente está siendo procesado para este cargo. Espere a que finalice la transacción."
        )
      }
    }

    // Crash resilience: If remote charge already reflects targetTotalRefunded in Culqi, complete ledger and return
    const remoteRefunded = remoteCharge?.amount_refunded ? Number(remoteCharge.amount_refunded) : 0
    if (remoteRefunded >= targetTotalRefunded) {
      this.logger_?.info?.(
        `[CulqiProvider] Remote charge ${chargeId} already shows ${remoteRefunded} céntimos refunded (target: ${targetTotalRefunded}). Reusing without duplicate refund call.`
      )
      await this.idempotencyStore_.complete(key, {
        charge_id: chargeId,
        amount: refundAmount,
        status: "completed",
        response_payload: remoteCharge,
      })
      return {
        data: {
          ...data,
          amount_refunded: targetTotalRefunded,
          refunded_at: new Date().toISOString(),
        },
      }
    }

    this.logger_?.info?.(
      `[CulqiProvider] Refunding ${refundAmount} céntimos for charge ${chargeId} (new target total: ${targetTotalRefunded}).`
    )

    try {
      const refund = await this.client_.createRefund({
        charge_id: chargeId,
        amount: refundAmount,
        reason: "solicitud_comprador",
        metadata: {
          refunded_at: new Date().toISOString(),
        },
      })

      await this.idempotencyStore_.complete(key, {
        charge_id: chargeId,
        amount: refundAmount,
        status: "completed",
        response_payload: refund as any,
      })

      return {
        data: {
          ...data,
          last_refund_id: refund.id,
          amount_refunded: targetTotalRefunded,
          refunded_at: new Date().toISOString(),
        },
      }
    } catch (err: any) {
      await this.idempotencyStore_.fail(key, err.message)
      this.logger_?.error?.(`[CulqiProvider] Refund error on charge ${chargeId}: ${err.message}`)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Error al procesar el reembolso en Culqi: ${err.message}`
      )
    }
  }

  /**
   * Cancels a payment session.
   */
  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const data = input.data || {}
    this.logger_?.info?.(`[CulqiProvider] Canceling payment session ${data.session_id || ""}.`)

    return {
      data: {
        ...data,
        status: PaymentSessionStatus.CANCELED,
        canceled_at: new Date().toISOString(),
      },
    }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: {} }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const data = input.data || {}
    const chargeId = data.charge_id as string | undefined

    if (!chargeId) {
      return { data }
    }

    try {
      const charge = await this.client_.getCharge(chargeId)
      return {
        data: {
          ...data,
          charge,
        },
      }
    } catch (err: any) {
      return { data }
    }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const currency = validateCurrency(input.currency_code)
    // Medusa delivers the session amount in MAJOR units; scale once to céntimos.
    const amountInCentimos = toCulqiCentimos(input.amount, currency)

    return {
      status: PaymentSessionStatus.PENDING,
      data: {
        ...(input.data || {}),
        amount: amountInCentimos,
        currency_code: currency,
        updated_at: new Date().toISOString(),
      },
    }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const data = input.data || {}
    if (data.captured === true) {
      return { status: PaymentSessionStatus.CAPTURED }
    }
    if (data.charge_id) {
      return { status: PaymentSessionStatus.AUTHORIZED }
    }
    if (data.status === PaymentSessionStatus.CANCELED) {
      return { status: PaymentSessionStatus.CANCELED }
    }
    if (data.status === PaymentSessionStatus.ERROR) {
      return { status: PaymentSessionStatus.ERROR }
    }
    return { status: PaymentSessionStatus.PENDING }
  }

  /**
   * Parses webhook payloads and performs server-to-server confirmation.
   */
  async getWebhookActionAndData(
    data: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const rawData = (data?.data || {}) as Record<string, any>
    const eventType = (rawData?.type || rawData?.event || data?.headers?.["x-culqi-event"] || "unknown") as string

    this.logger_?.info?.(`[CulqiProvider] Processing webhook event: ${eventType}`)

    if (!rawData) {
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    // Culqi's live payloads nest the charge inside the event body
    // ({ type, data: { id, amount } }) while tooling sometimes posts a flat
    // body ({ id, type }). Accept both shapes.
    const chargeId = (rawData?.id ||
      rawData?.charge_id ||
      rawData?.data?.id ||
      rawData?.data?.charge_id) as string | undefined
    if (!chargeId) {
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    const eventId = (rawData?.id && rawData.object === "event" ? rawData.id : rawData?.event_id) as string | undefined
    const idempotencyKey = eventId ? `webhook:${eventId}` : `webhook:${chargeId}:${eventType}`
    const eventDate = Number(rawData.creation_date || rawData.data?.creation_date || Date.now())

    try {
      // 1. Mandatory Zero-Trust Server-to-Server Lookup against Culqi API
      const remoteCharge = await this.client_.getCharge(chargeId)

      // 2. Strict Currency Verification (PEN only)
      validateCurrency(remoteCharge.currency_code)

      const sessionId =
        (remoteCharge.metadata?.session_id as string) ||
        (rawData.metadata?.session_id as string) ||
        (rawData.data?.metadata?.session_id as string) ||
        chargeId

      // 3. Cross-evidence: when the incoming event itself states an amount
      // (Culqi céntimos), it must equal the server-to-server truth. A
      // mismatch is treated as a forged/mispriced event and never forwarded.
      const eventCharge = rawData?.data as Record<string, any> | undefined
      const eventAmount =
        typeof eventCharge?.amount === "number" ? eventCharge.amount : undefined
      if (
        eventAmount !== undefined &&
        !assertAmountMatchCents(eventAmount, remoteCharge.amount)
      ) {
        this.logger_?.warn?.(
          `[CulqiProvider] Webhook amount mismatch for charge ${chargeId}: event=${eventAmount} vs culqi=${remoteCharge.amount}. Ignoring event.`
        )
        return { action: PaymentActions.NOT_SUPPORTED }
      }

      // 4. Out-of-order event gating: if charge was already captured/completed,
      // never downgrade status with a delayed charge.creation or charge.failed event.
      const existingOp = await this.idempotencyStore_.getByChargeId(chargeId)
      if (existingOp && existingOp.status === "completed") {
        if (eventType === "charge.creation.succeeded" || eventType === "charge.failed") {
          this.logger_?.info?.(
            `[CulqiProvider] Out-of-order event '${eventType}' ignored for already captured charge ${chargeId}`
          )
          return { action: PaymentActions.NOT_SUPPORTED }
        }
      }

      // Record in persistent idempotency ledger
      await this.idempotencyStore_.complete(idempotencyKey, {
        charge_id: chargeId,
        amount: remoteCharge.amount,
        status: remoteCharge.capture ? "completed" : "processing",
        event_type: eventType,
        event_date: eventDate,
        response_payload: remoteCharge as any,
      })

      // Amount direction (verified in @medusajs/payment 2.21.2 sources):
      // Culqi reports céntimos; Medusa stores major units. process-payment.js
      // feeds this amount into capturePaymentWorkflow, so returning the raw
      // céntimos value would attempt to capture 100x the authorized amount.
      // fromCulqiCentimos translates it back to major units and the core
      // captures exactly the authorized amount; any capture/refund mismatch
      // is still guarded server-side by the payment module.
      if (eventType === "charge.succeeded" || remoteCharge.capture === true) {
        return {
          action: PaymentActions.SUCCESSFUL,
          data: {
            session_id: sessionId,
            amount: fromCulqiCentimos(remoteCharge.amount),
          },
        }
      }

      if (eventType === "charge.creation.succeeded" && !remoteCharge.capture) {
        return {
          action: PaymentActions.AUTHORIZED,
          data: {
            session_id: sessionId,
            amount: fromCulqiCentimos(remoteCharge.amount),
          },
        }
      }

      if (eventType === "charge.failed") {
        return {
          action: PaymentActions.FAILED,
          data: {
            session_id: sessionId,
            amount: fromCulqiCentimos(remoteCharge.amount),
          },
        }
      }
    } catch (err: any) {
      this.logger_?.error?.(
        `[CulqiProvider] Failed server-to-server webhook verification for charge ${chargeId}: ${err.message}`
      )
    }

    return { action: PaymentActions.NOT_SUPPORTED }
  }
}

export default CulqiPaymentProviderService
