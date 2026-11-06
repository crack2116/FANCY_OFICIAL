import crypto from "crypto"
import { MedusaError } from "@medusajs/framework/utils"

/**
 * Cryptographic basis for cash-on-delivery and manual-payment authorizations
 * (P0-B definitive closure, per FANCYPERU_AUDITORIA_POST_CORRECCION.md 3.3).
 *
 * Medusa 2.21.2 copies cart metadata verbatim to order metadata
 * (@medusajs/core-flows/dist/cart/workflows/complete-cart.js:454), and the
 * store cart validators accept free-form metadata from any shopper. Structural
 * checks alone can therefore be satisfied by a buyer. Every authorization
 * consumed by the fulfillment gate MUST carry an HMAC-SHA256 signature
 * computed with a server-only secret and bound to the concrete order id:
 *
 *   signature = HMAC-SHA256(secret, "order_id|authorized_by|authorized_at|status")
 *
 * Because only this module and the admin routes can produce signatures (they
 * resolve the secret server-side), a buyer who pre-writes the same object
 * shape into cart metadata can never forge a valid one.
 */

/**
 * Metadata keys reserved for server-managed security state. They are stripped
 * from every store cart create/update body (see src/api/middlewares.ts) so
 * buyer-written values can never reach order metadata through ingestion.
 */
export const RESERVED_METADATA_KEYS = [
  "fancyperu_cod",
  "manual_payment_status",
  "manual_payment_audit_trail",
] as const

/**
 * Insecure placeholder used ONLY when no secret is configured AND the node
 * process is not running in production. Never expose its value beyond this
 * module (logs print option names, not values). Shared with order-token.ts so
 * both HMAC families resolve the same secret.
 */
const DEV_ONLY_FALLBACK_SERVER_SECRET = "fallback_secure_fancyperu_order_token_salt_2026"

/**
 * Derives the server secret used for HMAC signing and verifying order tokens,
 * COD authorizations and manual-payment verifications.
 * Resolution order: ORDER_TOKEN_SECRET, then COOKIE_SECRET, then JWT_SECRET.
 *
 * In production a missing secret is a startup failure (throw): silently
 * falling back to a public constant would let anyone forge authorization
 * signatures. In development a warning is emitted and the dev-only fallback is
 * used. Extracted from order-token.ts so token and authorization signatures
 * cannot drift apart.
 */
export function getServerSecret(): string {
  const secret =
    process.env.ORDER_TOKEN_SECRET ||
    process.env.COOKIE_SECRET ||
    process.env.JWT_SECRET

  if (secret) {
    return secret
  }

  if (process.env.NODE_ENV === "production") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "ORDER_TOKEN_SECRET must be set in production (COOKIE_SECRET/JWT_SECRET fallback is not configured either)."
    )
  }

  console.warn(
    "[order-token] ORDER_TOKEN_SECRET/COOKIE_SECRET/JWT_SECRET are not set; using the dev-only fallback secret. Configure ORDER_TOKEN_SECRET for anything beyond local development."
  )
  return DEV_ONLY_FALLBACK_SERVER_SECRET
}

export type CodAuthorizationPayload = {
  /** The order the authorization binds to (order id, not sortable values). */
  order_id: string
  /** Admin email or id that authorized the cash-on-delivery. */
  authorized_by: string
  /** ISO timestamp of the authorization. */
  authorized_at: string
  /** Authorization status (the routes always sign "authorized"). */
  status: string
}

export type CodAuthorizationReason =
  | "valid"
  | "missing"
  | "malformed"
  | "order_mismatch"
  | "bad_status"
  | "bad_signature"

export type VerificationResult = {
  valid: boolean
  reason: CodAuthorizationReason
}

function invalidVerification(reason: CodAuthorizationReason): VerificationResult {
  return { valid: false, reason }
}

/**
 * Deterministic canonical string for a COD authorization payload. Fields are
 * trimmed and joined with "|" so any tampering with a field (or with the field
 * ORDER) changes the HMAC input.
 */
function canonicalCodPayloadString(payload: CodAuthorizationPayload): string {
  return [
    payload.order_id.trim(),
    payload.authorized_by.trim(),
    payload.authorized_at.trim(),
    payload.status.trim(),
  ].join("|")
}

function hmacSha256Hex(input: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(input).digest("hex")
}

/**
 * Signs a COD authorization for storage in order.metadata.fancyperu_cod.
 * Throws when a payload field or the secret is empty: signing an incomplete
 * payload would produce an authorization the gate can never verify.
 */
export function signCodAuthorization(
  payload: CodAuthorizationPayload,
  secret: string
): string {
  for (const field of [payload.order_id, payload.authorized_by, payload.authorized_at, payload.status] as const) {
    if (typeof field !== "string" || field.trim() === "") {
      throw new MedusaError(
        MedusaError.Types.INVALID_ARGUMENT,
        "signCodAuthorization requires non-empty order_id, authorized_by, authorized_at and status strings"
      )
    }
  }
  if (typeof secret !== "string" || secret.trim() === "") {
    throw new MedusaError(
      MedusaError.Types.INVALID_ARGUMENT,
      "signCodAuthorization requires a non-empty server secret"
    )
  }
  return hmacSha256Hex(canonicalCodPayloadString(payload), secret)
}

/**
 * Verifies an order's fancyperu_cod marker against the concrete order id and
 * the server secret. Checks are ordered so that no secret-dependent comparison
 * runs before the structural requirements hold; the returned reason is
 * server-side information only (the gate collapses every reason into
 * allowed/blocked), so it never leaks which field failed to the requester.
 */
