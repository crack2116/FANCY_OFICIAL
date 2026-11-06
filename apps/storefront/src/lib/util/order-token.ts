import crypto from "crypto"

/**
 * Insecure placeholder used ONLY when no secret is configured AND the node
 * process is not running in production. Keep the value in sync with the
 * backend twin (apps/backend/src/lib/order-token.ts) so both sides derive the
 * same token, and never print its value in logs.
 */
const DEV_ONLY_FALLBACK_ORDER_TOKEN_SECRET = "fallback_secure_fancyperu_order_token_salt_2026"

function getOrderTokenSecret(): string {
  const secret =
    process.env.ORDER_TOKEN_SECRET ||
    process.env.COOKIE_SECRET ||
    process.env.JWT_SECRET

  if (secret) {
    return secret
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "ORDER_TOKEN_SECRET must be set in production (COOKIE_SECRET/JWT_SECRET fallback is not configured either)."
    )
  }

  console.warn(
    "[order-token] ORDER_TOKEN_SECRET/COOKIE_SECRET/JWT_SECRET are not set; using the dev-only fallback secret. Configure ORDER_TOKEN_SECRET for anything beyond local development."
  )
  return DEV_ONLY_FALLBACK_ORDER_TOKEN_SECRET
}

/**
 * Computes the Proof of Possession (PoP) token for a confirmed order on the storefront server.
 */
export function generateOrderToken(
  orderId: string,
  email: string,
  createdAt?: string | Date
): string {
  const normalizedEmail = (email || "").trim().toLowerCase()
  const timestamp =
    createdAt instanceof Date
      ? createdAt.toISOString()
      : (createdAt || "").trim()
  const payload = `order_possession:${orderId}:${normalizedEmail}:${timestamp}`

  return crypto
    .createHmac("sha256", getOrderTokenSecret())
    .update(payload)
    .digest("hex")
}
