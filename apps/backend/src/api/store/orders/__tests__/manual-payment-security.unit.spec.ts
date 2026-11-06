import { getServerSecret, signManualPaymentStatus } from "../../../../lib/cod-authorization"
import { resolveFulfillmentAuthorization } from "../../../../lib/fulfillment-authorization"
import { generateOrderToken, verifyOrderToken } from "../../../../lib/order-token"

describe("Manual Payment Security & Anti-IDOR Suite", () => {
  const secretEnv = "test_super_secure_order_token_secret_32_chars_long!!"

  beforeAll(() => {
    process.env.ORDER_TOKEN_SECRET = secretEnv
  })

  describe("Proof of Possession (PoP) Token Verification", () => {
    const orderId = "order_01TESTORDIDOR1234567890"
    const email = "cliente@ejemplo.pe"
    const createdAt = "2026-10-16T12:00:00.000Z"

    it("generates a 64-character hex HMAC-SHA256 token", () => {
      const token = generateOrderToken(orderId, email, createdAt)
      expect(typeof token).toBe("string")
      expect(token).toHaveLength(64)
      expect(/^[0-9a-f]{64}$/.test(token)).toBe(true)
    })

    it("validates legitimate token successfully", () => {
      const token = generateOrderToken(orderId, email, createdAt)
      const isValid = verifyOrderToken(orderId, email, createdAt, token)
      expect(isValid).toBe(true)
    })

    it("is case-insensitive for email normalization", () => {
      const token = generateOrderToken(orderId, "CLIENTE@EJEMPLO.PE", createdAt)
      const isValid = verifyOrderToken(orderId, "cliente@ejemplo.pe", createdAt, token)
      expect(isValid).toBe(true)
    })

    it("rejects when token is null or undefined", () => {
      expect(verifyOrderToken(orderId, email, createdAt, null)).toBe(false)
      expect(verifyOrderToken(orderId, email, createdAt, undefined)).toBe(false)
    })

    it("rejects token with invalid length or non-hex characters", () => {
      expect(verifyOrderToken(orderId, email, createdAt, "short_token")).toBe(false)
      expect(verifyOrderToken(orderId, email, createdAt, "g".repeat(64))).toBe(false)
    })

    it("strictly rejects when attacker attempts to tamper with token", () => {
      const validToken = generateOrderToken(orderId, email, createdAt)
      // Flip the last character
      const lastChar = validToken[63]
      const replacement = lastChar === "a" ? "b" : "a"
      const tamperedToken = validToken.substring(0, 63) + replacement

      expect(verifyOrderToken(orderId, email, createdAt, tamperedToken)).toBe(false)
    })

    it("strictly rejects when attacker uses a token generated for a different order (IDOR attack)", () => {
      const victimOrderId = "order_VICTIM_99999999999999"
      const attackerOrderId = "order_ATTACKER_111111111111"
      const attackerToken = generateOrderToken(attackerOrderId, "attacker@bad.com", createdAt)

      // Attacker attempts to use their valid token on victim's order
      const isValidOnVictimOrder = verifyOrderToken(victimOrderId, "victim@pe.com", createdAt, attackerToken)
      expect(isValidOnVictimOrder).toBe(false)
    })

    it("strictly rejects when attacker knows email but has no token (Email-Only submission prevention)", () => {
      // In the past, only email was verified. Now, token is mandatory.
      const noToken: string | undefined = undefined
      expect(verifyOrderToken(orderId, email, createdAt, noToken)).toBe(false)
    })
  })

  describe("Customer Order Isolation (IDOR Logic Rules)", () => {
    interface MockOrder {
      id: string
      customer_id?: string | null
      email?: string | null
      created_at: string
    }

    const orderA: MockOrder = {
      id: "order_AAA_1234567890",
      customer_id: "cus_USER_A",
      email: "user_a@example.com",
      created_at: "2026-10-16T10:00:00.000Z",
    }

    const orderGuest: MockOrder = {
      id: "order_GUEST_9876543210",
      customer_id: null,
      email: "guest@example.com",
      created_at: "2026-10-16T11:00:00.000Z",
    }

    function checkAccess(
      order: MockOrder,
      authActorId?: string,
      providedToken?: string
    ): { allowed: boolean; status: number } {
      if (authActorId) {
        if (order.customer_id && order.customer_id !== authActorId) {
          // IDOR protection: Return 404 rather than 403 to prevent enumeration
          return { allowed: false, status: 404 }
        }
        return { allowed: true, status: 200 }
      }

      // Guest access
      const isValid = verifyOrderToken(order.id, order.email || "", order.created_at, providedToken)
      if (!isValid) {
        return { allowed: false, status: 404 }
      }
      return { allowed: true, status: 200 }
    }

    it("allows Customer A to access their own order", () => {
      const result = checkAccess(orderA, "cus_USER_A")
      expect(result.allowed).toBe(true)
      expect(result.status).toBe(200)
    })

    it("prevents Customer B from accessing Customer A's order (IDOR)", () => {
      const result = checkAccess(orderA, "cus_USER_B")
      expect(result.allowed).toBe(false)
      expect(result.status).toBe(404)
    })

    it("prevents unauthenticated user from accessing guest order without token", () => {
      const result = checkAccess(orderGuest, undefined, undefined)
      expect(result.allowed).toBe(false)
      expect(result.status).toBe(404)
    })

    it("prevents unauthenticated user from accessing guest order with wrong token", () => {
      const result = checkAccess(orderGuest, undefined, "wrong_token_".repeat(5).substring(0, 64))
      expect(result.allowed).toBe(false)
      expect(result.status).toBe(404)
    })

    it("allows guest with legitimate token to access their order", () => {
      const validToken = generateOrderToken(orderGuest.id, orderGuest.email!, orderGuest.created_at)
      const result = checkAccess(orderGuest, undefined, validToken)
      expect(result.allowed).toBe(true)
      expect(result.status).toBe(200)
    })
  })

  describe("Fulfillment Payment Guard (exercises the real gate)", () => {
    /**
     * This block used to re-implement the fulfillment rules inside the test
     * (a fake `canFulfillOrder`), which silently drifted away from production
     * behavior: it even asserted that a buyer-written `is_cash_on_delivery`
     * flag opens the gate. That is exactly the P0-B injection attack, so the
     * tests now exercise `resolveFulfillmentAuthorization` directly.
     *
     * `ORDER_TOKEN_SECRET` is set in the suite's `beforeAll`, so
     * `getServerSecret()` resolves to the same secret the production gate
     * would read from the environment.
     */
    const guardedOrderId = "order_guard_suite_001"

    it("blocks fulfillment if manual payment is pending verification and not cash on delivery", () => {
      const result = resolveFulfillmentAuthorization({
        orderId: guardedOrderId,
        serverSecret: getServerSecret(),
        paymentCollectionStatus: "awaiting",
        orderMetadata: { manual_payment_status: "pending_verification" },
      })
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe("blocked")
    })

    it("blocks fulfillment if manual payment was rejected", () => {
      const result = resolveFulfillmentAuthorization({
        orderId: guardedOrderId,
        serverSecret: getServerSecret(),
        paymentCollectionStatus: "not_paid",
        orderMetadata: { manual_payment_status: "rejected" },
      })
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe("blocked")
    })

    it("allows fulfillment if manual payment was verified, captured and signed by the server", () => {
      const result = resolveFulfillmentAuthorization({
        orderId: guardedOrderId,
        serverSecret: getServerSecret(),
        paymentCollectionStatus: "authorized",
        orderMetadata: {
          manual_payment_status: "verified_and_captured",
          manual_payment_order_id: guardedOrderId,
          manual_payment_signature: signManualPaymentStatus(guardedOrderId, getServerSecret()),
        },
      })
      expect(result.allowed).toBe(true)
      expect(result.reason).toBe("manual_verified")
    })

    it("blocks a buyer-injected verified_and_captured status that is not server-signed", () => {
      const result = resolveFulfillmentAuthorization({
        orderId: guardedOrderId,
        serverSecret: getServerSecret(),
        paymentCollectionStatus: "not_paid",
        orderMetadata: { manual_payment_status: "verified_and_captured" },
      })
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe("blocked")
    })

    it("does NOT allow fulfillment just because the buyer wrote is_cash_on_delivery", () => {
      const result = resolveFulfillmentAuthorization({
        orderId: guardedOrderId,
        serverSecret: getServerSecret(),
        paymentCollectionStatus: "awaiting",
        orderMetadata: {
          is_cash_on_delivery: true,
          manual_payment_status: "pending_verification",
        },
      })
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe("blocked")
    })
  })
})