export function verifyCodAuthorization(
  orderMetadata: Record<string, unknown> | undefined,
  orderId: string,
  secret: string
): VerificationResult {
  if (typeof secret !== "string" || secret.trim() === "") {
    return invalidVerification("missing")
  }

  const cod = orderMetadata?.fancyperu_cod
  if (!cod || typeof cod !== "object" || Array.isArray(cod)) {
    return invalidVerification("missing")
  }

  const marker = cod as Record<string, unknown>
  const expectedOrderId = (orderId ?? "").trim()
  const authorizedBy = marker.authorized_by
  const authorizedAt = marker.authorized_at
  const status = marker.status
  const markerOrderId = marker.order_id
  const signature = marker.authorized_signature

  if (
    typeof authorizedBy !== "string" ||
    authorizedBy.trim() === "" ||
    typeof authorizedAt !== "string" ||
    authorizedAt.trim() === "" ||
    typeof status !== "string" ||
    status.trim() === "" ||
    typeof markerOrderId !== "string" ||
    markerOrderId.trim() === "" ||
    typeof signature !== "string" ||
    signature.trim() === ""
  ) {
    return invalidVerification("malformed")
  }

  if (markerOrderId.trim() !== expectedOrderId) {
    return invalidVerification("order_mismatch")
  }

  if (status.trim() !== "authorized") {
    return invalidVerification("bad_status")
  }

  const expected = signCodAuthorization(
    {
      order_id: markerOrderId,
      authorized_by: authorizedBy,
      authorized_at: authorizedAt,
      status,
    },
    secret
  )
  const expectedBuffer = Buffer.from(expected, "hex")
  const candidateBuffer = Buffer.from(signature, "hex")

  if (candidateBuffer.length !== expectedBuffer.length) {
    return invalidVerification("bad_signature")
  }

  return crypto.timingSafeEqual(candidateBuffer, expectedBuffer)
    ? { valid: true, reason: "valid" }
    : invalidVerification("bad_signature")
}

const MANUAL_PAYMENT_BOUND_STATUS = "verified_and_captured"

/**
 * Canonical string for a manual-payment verification: binds the concrete
 * order id, the verified status, and any extra binding fields ("k=v" pairs
 * sorted by key so the same content always yields the same signature).
 */
function canonicalManualPaymentString(
  orderId: string,
  extra?: Record<string, string>
): string {
  const parts = [orderId.trim(), MANUAL_PAYMENT_BOUND_STATUS]
  if (extra) {
    const extraParts = Object.keys(extra)
      .sort()
      .filter((key) => typeof extra[key] === "string" && extra[key].trim() !== "")
      .map((key) => `${key}=${extra[key].trim()}`)
    parts.push(...extraParts)
  }
  return parts.join("|")
}

/**
 * Signs a manual-payment verification for storage alongside
 * order.metadata.manual_payment_status. The signature binds order id AND the
 * verified status, so a buyer-copied signature from another order (or a
 * different status value) never verifies.
 */
export function signManualPaymentStatus(
  orderId: string,
  secret: string,
  extra?: Record<string, string>
): string {
  if (typeof orderId !== "string" || orderId.trim() === "") {
    throw new MedusaError(
      MedusaError.Types.INVALID_ARGUMENT,
      "signManualPaymentStatus requires a non-empty orderId"
    )
  }
  if (typeof secret !== "string" || secret.trim() === "") {
    throw new MedusaError(
      MedusaError.Types.INVALID_ARGUMENT,
      "signManualPaymentStatus requires a non-empty server secret"
    )
  }
  return hmacSha256Hex(canonicalManualPaymentString(orderId, extra), secret)
}

/**
 * Verifies an order's manual-payment verification. Requires the exact
 * verified_and_captured status, the manual_payment_order_id binding, and a
 * signature produced with the server secret for THAT order and status.
 */
export function verifyManualPaymentStatus(
  orderMetadata: Record<string, unknown> | undefined,
  orderId: string,
  secret: string
): VerificationResult {
  if (typeof secret !== "string" || secret.trim() === "") {
    return invalidVerification("missing")
  }

  const expectedOrderId = (orderId ?? "").trim()
  const status = orderMetadata?.manual_payment_status
  if (typeof status !== "string" || status.trim() === "") {
    return invalidVerification("missing")
  }
  if (status.trim() !== MANUAL_PAYMENT_BOUND_STATUS) {
    return invalidVerification("bad_status")
  }

  const boundOrderId = orderMetadata?.manual_payment_order_id
  if (typeof boundOrderId !== "string" || boundOrderId.trim() === "") {
    return invalidVerification("malformed")
  }
  if (boundOrderId.trim() !== expectedOrderId) {
    return invalidVerification("order_mismatch")
  }

  const signature = orderMetadata?.manual_payment_signature
  if (typeof signature !== "string" || signature.trim() === "") {
    return invalidVerification("malformed")
  }

  const expected = signManualPaymentStatus(expectedOrderId, secret)
  const expectedBuffer = Buffer.from(expected, "hex")
  const candidateBuffer = Buffer.from(signature, "hex")

  if (candidateBuffer.length !== expectedBuffer.length) {
    return invalidVerification("bad_signature")
  }

  return crypto.timingSafeEqual(candidateBuffer, expectedBuffer)
    ? { valid: true, reason: "valid" }
    : invalidVerification("bad_signature")
}

/**
 * Removes the server-reserved metadata keys from a store cart payload. A body
 * that is not an object (undefined, null, scalar, array) collapses to {}; a
 * valid object is cloned and the reserved keys are deleted (case-exact) so the
 * rest of the caller's metadata is preserved untouched.
 */
export function sanitizeCartMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {}
  }
  const clone = { ...(metadata as Record<string, unknown>) }
  for (const key of RESERVED_METADATA_KEYS) {
    delete clone[key]
  }
  return clone
}
