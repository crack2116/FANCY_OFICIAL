import crypto from "crypto"
import { getServerSecret } from "./cod-authorization"

/**
 * Server secret resolution (ORDER_TOKEN_SECRET -> COOKIE_SECRET -> JWT_SECRET)
 * lives in ./cod-authorization (getServerSecret) and is shared with the COD /
 * manual-payment HMAC signatures so both families verify against the same
 * server secret and cannot drift apart.
 */

/**
 * Generates a cryptographically secure, tamper-proof Proof of Possession (PoP) token
 * for an order. Guests must provide this token to view or update payment reference.
 *
 * @param orderId The Medusa order ID
 * @param email The order customer email
 * @param createdAt The ISO creation timestamp or Date of the order
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
    .createHmac("sha256", getServerSecret())
    .update(payload)
    .digest("hex")
}

/**
 * Validates a candidate possession token using constant-time comparison to prevent timing attacks.
 */
export function verifyOrderToken(
  orderId: string,
  email: string,
  createdAt: string | Date | undefined,
  candidateToken: string | undefined | null
): boolean {
  if (!candidateToken || typeof candidateToken !== "string") {
    return false
  }

  // Token must be a 64-character hex string (SHA-256)
  if (candidateToken.length !== 64 || !/^[0-9a-f]{64}$/i.test(candidateToken)) {
    return false
  }

  const expectedToken = generateOrderToken(orderId, email, createdAt)
  const candidateBuf = Buffer.from(candidateToken.toLowerCase(), "hex")
  const expectedBuf = Buffer.from(expectedToken.toLowerCase(), "hex")

  if (candidateBuf.length !== expectedBuf.length) {
    return false
  }

  return crypto.timingSafeEqual(candidateBuf, expectedBuf)
}
