import { signCodAuthorization, signManualPaymentStatus } from "../cod-authorization"
import { resolveFulfillmentAuthorization } from "../fulfillment-authorization"

/**
 * Fulfillment gate regression tests (P0-B definitive closure).
 *
 * The buyer can write ARBITRARY keys into order.metadata through the store
 * cart (POST /store/carts accepts free-form metadata and the core
 * complete-cart workflow copies it verbatim to the order). These tests prove
 * that buyer-written COD flags and unsigned admin-shaped fields NEVER open the
 * gate: only captured money, a server-signed manual payment verification, or a
 * server-signed COD authorization do.
 *
 * Owner matrix (P0-B closure): forged fancyperu_cod with and without a
 * signature, legacy seller flags, pending/awaiting/captured collections,
 * manual payments with and without a valid signature, cross-order signatures,
 * and canceled orders.
 */
describe("resolveFulfillmentAuthorization", () => {
  const SECRET = "unit-test-server-secret-for-p0b-closure"
  const ORDER_ID = "order_p0b_matrix"

  function signedCodMetadata(overrides: Record<string, unknown> = {}, orderId = ORDER_ID): Record<string, unknown> {
    const payload = {
      order_id: orderId,
      authorized_by: "admin@fancyperu.pe",
      authorized_at: "2026-10-17T00:00:00.000Z",
      status: "authorized",
    }
    return {
      fancyperu_cod: {
        ...payload,
        authorized_signature: signCodAuthorization(payload, SECRET),
        ...overrides,
      },
    }
  }

  function signedManualMetadata(overrides: Record<string, unknown> = {}, orderId = ORDER_ID): Record<string, unknown> {
    return {
      manual_payment_status: "verified_and_captured",
      manual_payment_order_id: orderId,
      manual_payment_signature: signManualPaymentStatus(orderId, SECRET),
      ...overrides,
    }
  }

  describe("buyer metadata can never self-authorize (P0-B regression)", () => {
    it("blocks buyer-injected fancyperu_cod without a signature", () => {
      const result = resolveFulfillmentAuthorization({
        orderId: ORDER_ID,
        serverSecret: SECRET,
        orderMetadata: {
          fancyperu_cod: {
            authorized_by: "auto_injected",
            authorized_at: "2026-10-17T00:00:00.000Z",
          },
        },
      })

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe("blocked")
    })

    it("blocks buyer-injected fancyperu_cod with an invented authorized_signature", () => {
      const result = resolveFulfillmentAuthorization({
        orderId: ORDER_ID,
        serverSecret: SECRET,
        orderMetadata: {
          fancyperu_cod: {
            authorized_by: "auto_injected",
            authorized_at: "2026-10-17T00:00:00.000Z",
            authorized_signature: "a".repeat(64),
          },
        },
      })

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe("blocked")
    })

    it("blocks is_cash_on_delivery written by the buyer", () => {
      const result = resolveFulfillmentAuthorization({
        orderId: ORDER_ID,
        serverSecret: SECRET,
        orderMetadata: { is_cash_on_delivery: true },
      })

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe("blocked")
    })

    it("blocks payment_method='contraentrega' written by the buyer", () => {
      const result = resolveFulfillmentAuthorization({
        orderId: ORDER_ID,
        serverSecret: SECRET,
        orderMetadata: { payment_method: "contraentrega" },
      })

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe("blocked")
    })

    it("blocks every combination of buyer COD flags without captured money", () => {
      const result = resolveFulfillmentAuthorization({
        orderId: ORDER_ID,
        serverSecret: SECRET,
        orderMetadata: {
          is_cash_on_delivery: true,
          payment_method: "contraentrega",
          is_cash_on_delivery_note: "discount not required",
        },
        paymentCollectionStatus: "pending",
      })

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe("blocked")
    })
  })

  describe("captured money authorizes", () => {
    it("allows completed payment collections", () => {
      const result = resolveFulfillmentAuthorization({
        orderId: ORDER_ID,
        serverSecret: SECRET,
        paymentCollectionStatus: "completed",
        orderMetadata: { is_cash_on_delivery: true },
      })

      expect(result.allowed).toBe(true)
      expect(result.reason).toBe("captured")
    })

    it("allows partially_captured payment collections (same as before the fix)", () => {
      const result = resolveFulfillmentAuthorization({
        paymentCollectionStatus: "partially_captured",
      })

      expect(result.allowed).toBe(true)
      expect(result.reason).toBe("captured")
    })

    it("keeps authorizing captured money even when the server secret is absent", () => {
      const result = resolveFulfillmentAuthorization({
        paymentCollectionStatus: "completed",
      })

      expect(result.allowed).toBe(true)
      expect(result.reason).toBe("captured")
    })

    it("blocks pending and awaiting payment collections", () => {
      const pending = resolveFulfillmentAuthorization({
        paymentCollectionStatus: "pending",
      })
      expect(pending.allowed).toBe(false)
      expect(pending.reason).toBe("blocked")

      const awaiting = resolveFulfillmentAuthorization({
        paymentCollectionStatus: "awaiting",
      })
      expect(awaiting.allowed).toBe(false)
      expect(awaiting.reason).toBe("blocked")
    })

    it("allows extra pendingPaymentCollectionStatusList entries", () => {
      const result = resolveFulfillmentAuthorization({
        paymentCollectionStatus: "culqi_captured_ok",
        pendingPaymentCollectionStatusList: ["culqi_captured_ok"],
      })

      expect(result.allowed).toBe(true)
      expect(result.reason).toBe("captured")
    })
  })

  describe("admin-verified manual payments (HMAC-signed status)", () => {
    it("allows manual_payment_status='verified_and_captured' with a valid signature", () => {
      const result = resolveFulfillmentAuthorization({
        orderId: ORDER_ID,
        serverSecret: SECRET,
        orderMetadata: signedManualMetadata(),
        paymentCollectionStatus: "authorized",
      })

      expect(result.allowed).toBe(true)
      expect(result.reason).toBe("manual_verified")
    })

    it("blocks manual_payment_status='verified_and_captured' without a signature (buyer-injected)", () => {
      const result = resolveFulfillmentAuthorization({
        orderId: ORDER_ID,
        serverSecret: SECRET,
        orderMetadata: { manual_payment_status: "verified_and_captured" },
      })

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe("blocked")
    })

    it("blocks a manual payment signature bound to another order", () => {
      const result = resolveFulfillmentAuthorization({
        orderId: "order_victim",
        serverSecret: SECRET,
        orderMetadata: signedManualMetadata({}, "order_attacker"),
      })

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe("blocked")
    })

    it("blocks manual verification states that are not captured", () => {
      const pending = resolveFulfillmentAuthorization({
        orderId: ORDER_ID,
        serverSecret: SECRET,
        orderMetadata: { manual_payment_status: "pending" },
      })
      expect(pending.allowed).toBe(false)
      expect(pending.reason).toBe("blocked")

      const rejected = resolveFulfillmentAuthorization({
        orderId: ORDER_ID,
        serverSecret: SECRET,
        orderMetadata: { manual_payment_status: "rejected" },
      })
      expect(rejected.allowed).toBe(false)
      expect(rejected.reason).toBe("blocked")
    })

    it("fails closed when the manual status is verified but no secret was provided", () => {
      const result = resolveFulfillmentAuthorization({
        orderMetadata: { manual_payment_status: "verified_and_captured" },
      })

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe("blocked")
    })
  })

  describe("server-side COD authorization (HMAC-signed)", () => {
    it("allows a fully signed fancyperu_cod marker of the same order", () => {
      const result = resolveFulfillmentAuthorization({
        orderId: ORDER_ID,
        serverSecret: SECRET,
        orderMetadata: signedCodMetadata(),
      })

      expect(result.allowed).toBe(true)
      expect(result.reason).toBe("cod_authorized")
    })

    it("blocks a COD signature computed for a different order", () => {
      const result = resolveFulfillmentAuthorization({
        orderId: "order_victim",
        serverSecret: SECRET,
        orderMetadata: signedCodMetadata({}, "order_attacker"),
      })

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe("blocked")
    })

    it("blocks a COD marker signed with a foreign secret", () => {
      const payload = {
        order_id: ORDER_ID,
        authorized_by: "admin@fancyperu.pe",
        authorized_at: "2026-10-17T00:00:00.000Z",
        status: "authorized",
      }
      const result = resolveFulfillmentAuthorization({
        orderId: ORDER_ID,
        serverSecret: "the-real-server-secret",
        orderMetadata: {
          fancyperu_cod: {
            ...payload,
            authorized_signature: signCodAuthorization(payload, "attacker-secret"),
          },
        },
      })

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe("blocked")
    })

    it("blocks non-object fancyperu_cod shapes", () => {
      const result = resolveFulfillmentAuthorization({
        orderId: ORDER_ID,
        serverSecret: SECRET,
        orderMetadata: { fancyperu_cod: true },
      })

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe("blocked")
    })
  })

  describe("order status guard", () => {
    it("blocks fulfillment of canceled orders even with captured money", () => {
      const result = resolveFulfillmentAuthorization({
        orderId: ORDER_ID,
        serverSecret: SECRET,
        orderStatus: "canceled",
        paymentCollectionStatus: "completed",
      })

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe("blocked")
    })

    it("blocks fulfillment of canceled orders even with a signed COD authorization", () => {
      const result = resolveFulfillmentAuthorization({
        orderId: ORDER_ID,
        serverSecret: SECRET,
        orderStatus: "canceled",
        orderMetadata: signedCodMetadata(),
      })

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe("blocked")
    })

    it("does not treat other statuses as canceled", () => {
      const result = resolveFulfillmentAuthorization({
        orderStatus: "completed",
        paymentCollectionStatus: "completed",
      })

      expect(result.allowed).toBe(true)
      expect(result.reason).toBe("captured")
    })
  })
})
