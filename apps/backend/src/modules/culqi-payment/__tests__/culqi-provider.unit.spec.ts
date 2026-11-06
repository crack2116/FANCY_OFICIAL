import { PaymentSessionStatus, PaymentActions, MedusaError } from "@medusajs/framework/utils"
import { CulqiPaymentProviderService } from "../service"
import {
  assertAmountMatchCents,
  fromCulqiCentimos,
  requireStoredCentimos,
  toCulqiCentimos,
  validateCurrency,
  sanitizePhone,
} from "../utils"
import { CulqiClient } from "../client"
import { CulqiApiError, CulqiConfigError } from "../errors"

describe("Culqi Payment Provider Unit Tests", () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    activity: jest.fn(),
    progress: jest.fn(),
    failure: jest.fn(),
    success: jest.fn(),
  } as any

  describe("1. Currency and Amount Conversion", () => {
    it("should accept valid PEN currency and normalize to uppercase", () => {
      expect(validateCurrency("pen")).toBe("PEN")
      expect(validateCurrency("PEN")).toBe("PEN")
      expect(validateCurrency("  pen  ")).toBe("PEN")
    })

    it("should reject non-PEN currencies strictly", () => {
      expect(() => validateCurrency("USD")).toThrow(MedusaError)
      expect(() => validateCurrency("EUR")).toThrow(MedusaError)
      expect(() => validateCurrency("")).toThrow(MedusaError)
    })

    // Medusa 2.21.2 delivers amounts to providers in MAJOR currency units
    // (S/ 79.90 arrives as the number 79.9). The provider is the boundary that
    // scales to céntimos, exactly like the official Stripe provider (x10^decimals).
    it("converts Medusa major-unit amounts to Culqi céntimos exactly", () => {
      expect(toCulqiCentimos(1)).toBe(100) // S/ 1.00
      expect(toCulqiCentimos(10)).toBe(1000) // S/ 10.00
      expect(toCulqiCentimos(7990)).toBe(799000) // S/ 7990.00
      expect(toCulqiCentimos(79.9)).toBe(7990) // S/ 79.90
      expect(toCulqiCentimos(100.5)).toBe(10050) // S/ 100.50
      expect(toCulqiCentimos(169.96)).toBe(16996) // S/ 169.96 (owner regression case)
      expect(toCulqiCentimos("79.90")).toBe(7990) // dot-decimal string stays in major units
      expect(toCulqiCentimos({ value: "169.96" })).toBe(16996) // BigNumberRawValue (refund raw_amount shape)
      expect(toCulqiCentimos({ value: 79.9 })).toBe(7990)
    })

    it("rounds float artifacts to the exact integer céntimos", () => {
      expect(toCulqiCentimos(7989.999999999999)).toBe(799000) // 7989.999... -> 7990 major
      expect(toCulqiCentimos(0.1 + 0.2)).toBe(30) // 0.30000000000000004 -> 30 céntimos
      expect(toCulqiCentimos(16.996)).toBe(1700) // 3+ decimals follow half-up rounding (documented)
    })

    it("rejects zero, negative, NaN or non-finite amounts", () => {
      expect(() => toCulqiCentimos(0)).toThrow(MedusaError)
      expect(() => toCulqiCentimos(-500)).toThrow(MedusaError)
      expect(() => toCulqiCentimos(-0.01)).toThrow(MedusaError)
      expect(() => toCulqiCentimos(NaN)).toThrow(MedusaError)
      expect(() => toCulqiCentimos(Infinity)).toThrow(MedusaError)
      expect(() => toCulqiCentimos("invalid")).toThrow(MedusaError)
      expect(() => toCulqiCentimos("79,90")).toThrow(MedusaError) // comma decimals are not accepted (documented)
      expect(() => toCulqiCentimos("")).toThrow(MedusaError)
      expect(() => toCulqiCentimos(undefined as any)).toThrow(MedusaError)
      expect(() => toCulqiCentimos(null as any)).toThrow(MedusaError)
      expect(() => toCulqiCentimos({} as any)).toThrow(MedusaError) // object without value/raw.value
      expect(() => toCulqiCentimos({ value: "abc" })).toThrow(MedusaError)
    })

    it("rejects non-PEN currency through the default parameter chain", () => {
      expect(() => toCulqiCentimos(79.9, "USD")).toThrow(MedusaError)
      expect(toCulqiCentimos(79.9, "pen")).toBe(7990)
    })

    it("should sanitize phone numbers properly", () => {
      expect(sanitizePhone("+51 987 654 321")).toBe("+51987654321")
      expect(sanitizePhone("987-654-321")).toBe("987654321")
      expect(sanitizePhone(null)).toBeUndefined()
    })

    it("converts Culqi céntimos back to Medusa major units with fromCulqiCentimos", () => {
      expect(fromCulqiCentimos(100)).toBe(1)
      expect(fromCulqiCentimos(1000)).toBe(10)
      expect(fromCulqiCentimos(10050)).toBe(100.5)
      expect(fromCulqiCentimos(16996)).toBe(169.96)
      expect(() => fromCulqiCentimos(0)).toThrow(MedusaError)
      expect(() => fromCulqiCentimos(-1000)).toThrow(MedusaError)
      expect(() => fromCulqiCentimos(1.5)).toThrow(MedusaError)
      expect(() => fromCulqiCentimos(NaN)).toThrow(MedusaError)
      expect(() => fromCulqiCentimos(undefined as any)).toThrow(MedusaError)
    })

    it("matches storage vs event céntimos without throwing with assertAmountMatchCents", () => {
      expect(assertAmountMatchCents(7990, 7990)).toBe(true)
      expect(assertAmountMatchCents(16996, 16996)).toBe(true)
      expect(assertAmountMatchCents(7990, 7989)).toBe(false)
      expect(assertAmountMatchCents(7990, 100)).toBe(false)
      expect(assertAmountMatchCents(NaN, 7990)).toBe(false)
      expect(assertAmountMatchCents(undefined, 7990)).toBe(false)
      expect(assertAmountMatchCents(79.9, 79.9)).toBe(false) // céntimos must be integers
    })

    it("accepts only positive safe integer céntimos in stored session data", () => {
      expect(requireStoredCentimos(7990)).toBe(7990)
      expect(requireStoredCentimos({ value: 7990 })).toBe(7990)
      expect(() => requireStoredCentimos(79.9)).toThrow(MedusaError) // floats are major units, not céntimos
      expect(() => requireStoredCentimos(0)).toThrow(MedusaError)
      expect(() => requireStoredCentimos(-100)).toThrow(MedusaError)
      expect(() => requireStoredCentimos("7990")).toThrow(MedusaError) // string digits rejected
      expect(() => requireStoredCentimos(undefined)).toThrow(MedusaError)
      expect(() => requireStoredCentimos(7990, "USD")).toThrow(MedusaError)
    })
  })

  describe("2. Provider Options and Configuration Guard", () => {
    it("should allow initialization when secretKey is present", () => {
      expect(() => {
        CulqiPaymentProviderService.validateOptions({
          secretKey: "sk_test_mock_key_12345",
        })
      }).not.toThrow()
    })

    it("should throw CulqiConfigError when CULQI_ENABLED=true but secretKey is missing", () => {
      const originalEnv = process.env.CULQI_ENABLED
      try {
        process.env.CULQI_ENABLED = "true"
        expect(() => {
          CulqiPaymentProviderService.validateOptions({})
        }).toThrow(CulqiConfigError)
      } finally {
        process.env.CULQI_ENABLED = originalEnv
      }
    })
  })

  describe("3. Payment Lifecycle Workflows", () => {
    let provider: CulqiPaymentProviderService
    let mockClient: jest.Mocked<CulqiClient>

    beforeEach(() => {
      provider = new CulqiPaymentProviderService(
        { logger: mockLogger },
        {
          secretKey: "sk_test_sample_secret_key",
          publicKey: "pk_test_sample_public_key",
          autoCapture: true,
        }
      )

      mockClient = {
        createCharge: jest.fn(),
        getCharge: jest.fn(),
        captureCharge: jest.fn(),
        createRefund: jest.fn(),
      } as any

      // Inject mock client
      ;(provider as any).client_ = mockClient
    })

    it("should initiate a payment session correctly", async () => {
      const res = await provider.initiatePayment({
        amount: 79.9,
        currency_code: "pen",
        data: { custom_note: "FancyPeru" },
      })

      expect(res.status).toBe(PaymentSessionStatus.PENDING)
      expect(res.data?.amount).toBe(7990)
      expect(res.data?.currency_code).toBe("PEN")
      expect(res.data?.custom_note).toBe("FancyPeru")
      expect(typeof res.id).toBe("string")
    })

    it("should reject authorization if token_id/source_id is missing", async () => {
      await expect(
        provider.authorizePayment({
          data: {
            amount: 5000,
            currency_code: "PEN",
          },
          context: {
            customer: { id: "cus_1", email: "cliente@fancyperu.pe" },
          },
        })
      ).rejects.toThrow("source_id requerido")
    })

    it("should reject authorization if customer email is missing", async () => {
      await expect(
        provider.authorizePayment({
          data: {
            amount: 5000,
            currency_code: "PEN",
            token_id: "tkn_test_12345",
          },
          context: {},
        })
      ).rejects.toThrow("correo electrónico del cliente es obligatorio")
    })

    it("should successfully authorize and auto-capture payment when token is valid", async () => {
      mockClient.createCharge.mockResolvedValueOnce({
        id: "chr_test_99999",
        object: "charge",
        amount: 5000,
        amount_refunded: 0,
        currency_code: "PEN",
        email: "cliente@fancyperu.pe",
        capture: true,
        capture_date: Date.now(),
        creation_date: Date.now(),
        source: {
          id: "tkn_test_12345",
          object: "token",
          brand: "Visa",
          last_four: "4242",
        },
        outcome: {
          type: "venta_exitosa",
          code: "AUT0000",
        },
      })

      const res = await provider.authorizePayment({
        data: {
          amount: 5000,
          currency_code: "PEN",
          token_id: "tkn_test_12345",
          session_id: "sess_123",
        },
        context: {
          customer: {
            id: "cus_1",
            email: "cliente@fancyperu.pe",
            first_name: "Juan",
            last_name: "Perez",
            phone: "987654321",
          },
        },
      })

      expect(res.status).toBe(PaymentSessionStatus.CAPTURED)
      expect(res.data?.charge_id).toBe("chr_test_99999")
      expect(res.data?.card_brand).toBe("Visa")
      expect(res.data?.card_last_four).toBe("4242")
      expect(mockClient.createCharge).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000,
          currency_code: "PEN",
          source_id: "tkn_test_12345",
          capture: true,
        })
      )
    })

    it("should return existing charge idempotently if charge_id is already present", async () => {
      mockClient.getCharge.mockResolvedValueOnce({
        id: "chr_test_existing_111",
        object: "charge",
        amount: 5000,
        amount_refunded: 0,
        currency_code: "PEN",
        email: "cliente@fancyperu.pe",
        capture: true,
        capture_date: Date.now(),
        creation_date: Date.now(),
        source: { id: "tkn_1", object: "token" },
        outcome: { type: "venta_exitosa" },
      })

      const res = await provider.authorizePayment({
        data: {
          amount: 5000,
          currency_code: "PEN",
          charge_id: "chr_test_existing_111",
        },
        context: {
          customer: { id: "cus_1", email: "cliente@fancyperu.pe" },
        },
      })

      expect(res.status).toBe(PaymentSessionStatus.CAPTURED)
      expect(res.data?.charge_id).toBe("chr_test_existing_111")
      expect(mockClient.createCharge).not.toHaveBeenCalled()
    })

    it("should handle deferred authorization when autoCapture is false", async () => {
      ;(provider as any).options_.autoCapture = false

      mockClient.createCharge.mockResolvedValueOnce({
        id: "chr_test_auth_only",
        object: "charge",
        amount: 8000,
        amount_refunded: 0,
        currency_code: "PEN",
        email: "cliente@fancyperu.pe",
        capture: false,
        capture_date: null,
        creation_date: Date.now(),
        source: { id: "tkn_2", object: "token" },
      })

      const res = await provider.authorizePayment({
        data: {
          amount: 8000,
          currency_code: "PEN",
          token_id: "tkn_test_999",
        },
        context: {
          customer: { id: "cus_1", email: "cliente@fancyperu.pe" },
        },
      })

      expect(res.status).toBe(PaymentSessionStatus.AUTHORIZED)
      expect(res.data?.captured).toBe(false)
    })

    it("should capture a previously authorized charge", async () => {
      mockClient.captureCharge.mockResolvedValueOnce({
        id: "chr_test_auth_only",
        object: "charge",
        amount: 8000,
        amount_refunded: 0,
        currency_code: "PEN",
        email: "cliente@fancyperu.pe",
        capture: true,
        capture_date: Date.now(),
        creation_date: Date.now(),
        source: { id: "tkn_2", object: "token" },
      })

      const res = await provider.capturePayment({
        data: {
          charge_id: "chr_test_auth_only",
          captured: false,
        },
      })

      expect(res.data?.captured).toBe(true)
      expect(mockClient.captureCharge).toHaveBeenCalledWith("chr_test_auth_only")
    })

    it("should process a refund properly with a BigNumberRawValue raw_amount", async () => {
      mockClient.createRefund.mockResolvedValueOnce({
        id: "ref_test_001",
        object: "refund",
        amount: 3000,
        charge_id: "chr_test_99999",
        creation_date: Date.now(),
      })

      const res = await provider.refundPayment({
        amount: { value: "30.00" } as any,
        data: {
          charge_id: "chr_test_99999",
          currency_code: "PEN",
          amount_refunded: 0,
        },
      })

      expect(res.data?.last_refund_id).toBe("ref_test_001")
      expect(res.data?.amount_refunded).toBe(3000)
      expect(mockClient.createRefund).toHaveBeenCalledWith(
        expect.objectContaining({
          charge_id: "chr_test_99999",
          amount: 3000,
        })
      )
    })

    it("should process a numeric major-unit refund exactly once (S/ 79.90 => 7990)", async () => {
      mockClient.createRefund.mockResolvedValueOnce({
        id: "ref_test_002",
        object: "refund",
        amount: 7990,
        charge_id: "chr_test_99999",
        creation_date: Date.now(),
      })

      const res = await provider.refundPayment({
        amount: 79.9,
        data: {
          charge_id: "chr_test_99999",
          currency_code: "PEN",
          amount_refunded: 0,
        },
      })

      expect(mockClient.createRefund).toHaveBeenCalledWith(
        expect.objectContaining({
          charge_id: "chr_test_99999",
          amount: 7990,
        })
      )
      expect(res.data?.amount_refunded).toBe(7990)
    })

    it("scales an explicit MAJOR-unit input.amount exactly once when provided", async () => {
      mockClient.createCharge.mockResolvedValueOnce({
        id: "chr_test_explicit_amount",
        object: "charge",
        amount: 7990,
        amount_refunded: 0,
        currency_code: "PEN",
        email: "cliente@fancyperu.pe",
        capture: true,
        capture_date: Date.now(),
        creation_date: Date.now(),
        source: { id: "tkn_x", object: "token", brand: "Visa" },
      })

      const res = await provider.authorizePayment({
        amount: 79.9, // major units; future core shape (documented branch)
        data: {
          currency_code: "PEN",
          token_id: "tkn_test_explicit",
          session_id: "sess_explicit",
        },
        context: {
          customer: { id: "cus_1", email: "cliente@fancyperu.pe" },
        },
      } as any)

      expect(mockClient.createCharge).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 7990,
          currency_code: "PEN",
        })
      )
      expect(res.status).toBe(PaymentSessionStatus.CAPTURED)
    })

    it("rejects authorization when the stored céntimos amount is missing or malformed", async () => {
      await expect(
        provider.authorizePayment({
          data: {
            currency_code: "PEN",
            token_id: "tkn_test_missing_amount",
          },
          context: {
            customer: { id: "cus_1", email: "cliente@fancyperu.pe" },
          },
        })
      ).rejects.toThrow(MedusaError)

      await expect(
        provider.authorizePayment({
          data: {
            amount: 79.9, // major units in session data is a contract violation
            currency_code: "PEN",
            token_id: "tkn_test_float_amount",
          },
          context: {
            customer: { id: "cus_1", email: "cliente@fancyperu.pe" },
          },
        })
      ).rejects.toThrow(MedusaError)
    })

    it("should cancel payment session", async () => {
      const res = await provider.cancelPayment({
        data: { session_id: "sess_cancel_1" },
      })

      expect(res.data?.status).toBe(PaymentSessionStatus.CANCELED)
    })

    it("should map getPaymentStatus accurately", async () => {
      expect((await provider.getPaymentStatus({ data: { captured: true } })).status).toBe(
        PaymentSessionStatus.CAPTURED
      )
      expect((await provider.getPaymentStatus({ data: { charge_id: "chr_1" } })).status).toBe(
        PaymentSessionStatus.AUTHORIZED
      )
      expect((await provider.getPaymentStatus({ data: { status: "canceled" } })).status).toBe(
        PaymentSessionStatus.CANCELED
      )
      expect((await provider.getPaymentStatus({ data: {} })).status).toBe(
        PaymentSessionStatus.PENDING
      )
    })
  })

  describe("4. Webhook Action and Data Parsing", () => {
    let provider: CulqiPaymentProviderService
    let mockClient: jest.Mocked<CulqiClient>

    beforeEach(() => {
      provider = new CulqiPaymentProviderService(
        { logger: mockLogger },
        { secretKey: "sk_test_key" }
      )
      mockClient = {
        getCharge: jest.fn(),
      } as any
      ;(provider as any).client_ = mockClient
    })

    it("should verify server-to-server and map charge.succeeded to PaymentActions.CAPTURED", async () => {
      mockClient.getCharge.mockResolvedValueOnce({
        id: "chr_test_webhook_1",
        object: "charge",
        amount: 4500,
        amount_refunded: 0,
        currency_code: "PEN",
        email: "cliente@fancyperu.pe",
        capture: true,
        creation_date: Date.now(),
        source: { id: "tkn_1", object: "token" },
        metadata: { session_id: "sess_webhook_123" },
      })

      const res = await provider.getWebhookActionAndData({
        data: {
          id: "chr_test_webhook_1",
          type: "charge.succeeded",
        },
        headers: {},
        rawData: Buffer.from("{}"),
      })

      expect(res.action).toBe(PaymentActions.SUCCESSFUL)
      expect(res.data?.session_id).toBe("sess_webhook_123")
      // Webhook direction: Culqi céntimos (4500) -> Medusa major units (45).
      expect(res.data?.amount).toBe(45)
      expect(mockClient.getCharge).toHaveBeenCalledWith("chr_test_webhook_1")
    })

    it("should accept nested Culqi event payloads and reject amount mismatches", async () => {
      mockClient.getCharge.mockResolvedValueOnce({
        id: "chr_test_webhook_2",
        object: "charge",
        amount: 7990,
        amount_refunded: 0,
        currency_code: "PEN",
        email: "cliente@fancyperu.pe",
        capture: true,
        creation_date: Date.now(),
        source: { id: "tkn_1", object: "token" },
        metadata: { session_id: "sess_webhook_nested" },
      })

      const res = await provider.getWebhookActionAndData({
        data: {
          type: "charge.succeeded",
          data: { id: "chr_test_webhook_2", amount: 7990 },
        },
        headers: {},
        rawData: Buffer.from("{}"),
      })

      expect(res.action).toBe(PaymentActions.SUCCESSFUL)
      expect(res.data?.session_id).toBe("sess_webhook_nested")
      expect(res.data?.amount).toBe(79.9)
    })

    it("should return NOT_SUPPORTED when the event amount contradicts the server charge", async () => {
      mockClient.getCharge.mockResolvedValueOnce({
        id: "chr_test_webhook_3",
        object: "charge",
        amount: 7990,
        amount_refunded: 0,
        currency_code: "PEN",
        email: "cliente@fancyperu.pe",
        capture: true,
        creation_date: Date.now(),
        source: { id: "tkn_1", object: "token" },
        metadata: { session_id: "sess_webhook_mismatch" },
      })

      const res = await provider.getWebhookActionAndData({
        data: {
          type: "charge.succeeded",
          data: { id: "chr_test_webhook_3", amount: 100 },
        },
        headers: {},
        rawData: Buffer.from("{}"),
      })

      expect(res.action).toBe(PaymentActions.NOT_SUPPORTED)
    })

    it("should return NOT_SUPPORTED if payload is empty or invalid", async () => {
      const res = await provider.getWebhookActionAndData({
        data: {},
        headers: {},
        rawData: Buffer.from("{}"),
      })

      expect(res.action).toBe(PaymentActions.NOT_SUPPORTED)
    })
  })
})
