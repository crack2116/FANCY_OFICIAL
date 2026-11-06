export interface CulqiOptions {
  /**
   * Culqi Secret Key (starts with sk_test_ or sk_live_).
   * Kept strictly on the backend.
   */
  secretKey?: string

  /**
   * Culqi Public Key (starts with pk_test_ or pk_live_).
   */
  publicKey?: string

  /**
   * Secret used to verify webhook origin if configured.
   */
  webhookSecret?: string

  /**
   * Whether to capture card charges immediately upon authorization.
   * Default: true (recommended for e-commerce pet store goods).
   */
  autoCapture?: boolean

  /**
   * Culqi API Base URL (defaults to https://api.culqi.com/v2).
   */
  baseUrl?: string
}

export interface CulqiAntifraudDetails {
  first_name?: string
  last_name?: string
  email?: string
  address?: string
  address_city?: string
  country_code?: string
  phone?: string
  device_finger_print_id?: string
}

export interface CulqiChargeRequest {
  amount: number
  currency_code: string
  email: string
  source_id: string
  capture?: boolean
  description?: string
  metadata?: Record<string, string | number | boolean>
  antifraud_details?: CulqiAntifraudDetails
}

export interface CulqiChargeResponse {
  id: string
  object: "charge"
  amount: number
  amount_refunded: number
  currency_code: string
  current_phase?: string
  email: string
  source: {
    id: string
    object: string
    card_number?: string
    last_four?: string
    brand?: string
    client?: {
      email?: string
    }
  }
  capture: boolean
  capture_date?: number | null
  creation_date: number
  description?: string
  duplicated?: boolean
  outcome?: {
    type: string
    code?: string
    merchant_message?: string
    user_message?: string
  }
  metadata?: Record<string, unknown>
  state?: "authorized" | "captured" | "failed" | "refunded"
}

export interface CulqiRefundRequest {
  charge_id: string
  amount: number
  reason: "duplicado" | "fraude" | "solicitud_comprador"
  metadata?: Record<string, string | number | boolean>
}

export interface CulqiRefundResponse {
  id: string
  object: "refund"
  amount: number
  charge_id: string
  creation_date: number
  metadata?: Record<string, unknown>
}

export interface CulqiWebhookPayload {
  object: "event"
  type: string
  id?: string
  creation_date?: number
  data: Record<string, unknown>
}
