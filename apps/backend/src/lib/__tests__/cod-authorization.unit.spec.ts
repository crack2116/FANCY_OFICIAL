import { signCodAuthorization, signManualPaymentStatus, sanitizeCartMetadata, verifyCodAuthorization, verifyManualPaymentStatus } from "../cod-authorization"

/**
 * P0-B closure tests for the HMAC-backed COD and manual-payment authorizations.
 *
 * Everything the buyer can write through cart metadata must be rejected by the
 * gate. Only signatures computed with the SERVER secret and bound to the
 * concrete order id can ever verify. Test secret is a throwaway constant; the
 * real secret resolution lives in getServerSecret() and is covered by usage in
 * production routes.
 */
describe("cod-authorization", () => {
  const SECRET = "unit-test-server-secret-for-p0b-closure"
  const ORDER_ID = "order_p0b_unit_test"
  const AUTHORIZED_BY = "admin@fancyperu.pe"
  const AUTHORIZED_AT = "2026-10-17T00:00:00.000Z"

  function validCodSignature(orderId = ORDER_ID, secret = SECRET): string {
    return signCodAuthorization(
      {
        order_id: orderId,
        authorized_by: AUTHORIZED_BY,
        authorized_at: AUTHORIZED_AT,
        status: "authorized",
      },
      secret
    )
  }

  function signedCodMetadata(
    overrides: Record<string, unknown> = {},
    orderId = ORDER_ID,
    secret = SECRET
  ): Record<string, unknown> {
    return {
      fancyperu_cod: {
        order_id: orderId,
        authorized_by: AUTHORIZED_BY,
        authorized_at: AUTHORIZED_AT,
        status: "authorized",
        authorized_signature: validCodSignature(orderId, secret),
        ...overrides,
      },
    }
  }

  function signedManualMetadata(
    overrides: Record<string, unknown> = {},
    orderId = ORDER_ID,
    secret = SECRET
  ): Record<string, unknown> {
    return {
      manual_payment_status: "verified_and_captured",
      manual_payment_order_id: orderId,
      manual_payment_signature: signManualPaymentStatus(orderId, secret),
      ...overrides,
    }
  }

  describe("signCodAuthorization", () => {
    it("produces a deterministic 64-character hex HMAC-SHA256 signature", () => {
      const first = validCodSignature()
      const second = validCodSignature()

      expect(first).toBe(second)
      expect(first).toHaveLength(64)
      expect(/^[0-9a-f]{64}$/.test(first)).toBe(true)
    })

    it("changes when any payload field changes", () => {
      const base = validCodSignature()

      const differentOrder = signCodAuthorization(
        {
          order_id: "order_other",
          authorized_by: AUTHORIZED_BY,
          authorized_at: AUTHORIZED_AT,
          status: "authorized",
        },
        SECRET
      )
      const differentStatus = signCodAuthorization(
        {
          order_id: ORDER_ID,
          authorized_by: AUTHORIZED_BY,
          authorized_at: AUTHORIZED_AT,
          status: "revoked",
        },
        SECRET
      )
      const differentSecret = validCodSignature(ORDER_ID, "another-secret")

      expect(differentOrder).not.toBe(base)
      expect(differentStatus).not.toBe(base)
      expect(differentSecret).not.toBe(base)
    })

    it("rejects empty or missing payload strings", () => {
      expect(() =>
        signCodAuthorization(
          { order_id: "", authorized_by: AUTHORIZED_BY, authorized_at: AUTHORIZED_AT, status: "authorized" },
          SECRET
        )
      ).toThrow()
      expect(() =>
        signCodAuthorization(
          { order_id: ORDER_ID, authorized_by: AUTHORIZED_BY, authorized_at: AUTHORIZED_AT, status: "authorized" },
          ""
        )
      ).toThrow()
      expect(() =>
        signCodAuthorization(
          {
            order_id: ORDER_ID,
            authorized_by: "   ",
            authorized_at: AUTHORIZED_AT,
            status: "authorized",
          },
          SECRET
        )
      ).toThrow()
    })
  })

  describe("verifyCodAuthorization", () => {
    it("accepts a marker signed with the server secret and bound to the order", () => {
      const verification = verifyCodAuthorization(signedCodMetadata(), ORDER_ID, SECRET)

      expect(verification.valid).toBe(true)
      expect(verification.reason).toBe("valid")
    })

    it("rejects a marker without any signature (the audited injection shape)", () => {
      const metadata = {
        fancyperu_cod: {
          authorized_by: "hacker",
          authorized_at: AUTHORIZED_AT,
        },
      }

      const verification = verifyCodAuthorization(metadata, ORDER_ID, SECRET)
      expect(verification.valid).toBe(false)
      expect(verification.reason).toBe("malformed")
    })

    it("rejects a marker with a signature of the wrong shape or length", () => {
      const shortSignature = verifyCodAuthorization(
        signedCodMetadata({ authorized_signature: "abcd" }),
        ORDER_ID,
        SECRET
      )
      expect(shortSignature.valid).toBe(false)
      // timingSafeEqual must never be called with different buffer lengths
      expect(() => {
        const lengthMismatch = verifyCodAuthorization(
          signedCodMetadata({ authorized_signature: "abcd" }),
          ORDER_ID,
          SECRET
        )
        expect(lengthMismatch.valid).toBe(false)
      }).not.toThrow()

      const nonHex = verifyCodAuthorization(
        signedCodMetadata({ authorized_signature: "g".repeat(64) }),
        ORDER_ID,
        SECRET
      )
      expect(nonHex.valid).toBe(false)
      expect(nonHex.reason).toBe("bad_signature")
    })

    it("rejects a signature computed with a different secret", () => {
      const verification = verifyCodAuthorization(
        signedCodMetadata({}, ORDER_ID, "attacker-owned-secret"),
        ORDER_ID,
        SECRET
      )

      expect(verification.valid).toBe(false)
      expect(verification.reason).toBe("bad_signature")
    })

    it("rejects a marker bound to a different order (order_mismatch)", () => {
      const verification = verifyCodAuthorization(
        signedCodMetadata({}, "order_someone_elses_order"),
        ORDER_ID,
        SECRET
      )

      expect(verification.valid).toBe(false)
      expect(verification.reason).toBe("order_mismatch")
    })

    it("rejects a marker whose status is not 'authorized'", () => {
      const metadata = signedCodMetadata({ status: "pending" }) as {
        fancyperu_cod: Record<string, unknown>
      }
      // Signature must match the stored status so bad_status is evaluated before bad_signature
      metadata.fancyperu_cod.authorized_signature = signCodAuthorization(
        {
          order_id: ORDER_ID,
          authorized_by: AUTHORIZED_BY,
          authorized_at: AUTHORIZED_AT,
          status: "pending",
        },
        SECRET
      )

      const verification = verifyCodAuthorization(metadata, ORDER_ID, SECRET)
      expect(verification.valid).toBe(false)
      expect(verification.reason).toBe("bad_status")
    })

    it("rejects a tampered authorized_by while keeping the original signature", () => {
      const metadata = signedCodMetadata({ authorized_by: "hacker" })

      const verification = verifyCodAuthorization(metadata, ORDER_ID, SECRET)
      expect(verification.valid).toBe(false)
      expect(verification.reason).toBe("bad_signature")
    })

    it("rejects empty fields and empty secret values", () => {
      const emptyBy = signedCodMetadata({ authorized_by: "   " })
      expect(verifyCodAuthorization(emptyBy, ORDER_ID, SECRET)).toMatchObject({
        valid: false,
        reason: "malformed",
      })

      const emptySignature = signedCodMetadata({ authorized_signature: "" })
      expect(verifyCodAuthorization(emptySignature, ORDER_ID, SECRET)).toMatchObject({
        valid: false,
        reason: "malformed",
      })

      const noSecret = verifyCodAuthorization(signedCodMetadata(), ORDER_ID, "")
      expect(noSecret.valid).toBe(false)
      expect(noSecret.reason).toBe("missing")
    })

    it("reports missing when fancyperu_cod is absent or not an object", () => {
      expect(verifyCodAuthorization({}, ORDER_ID, SECRET)).toMatchObject({ valid: false, reason: "missing" })
      expect(verifyCodAuthorization({ fancyperu_cod: "hacker" }, ORDER_ID, SECRET)).toMatchObject({
        valid: false,
        reason: "missing",
      })
    })
  })

  describe("signManualPaymentStatus / verifyManualPaymentStatus", () => {
    it("signs and verifies a bound verified_and_captured status", () => {
      const signature = signManualPaymentStatus(ORDER_ID, SECRET)

      expect(signature).toHaveLength(64)
      expect(verifyManualPaymentStatus(signedManualMetadata(), ORDER_ID, SECRET)).toMatchObject({
        valid: true,
        reason: "valid",
      })
    })

    it("rejects a status signature computed for a different order", () => {
      const verification = verifyManualPaymentStatus(
        signedManualMetadata({}, "order_attacker_order"),
        ORDER_ID,
        SECRET
      )

      expect(verification.valid).toBe(false)
      expect(verification.reason).toBe("order_mismatch")
    })

    it("rejects buyer-injected status without signature", () => {
      const verification = verifyManualPaymentStatus(
        { manual_payment_status: "verified_and_captured" },
        ORDER_ID,
        SECRET
      )

      expect(verification.valid).toBe(false)
    })

    it("rejects other statuses", () => {
      const verification = verifyManualPaymentStatus(
        signedManualMetadata({ manual_payment_status: "rejected" }),
        ORDER_ID,
        SECRET
      )

      expect(verification.valid).toBe(false)
    })

    it("rejects tampered signature or empty secret", () => {
      expect(verifyManualPaymentStatus(signedManualMetadata({ manual_payment_signature: "deadbeef" }), ORDER_ID, SECRET)).toMatchObject({
        valid: false,
      })
      expect(verifyManualPaymentStatus(signedManualMetadata(), ORDER_ID, "")).toMatchObject({
        valid: false,
      })
    })

    it("throws when signing with an empty order id or secret", () => {
      expect(() => signManualPaymentStatus("", SECRET)).toThrow()
      expect(() => signManualPaymentStatus(ORDER_ID, "")).toThrow()
    })
  })

  describe("sanitizeCartMetadata", () => {
    it("removes exactly the three reserved server-managed keys", () => {
      const sanitized = sanitizeCartMetadata({
        fancyperu_cod: { authorized_by: "hacker" },
        manual_payment_status: "verified_and_captured",
        manual_payment_audit_trail: [{ action: "fake" }],
        is_cash_on_delivery: true,
        keep_me: "yes",
      })

      expect(sanitized).toEqual({ is_cash_on_delivery: true, keep_me: "yes" })
    })

    it("preserves legitimate keys untouched (clone, no mutation of the input)", () => {
      const input = { payment_method: "contraentrega", redeem: "x" }
      const sanitized = sanitizeCartMetadata(input)

      expect(sanitized).toEqual(input)
      sanitized.payment_method = "changed"
      expect(input.payment_method).toBe("contraentrega")
    })

    it("returns an empty object for undefined, null, scalars and arrays", () => {
      expect(sanitizeCartMetadata(undefined)).toEqual({})
      expect(sanitizeCartMetadata(null)).toEqual({})
      expect(sanitizeCartMetadata("injected")).toEqual({})
      expect(sanitizeCartMetadata(42)).toEqual({})
      expect(sanitizeCartMetadata([1, 2])).toEqual({})
    })
  })
})
