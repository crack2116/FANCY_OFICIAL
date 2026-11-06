import { MedusaError } from "@medusajs/framework/utils"

export class CulqiApiError extends MedusaError {
  public statusCode?: number
  public culqiCode?: string
  public userMessage?: string

  constructor(message: string, statusCode?: number, culqiCode?: string, userMessage?: string) {
    super(
      statusCode === 401
        ? MedusaError.Types.UNAUTHORIZED
        : statusCode === 400 || statusCode === 422
          ? MedusaError.Types.INVALID_DATA
          : MedusaError.Types.UNEXPECTED_STATE,
      message
    )
    this.statusCode = statusCode
    this.culqiCode = culqiCode
    this.userMessage = userMessage || message
  }
}

export class CulqiConfigError extends MedusaError {
  constructor(message: string) {
    super(MedusaError.Types.INVALID_DATA, `[Culqi Config Error] ${message}`)
  }
}

export class CulqiTimeoutError extends CulqiApiError {
  public isTimeout = true
  public uncertainState = true
  public requestDetails?: {
    endpoint: string
    method: string
    sessionId?: string
    amount?: number
  }

  constructor(
    message: string,
    requestDetails?: { endpoint: string; method: string; sessionId?: string; amount?: number }
  ) {
    super(message, 504, "GATEWAY_TIMEOUT", "Tiempo de espera agotado al comunicarse con la pasarela de pagos.")
    this.requestDetails = requestDetails
  }
}

export class CulqiUncertainStateError extends CulqiApiError {
  public uncertainState = true

  constructor(message: string, userMessage?: string) {
    super(
      message,
      504,
      "UNCERTAIN_PAYMENT_STATE",
      userMessage || "El estado del pago no pudo confirmarse con certeza. No se ha realizado un nuevo cobro. La operación queda en revisión."
    )
  }
}
