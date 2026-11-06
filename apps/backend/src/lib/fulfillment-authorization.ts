import { PaymentCollectionStatus } from "@medusajs/framework/utils"
import {
  verifyCodAuthorization,
  verifyManualPaymentStatus,
} from "./cod-authorization"

/**
 * Server-authoritative fulfillment gate rules (P0-B definitive closure).
 *
 * Orders may only be dispatched when:
 * - their payment collection is completed or partially captured, or
 * - a manual payment was verified, captured AND signed server-side
 *   (`metadata.manual_payment_status === "verified_and_captured"` plus
 *   `manual_payment_order_id` and a valid `manual_payment_signature` HMAC),
 *   or
 * - cash-on-delivery was explicitly authorized server-side by an admin
 *   (`metadata.fancyperu_cod` carrying `authorized_signature`, a HMAC bound to
 *   the order id, written by the POST /admin/orders/:id/authorize-cod route).
 *
 * Medusa 2.21.2 copies cart metadata verbatim to order metadata
 * (@medusajs/core-flows/dist/cart/workflows/complete-cart.js:454) and store
 * cart validators accept free-form metadata from any shopper, so a buyer can
 * pre-write any of these objects' SHAPES into cart metadata. Shape alone is
 * therefore never trusted here: every metadata-based reason requires the
 * HMAC verification with the server secret and the concrete order id.
 * Buyer-controlled legacy keys (`is_cash_on_delivery`,
 * `payment_method === "contraentrega"`, ...) are deliberately ignored, and the
 * reserved keys are additionally stripped at ingestion
 * (src/api/middlewares.ts).
 *
 * Canceled orders are blocked ALWAYS (independently of their payment state).
 *
 * When `orderId`/`serverSecret` are not supplied the metadata paths fail
 * CLOSED (no authorization can be granted from metadata), while captured
 * money keeps working exactly as before.
 */

export type FulfillmentAuthorizationReason =
  | "captured"
  | "manual_verified"
  | "cod_authorized"
  | "blocked"

export type FulfillmentAuthorizationInput = {
  /** Payment collection status of the order (e.g. completed, pending). */
  paymentCollectionStatus?: string
  /**
   * Extra payment-collection statuses that count as captured money beyond the
   * core defaults (completed / partially_captured). Optional extension point;
   * defaults to none.
   */
  pendingPaymentCollectionStatusList?: string[]
  /** The order metadata as stored by Medusa. */
  orderMetadata?: Record<string, unknown>
  /**
   * The order id being evaluated. Required (with `serverSecret`) for the
   * metadata-based authorizations: HMAC signatures are bound to it.
   */
  orderId?: string
  /**
   * Server secret backing the HMAC signatures (see getServerSecret in
   * ./cod-authorization). When absent, metadata-based reasons fail closed.
   */
  serverSecret?: string
  /**
   * The order lifecycle status. A canceled order is blocked unconditionally,
   * even when its payment collection is already captured.
   */
  orderStatus?: string
}

export type FulfillmentAuthorizationResult = {
  allowed: boolean
  reason: FulfillmentAuthorizationReason
}

/**
 * True when both parts of the HMAC verification context are available. Without
 * them the gate cannot trust ANY metadata value, so only captured money can
 * authorize (fail-closed).
 */
function canVerifyHmac(input: FulfillmentAuthorizationInput): boolean {
  return (
    typeof input.serverSecret === "string" &&
    input.serverSecret.trim() !== "" &&
    typeof input.orderId === "string" &&
    input.orderId.trim() !== ""
  )
}

export function resolveFulfillmentAuthorization(
  input: FulfillmentAuthorizationInput
): FulfillmentAuthorizationResult {
  if (typeof input.orderStatus === "string" && input.orderStatus.trim().toLowerCase() === "canceled") {
    return { allowed: false, reason: "blocked" }
  }

  const status = input.paymentCollectionStatus
  const extraStatuses = input.pendingPaymentCollectionStatusList || []

  if (
    status === PaymentCollectionStatus.COMPLETED ||
    status === PaymentCollectionStatus.PARTIALLY_CAPTURED ||
    extraStatuses.includes(status as string)
  ) {
    return { allowed: true, reason: "captured" }
  }

  const metadata = input.orderMetadata || {}

  // Valid COD signed by an admin supersedes any metadata remnant (including a
  // forged manual_payment_status): compute once so the manual-payment branch
  // can fall through to it when its own HMAC does not verify.
  const codVerified =
    canVerifyHmac(input) &&
    verifyCodAuthorization(metadata, input.orderId!, input.serverSecret!).valid

  if (metadata.manual_payment_status === "verified_and_captured") {
    if (canVerifyHmac(input) && verifyManualPaymentStatus(metadata, input.orderId!, input.serverSecret!).valid) {
      return { allowed: true, reason: "manual_verified" }
    }
    // Verified-by-shape alone proves nothing: the buyer could have written it.
    // Fall through to the COD check instead of blocking immediately so a valid
    // server-signed admin override can still authorize the dispatch; a forged
    // manual_payment_status with no valid HMAC never grants access here.
  }

  if (codVerified) {
    return { allowed: true, reason: "cod_authorized" }
  }

  return { allowed: false, reason: "blocked" }
}
