import { MedusaError, PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"
import { CulqiPaymentProviderService } from "../service"
import { CulqiClient } from "../client"
import { CulqiIdempotencyStore } from "../idempotency"
import { CulqiReconciliationService } from "../reconciliation"
import { CulqiApiError, CulqiTimeoutError, CulqiUncertainStateError } from "../errors"
import { POST as webhookPost } from "../../../api/store/culqi/webhook/route"
import { requireAdminFinancialPrivilege } from "../../../lib/admin-financial-authorization"

describe("Culqi Financial Hardening Test Suite (15 Critical Scenarios)", () => {
  let mockLogger: any
  let mockClient: jest.Mocked<CulqiClient>
  let idempotencyStore: CulqiIdempotencyStore
  let provider: CulqiPaymentProviderService

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }

    mockClient = {
      createCharge: jest.fn(),
      getCharge: jest.fn(),
      listCharges: jest.fn(),
      captureCharge: jest.fn(),
      createRefund: jest.fn(),
    } as any

    provider = new CulqiPaymentProviderService(
      { logger: mockLogger },
      {
        secretKey: "sk_test_mock_secret",
        publicKey: "pk_test_mock_public",
        autoCapture: true,
      }
    )

    ;(provider as any).client_ = mockClient
    ;(provider as any).reconciliationService_ = new CulqiReconciliationService(
      mockClient,
      provider.getIdempotencyStore(),
      mockLogger
    )
    idempotencyStore = provider.getIdempotencyStore()
    idempotencyStore.clearMemory()

    jest.spyOn(CulqiClient.prototype, "getCharge").mockImplementation((id: string) => mockClient.getCharge(id))
    jest.spyOn(CulqiClient.prototype, "createCharge").mockImplementation((data: any) => mockClient.createCharge(data))
    jest.spyOn(CulqiClient.prototype, "captureCharge").mockImplementation((id: string) => mockClient.captureCharge(id))
    jest.spyOn(CulqiClient.prototype, "createRefund").mockImplementation((data: any) => mockClient.createRefund(data))
    jest.spyOn(CulqiClient.prototype, "listCharges").mockImplementation((params: any) => mockClient.listCharges(params))
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 1: Webhook Legítimo
  // ---------------------------------------------------------------------------
  describe("Scenario 1: Webhook Legítimo", () => {
    it("processes a verified charge.succeeded webhook and returns SUCCESSFUL action", async () => {
      mockClient.getCharge.mockResolvedValueOnce({
        id: "chr_test_legit_101",
        amount: 7990,
        currency_code: "PEN",
        capture: true,
        metadata: { session_id: "payses_legit_001" },
        source: { brand: "Visa", last_four: "1234" },
      } as any)

      const result = await provider.getWebhookActionAndData({
        data: {
          type: "charge.succeeded",
          data: {
            id: "chr_test_legit_101",
            amount: 7990,
          },
        },
        rawData: "{}",
        headers: {},
      })

      expect(result.action).toBe(PaymentActions.SUCCESSFUL)
      expect(result.data).toEqual({
        session_id: "payses_legit_001",
        amount: 79.9, // converted to major units for Medusa core
      })
      expect(mockClient.getCharge).toHaveBeenCalledWith("chr_test_legit_101")
    })
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 2: Webhook Falsificado
  // ---------------------------------------------------------------------------
  describe("Scenario 2: Webhook Falsificado", () => {
    it("rejects forged webhook with invalid secret token (401)", async () => {
      process.env.CULQI_WEBHOOK_SECRET = "strong_wh_secret"
      const req = {
        body: { type: "charge.succeeded", data: { id: "chr_forged" } },
        headers: { authorization: "Bearer invalid_secret" },
        scope: { resolve: () => mockLogger },
      } as any
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any

      await webhookPost(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Unauthorized" }))
    })

    it("fails closed in production mode when CULQI_WEBHOOK_SECRET is missing (500)", async () => {
      const prevNodeEnv = process.env.NODE_ENV
      delete process.env.CULQI_WEBHOOK_SECRET
      process.env.NODE_ENV = "production"

      const req = {
        body: { type: "charge.succeeded", data: { id: "chr_attack" } },
        headers: {},
        scope: { resolve: () => mockLogger },
      } as any
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any

      try {
        await webhookPost(req, res)
        expect(res.status).toHaveBeenCalledWith(500)
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: "Misconfigured Server" })
        )
      } finally {
        process.env.NODE_ENV = prevNodeEnv
      }
    })

    it("rejects webhook if remote charge does not exist on Culqi API (400)", async () => {
      delete process.env.CULQI_WEBHOOK_SECRET
      process.env.CULQI_SECRET_KEY = "sk_test_key"

      mockClient.getCharge.mockRejectedValueOnce(new CulqiApiError("Not found", 404))

      const req = {
        body: { type: "charge.succeeded", data: { id: "chr_nonexistent" } },
        headers: {},
        scope: { resolve: () => mockLogger },
      } as any
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any

      await webhookPost(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 3: Webhook Duplicado
  // ---------------------------------------------------------------------------
  describe("Scenario 3: Webhook Duplicado", () => {
    it("records completion on first run and returns already_processed on duplicate delivery", async () => {
      delete process.env.CULQI_WEBHOOK_SECRET
      process.env.CULQI_SECRET_KEY = "sk_test_key"

      const remoteCharge = {
        id: "chr_test_dup_001",
        amount: 5000,
        currency_code: "PEN",
        capture: true,
        metadata: { session_id: "sess_dup_001" },
      }
      mockClient.getCharge.mockResolvedValue(remoteCharge as any)

      const payload = {
        id: "evt_dup_unique_999",
        type: "charge.succeeded",
        data: { id: "chr_test_dup_001", amount: 5000 },
      }

      const req = {
        body: payload,
        headers: {},
        scope: {
          resolve: (key: string) => {
            if (key === "logger") return mockLogger
            if (key === "query") return { graph: jest.fn().mockResolvedValue({ data: [] }) }
            return {}
          },
        },
      } as any

      const res1 = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any
      await webhookPost(req, res1)
      expect(res1.status).toHaveBeenCalledWith(200)
      expect(res1.json).toHaveBeenCalledWith(expect.objectContaining({ verified: true }))

      // Second delivery of same event
      const res2 = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any
      await webhookPost(req, res2)
      expect(res2.status).toHaveBeenCalledWith(200)
      expect(res2.json).toHaveBeenCalledWith(
        expect.objectContaining({ received: true, status: "already_processed" })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 4: Dos Webhooks Simultáneos (Concurrencia)
  // ---------------------------------------------------------------------------
  describe("Scenario 4: Dos Webhooks Simultáneos", () => {
    it("handles concurrent deliveries cleanly without race condition", async () => {
      delete process.env.CULQI_WEBHOOK_SECRET
      process.env.CULQI_SECRET_KEY = "sk_test_key"

      const remoteCharge = {
        id: "chr_test_concurrent_001",
        amount: 7990,
        currency_code: "PEN",
        capture: true,
        metadata: { session_id: "sess_concurrent_001" },
      }
      mockClient.getCharge.mockResolvedValue(remoteCharge as any)

      const payload = {
        id: "evt_concurrent_race_1",
        type: "charge.succeeded",
        data: { id: "chr_test_concurrent_001", amount: 7990 },
      }

      const createReq = () =>
        ({
          body: payload,
          headers: {},
          scope: {
            resolve: (key: string) => {
              if (key === "logger") return mockLogger
              if (key === "query") return { graph: jest.fn().mockResolvedValue({ data: [] }) }
              return {}
            },
          },
        }) as any

      const res1 = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any
      const res2 = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any

      // Execute simultaneously
      await Promise.all([webhookPost(createReq(), res1), webhookPost(createReq(), res2)])

      expect(res1.status).toHaveBeenCalledWith(200)
      expect(res2.status).toHaveBeenCalledWith(409)
    })
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 5: Webhook con Importe Incorrecto
  // ---------------------------------------------------------------------------
  describe("Scenario 5: Webhook con Importe Incorrecto", () => {
    it("rejects event when webhook payload amount contradicts Culqi server amount", async () => {
      mockClient.getCharge.mockResolvedValueOnce({
        id: "chr_test_price_hack",
        amount: 7990, // Real Culqi charge is 79.90
        currency_code: "PEN",
        capture: true,
        metadata: { session_id: "payses_005" },
      } as any)

      const result = await provider.getWebhookActionAndData({
        data: {
          type: "charge.succeeded",
          data: {
            id: "chr_test_price_hack",
            amount: 100, // Forged payload claiming S/ 1.00
          },
        },
        rawData: "{}",
        headers: {},
      })

      expect(result.action).toBe(PaymentActions.NOT_SUPPORTED)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Webhook amount mismatch for charge chr_test_price_hack")
      )
    })
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 6: Webhook con Moneda Incorrecta
  // ---------------------------------------------------------------------------
  describe("Scenario 6: Webhook con Moneda Incorrecta", () => {
    it("rejects non-PEN currencies and returns NOT_SUPPORTED", async () => {
      mockClient.getCharge.mockResolvedValueOnce({
        id: "chr_test_usd",
        amount: 5000,
        currency_code: "USD", // Foreign currency
        capture: true,
        metadata: { session_id: "payses_usd" },
      } as any)

      const result = await provider.getWebhookActionAndData({
        data: {
          type: "charge.succeeded",
          data: { id: "chr_test_usd", amount: 5000 },
        },
        rawData: "{}",
        headers: {},
      })

      expect(result.action).toBe(PaymentActions.NOT_SUPPORTED)
    })
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 7: Webhook perteneciente a otro pedido
  // ---------------------------------------------------------------------------
  describe("Scenario 7: Webhook perteneciente a otro pedido", () => {
    it("flags session mismatch when remote charge metadata does not match target order session", async () => {
      mockClient.getCharge.mockResolvedValueOnce({
        id: "chr_test_foreign_order",
        amount: 7990,
        currency_code: "PEN",
        capture: true,
        metadata: { session_id: "session_belonging_to_order_A" },
      } as any)

      const reconciliation = provider.getReconciliationService()
      const mockContainer = {
        resolve: (key: string) => ({
          graph: jest.fn().mockResolvedValue({
            data: [
              {
                id: "session_belonging_to_order_B",
                status: "pending",
                data: { amount: 7990 },
                currency_code: "PEN",
              },
            ],
          }),
        }),
      }

      const report = await reconciliation.reconcile(mockContainer, {
        sessionId: "session_belonging_to_order_B",
        chargeId: "chr_test_foreign_order",
      })

      expect(report.matched).toBe(false)
      expect(report.discrepancies).toEqual(
        expect.arrayContaining([expect.stringContaining("Session binding mismatch")])
      )
      expect(report.action_taken).toBe("mismatch_flagged")
    })
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 8: Evento fuera de orden
  // ---------------------------------------------------------------------------
  describe("Scenario 8: Evento fuera de orden", () => {
    it("ignores delayed charge.creation or charge.failed when charge was already captured", async () => {
      // First, charge is successfully captured
      await idempotencyStore.complete("charge:chr_test_ooo_100", {
        charge_id: "chr_test_ooo_100",
        amount: 7990,
        status: "completed",
        event_type: "charge.succeeded",
        event_date: 1700000050,
      })

      mockClient.getCharge.mockResolvedValue({
        id: "chr_test_ooo_100",
        amount: 7990,
        currency_code: "PEN",
        capture: true,
        metadata: { session_id: "sess_ooo_100" },
      } as any)

      // An out-of-order delayed failure event arrives
      const result = await provider.getWebhookActionAndData({
        data: {
          type: "charge.failed",
          creation_date: 1700000010, // older event date
          data: { id: "chr_test_ooo_100", amount: 7990 },
        },
        rawData: "{}",
        headers: {},
      })

      expect(result.action).toBe(PaymentActions.NOT_SUPPORTED)
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Out-of-order event 'charge.failed' ignored for already captured charge")
      )
    })
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 9: Timeout después del cargo
  // ---------------------------------------------------------------------------
  describe("Scenario 9: Timeout después del cargo", () => {
    it("does not retry createCharge on timeout and recovers via listCharges reverse lookup", async () => {
      mockClient.createCharge.mockRejectedValueOnce(
        new CulqiTimeoutError("Timeout creating charge", { endpoint: "/charges", method: "POST" })
      )

      // Remote query reveals the charge DID go through
      mockClient.listCharges.mockResolvedValueOnce({
        data: [
          {
            id: "chr_test_recovered_timeout",
            amount: 7990,
            currency_code: "PEN",
            capture: true,
            outcome: { type: "venta_exitosa" },
            source: { brand: "Visa", last_four: "4242" },
            metadata: { session_id: "payses_timeout_recover" },
          } as any,
        ],
      })

      const res = await provider.authorizePayment({
        data: {
          session_id: "payses_timeout_recover",
          amount: 7990,
          currency_code: "PEN",
          source_id: "tkn_test_card",
        },
        context: {
          customer: { id: "cus_1", email: "timeout@test.pe" },
        },
      })

      expect(res.status).toBe(PaymentSessionStatus.CAPTURED)
      expect(res.data?.charge_id).toBe("chr_test_recovered_timeout")
      // createCharge called exactly once (never retried blindly)
      expect(mockClient.createCharge).toHaveBeenCalledTimes(1)
      expect(mockClient.listCharges).toHaveBeenCalledTimes(1)
    })

    it("throws CulqiUncertainStateError when timeout cannot be confirmed, preventing double charge", async () => {
      mockClient.createCharge.mockRejectedValueOnce(
        new CulqiTimeoutError("Timeout creating charge", { endpoint: "/charges", method: "POST" })
      )
      mockClient.listCharges.mockResolvedValueOnce({ data: [] }) // not found

      await expect(
        provider.authorizePayment({
          data: {
            session_id: "payses_timeout_uncertain",
            amount: 7990,
            currency_code: "PEN",
            source_id: "tkn_test_card",
          },
          context: {
            customer: { id: "cus_1", email: "uncertain@test.pe" },
          },
        })
      ).rejects.toThrow(CulqiUncertainStateError)

      expect(mockClient.createCharge).toHaveBeenCalledTimes(1)
    })
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 10: Reintento de cargo potencialmente duplicado
  // ---------------------------------------------------------------------------
  describe("Scenario 10: Reintento de cargo potencialmente duplicado", () => {
    it("reuses existing completed charge on repeated authorizePayment calls without calling createCharge", async () => {
      mockClient.createCharge.mockResolvedValueOnce({
        id: "chr_test_once_only",
        amount: 7990,
        currency_code: "PEN",
        capture: true,
        source: { brand: "Visa", last_four: "1111" },
        outcome: { type: "venta_exitosa" },
      } as any)

      mockClient.getCharge.mockResolvedValue({
        id: "chr_test_once_only",
        amount: 7990,
        currency_code: "PEN",
        capture: true,
        source: { brand: "Visa", last_four: "1111" },
        outcome: { type: "venta_exitosa" },
      } as any)

      const input = {
        data: {
          session_id: "payses_repeat_01",
          amount: 7990,
          currency_code: "PEN",
          source_id: "tkn_test_repeat",
        },
        context: {
          customer: { id: "cus_1", email: "buyer@fancyperu.pe" },
        },
      }

      // First call: creates charge
      const res1 = await provider.authorizePayment(input)
      expect(res1.status).toBe(PaymentSessionStatus.CAPTURED)
      expect(res1.data?.charge_id).toBe("chr_test_once_only")
      expect(mockClient.createCharge).toHaveBeenCalledTimes(1)

      // Second call (buyer click or retry): reuses charge
      const res2 = await provider.authorizePayment(input)
      expect(res2.status).toBe(PaymentSessionStatus.CAPTURED)
      expect(res2.data?.charge_id).toBe("chr_test_once_only")
      // createCharge was NOT called again!
      expect(mockClient.createCharge).toHaveBeenCalledTimes(1)
    })
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 11: Reinicio durante procesamiento
  // ---------------------------------------------------------------------------
  describe("Scenario 11: Reinicio durante procesamiento", () => {
    it("recovers an orphaned processing lock whose lease expired", async () => {
      // Simulate crash: record left in processing state from 60 seconds ago
      const expiredDate = new Date(Date.now() - 60000)
      const lockKey = "session:payses_crashed_node"

      await idempotencyStore.acquireLock(lockKey, {
        operation_type: "authorize",
        session_id: "payses_crashed_node",
        amount: 7990,
      })

      // Manually set locked_at in memory store to expired
      const rec = await idempotencyStore.getByKey(lockKey)
      if (rec) rec.locked_at = expiredDate

      // Now server reboots and receives the retry
      const lockResult = await idempotencyStore.acquireLock(lockKey, {
        operation_type: "authorize",
        session_id: "payses_crashed_node",
        amount: 7990,
      })

      expect(lockResult.acquired).toBe(true)
      expect(lockResult.recovered).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 12: Captura ya ejecutada
  // ---------------------------------------------------------------------------
  describe("Scenario 12: Captura ya ejecutada", () => {
    it("returns immediately without calling captureCharge if already captured", async () => {
      const res = await provider.capturePayment({
        data: {
          charge_id: "chr_already_captured_99",
          captured: true,
        },
      })

      expect(res.data?.captured).toBe(true)
      expect(mockClient.captureCharge).not.toHaveBeenCalled()
    })

    it("idempotently returns captured status if already completed in idempotency store", async () => {
      await idempotencyStore.complete("capture:chr_cached_cap", {
        charge_id: "chr_cached_cap",
        status: "completed",
      })

      const res = await provider.capturePayment({
        data: {
          charge_id: "chr_cached_cap",
        },
      })

      expect(res.data?.captured).toBe(true)
      expect(mockClient.captureCharge).not.toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 13: Reembolso repetido
  // ---------------------------------------------------------------------------
  describe("Scenario 13: Reembolso repetido", () => {
    it("does not issue duplicate refunds if same refund is called twice", async () => {
      mockClient.createRefund.mockResolvedValueOnce({
        id: "ref_test_001",
        amount: 3000,
        charge_id: "chr_refund_target",
        creation_date: Date.now(),
        object: "refund",
      })

      const refundInput = {
        amount: 30, // S/ 30.00
        data: {
          charge_id: "chr_refund_target",
          currency_code: "PEN",
        },
      }

      // First refund: executed
      const res1 = await provider.refundPayment(refundInput)
      expect(res1.data?.last_refund_id).toBe("ref_test_001")
      expect(mockClient.createRefund).toHaveBeenCalledTimes(1)

      // Second refund: idempotent hit, returns existing
      const res2 = await provider.refundPayment(refundInput)
      expect(res2.data?.last_refund_id).toBe("ref_test_001")
      expect(mockClient.createRefund).toHaveBeenCalledTimes(1)
    })
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 14: Pérdida temporal de conexión
  // ---------------------------------------------------------------------------
  describe("Scenario 14: Pérdida temporal de conexión", () => {
    it("allows retrying safe read-only queries with CulqiClient", async () => {
      ;(CulqiClient.prototype.getCharge as any).mockRestore?.()
      const testClient = new CulqiClient({ secretKey: "sk_test_key" }, mockLogger)
      const mockFetch = jest.fn()
      global.fetch = mockFetch

      // Attempt 1 fails with network error, Attempt 2 succeeds
      mockFetch
        .mockRejectedValueOnce(new Error("ECONNRESET"))
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ id: "chr_reconnected", amount: 5000 }),
        })

      const res = await testClient.getCharge("chr_reconnected")
      expect(res.id).toBe("chr_reconnected")
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 15: Conciliación de pago pendiente
  // ---------------------------------------------------------------------------
  describe("Scenario 15: Conciliación de pago pendiente", () => {
    it("reconciles a pending Medusa session when Culqi shows charge was captured", async () => {
      mockClient.getCharge.mockResolvedValueOnce({
        id: "chr_reconcile_success",
        amount: 7990,
        currency_code: "PEN",
        capture: true,
        state: "captured",
        outcome: { type: "venta_exitosa" },
        metadata: { session_id: "payses_reconcile_target" },
      } as any)

      const reconciliation = provider.getReconciliationService()

      const updatePaymentSessionMock = jest.fn().mockResolvedValue({})
      const mockContainer = {
        resolve: (key: string) => {
          if (key === "query") {
            return {
              graph: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: "payses_reconcile_target",
                    status: "pending", // Local Medusa is still pending!
                    amount: 79.9,
                    currency_code: "PEN",
                    data: { amount: 7990, charge_id: "chr_reconcile_success" },
                    payment_collection_id: "paycol_1",
                  },
                ],
              }),
            }
          }
          if (key === "payment") {
            return {
              updatePaymentSession: updatePaymentSessionMock,
            }
          }
          return {}
        },
      }

      const report = await reconciliation.reconcile(mockContainer, {
        sessionId: "payses_reconcile_target",
        actorId: "admin@fancyperu.pe",
        autoFix: true,
      })

      expect(report.matched).toBe(true)
      expect(report.reconciled).toBe(true)
      expect(report.action_taken).toBe("captured")
      expect(report.remote_status).toBe("captured")
      expect(updatePaymentSessionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "payses_reconcile_target",
          amount: 79.9,
          currency_code: "PEN",
          status: "captured",
        })
      )
    })

    // -------------------------------------------------------------------------
    // SCENARIO 16: (H1) Auto-fix fallido reporta error y no afirma éxito falso
    // -------------------------------------------------------------------------
    it("flags mismatch and refuses false captured status when auto-fix synchronization throws", async () => {
      mockClient.getCharge.mockResolvedValueOnce({
        id: "chr_reconcile_err",
        amount: 5000,
        currency_code: "PEN",
        capture: true,
        state: "captured",
        metadata: { session_id: "payses_sync_fail" },
      } as any)

      const reconciliation = provider.getReconciliationService()

      const failingContainer = {
        resolve: (key: string) => {
          if (key === "query") {
            return {
              graph: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: "payses_sync_fail",
                    status: "pending",
                    amount: 50.0,
                    currency_code: "PEN",
                    data: { amount: 5000, charge_id: "chr_reconcile_err" },
                    payment_collection_id: "paycol_fail",
                  },
                ],
              }),
            }
          }
          if (key === "payment") {
            return {
              updatePaymentSession: jest.fn().mockRejectedValue(new Error("Database write timeout")),
            }
          }
          return {}
        },
      }

      const report = await reconciliation.reconcile(failingContainer, {
        sessionId: "payses_sync_fail",
        autoFix: true,
      })

      expect(report.reconciled).toBe(false)
      expect(report.action_taken).toBe("mismatch_flagged")
      expect(report.discrepancies).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Failed to auto-synchronize local state: Database write timeout"),
        ])
      )
    })

    // -------------------------------------------------------------------------
    // SCENARIO 17: (H1) Auto-fix deshabilitado por defecto (modo auditoría puro)
    // -------------------------------------------------------------------------
    it("defaults to read-only audit and does not modify state without explicit autoFix: true", async () => {
      mockClient.getCharge.mockResolvedValueOnce({
        id: "chr_audit_only",
        amount: 8000,
        currency_code: "PEN",
        capture: true,
        state: "captured",
        metadata: { session_id: "payses_audit_mode" },
      } as any)

      const reconciliation = provider.getReconciliationService()
      const updatePaymentSessionMock = jest.fn()

      const auditContainer = {
        resolve: (key: string) => {
          if (key === "query") {
            return {
              graph: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: "payses_audit_mode",
                    status: "pending",
                    amount: 80.0,
                    currency_code: "PEN",
                    data: { amount: 8000, charge_id: "chr_audit_only" },
                    payment_collection_id: "paycol_audit",
                  },
                ],
              }),
            }
          }
          if (key === "payment") {
            return { updatePaymentSession: updatePaymentSessionMock }
          }
          return {}
        },
      }

      // Default: autoFix omitted (must default to false)
      const report = await reconciliation.reconcile(auditContainer, {
        sessionId: "payses_audit_mode",
      })

      expect(report.action_taken).toBe("none")
      expect(report.reconciled).toBe(false)
      expect(updatePaymentSessionMock).not.toHaveBeenCalled()
    })

    // -------------------------------------------------------------------------
    // SCENARIO 18: (H2) Cierre canónico del ledger de idempotencia por session ID
    // -------------------------------------------------------------------------
    it("closes uncertain operation in idempotency store regardless of key prefix format", async () => {
      const sessionId = "payses_h2_canonical"
      const canonicalKey = CulqiIdempotencyStore.sessionKey(sessionId)

      // Start lock under canonical key
      await idempotencyStore.acquireLock(canonicalKey, {
        operation_type: "authorize",
        session_id: sessionId,
        amount: 9900,
      })

      // Simulate failure leaving it uncertain
      await idempotencyStore.fail(canonicalKey, "Connection lost", { uncertain: true })

      const uncertainRecord = await idempotencyStore.getBySessionId(sessionId)
      expect(uncertainRecord?.status).toBe("uncertain")

      // Complete by sessionId (simulating reconciliation resolution)
      const closed = await idempotencyStore.completeBySessionId(sessionId, {
        charge_id: "chr_h2_resolved",
        amount: 9900,
        status: "completed",
        response_payload: { id: "chr_h2_resolved", capture: true },
      })

      expect(closed.status).toBe("completed")
      expect(closed.charge_id).toBe("chr_h2_resolved")

      const verified = await idempotencyStore.getBySessionId(sessionId)
      expect(verified?.status).toBe("completed")
    })

    // -------------------------------------------------------------------------
    // SCENARIO 19: (H3) Recuperación de lock incierto con lookup remoto exitoso
    // -------------------------------------------------------------------------
    it("recovers an uncertain lock and reuses remote charge found via reverse lookup without double charge", async () => {
      const sessionId = "payses_h3_recover"
      const idempotencyKey = CulqiIdempotencyStore.sessionKey(sessionId)

      // Acquire lock and simulate uncertain state
      await idempotencyStore.acquireLock(idempotencyKey, {
        operation_type: "authorize",
        session_id: sessionId,
        amount: 12000,
      })
      await idempotencyStore.fail(idempotencyKey, "Network timeout during createCharge", {
        uncertain: true,
      })

      // Configure mock: reverse lookup finds the existing charge in Culqi
      mockClient.listCharges.mockResolvedValueOnce({
        data: [
          {
            id: "chr_remote_found_h3",
            amount: 12000,
            currency_code: "PEN",
            capture: true,
            state: "successful",
            metadata: { session_id: sessionId },
            source: { brand: "Mastercard", last_four: "4444" },
            outcome: { type: "venta_exitosa" },
          },
        ],
      } as any)

      // Client re-attempts authorization with a new token
      const authResult = await provider.authorizePayment({
        data: {
          session_id: sessionId,
          token_id: "tok_new_user_token_999",
          email: "customer_h3@test.pe",
          amount: 12000,
        },
        context: { idempotency_key: sessionId },
      })

      expect(authResult.status).toBe(PaymentSessionStatus.CAPTURED)
      expect(authResult.data?.charge_id).toBe("chr_remote_found_h3")
      // CRITICAL: createCharge must NOT be called again!
      expect(mockClient.createCharge).not.toHaveBeenCalled()
      expect(mockClient.listCharges).toHaveBeenCalledTimes(1)
    })

    // -------------------------------------------------------------------------
    // SCENARIO 20: (H3) Falla de red en verificación remota de lock incierto bloquea nuevo cargo
    // -------------------------------------------------------------------------
    it("blocks new charge with CulqiUncertainStateError when remote verification lookup fails", async () => {
      const sessionId = "payses_h3_blocked"
      const idempotencyKey = CulqiIdempotencyStore.sessionKey(sessionId)

      await idempotencyStore.acquireLock(idempotencyKey, {
        operation_type: "authorize",
        session_id: sessionId,
        amount: 5000,
      })
      await idempotencyStore.fail(idempotencyKey, "Timeout", { uncertain: true })

      // Reverse lookup fails due to Culqi network downtime
      mockClient.listCharges.mockRejectedValueOnce(new Error("ETIMEDOUT querying Culqi API"))

      await expect(
        provider.authorizePayment({
          data: {
            session_id: sessionId,
            token_id: "tok_new_token_blocked",
            email: "user_blocked@test.pe",
            amount: 5000,
          },
          context: { idempotency_key: sessionId },
        })
      ).rejects.toThrow(CulqiUncertainStateError)

      // Must NOT attempt to charge blindly
      expect(mockClient.createCharge).not.toHaveBeenCalled()
    })

    // -------------------------------------------------------------------------
    // SCENARIO 21: (H4) Detección de concurrencia y respuesta temprana
    // -------------------------------------------------------------------------
    it("responds with concurrent_processing when another webhook is actively holding the lock", async () => {
      delete process.env.CULQI_WEBHOOK_SECRET
      process.env.CULQI_SECRET_KEY = "sk_test_key"

      const remoteCharge = {
        id: "chr_h4_concurrent",
        amount: 4500,
        currency_code: "PEN",
        capture: true,
        metadata: { session_id: "sess_h4_conc" },
      }
      mockClient.getCharge.mockResolvedValue(remoteCharge as any)

      // Pre-acquire lock in processing state
      const idempotencyKey = "webhook:evt_h4_race"
      await idempotencyStore.acquireLock(idempotencyKey, {
        operation_type: "webhook",
        charge_id: "chr_h4_concurrent",
        session_id: "sess_h4_conc",
        amount: 4500,
        event_type: "charge.succeeded",
      })

      const req = {
        body: {
          id: "evt_h4_race",
          type: "charge.succeeded",
          data: { id: "chr_h4_concurrent", amount: 4500 },
        },
        headers: {},
        scope: {
          resolve: (key: string) => {
            if (key === "logger") return mockLogger
            return {}
          },
        },
      } as any

      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any

      await webhookPost(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "concurrent_processing",
        })
      )
    })

    // -------------------------------------------------------------------------
    // SCENARIO 22: (H5) Reembolsos parciales idénticos consecutivos no colisionan
    // -------------------------------------------------------------------------
    it("handles multiple partial refunds of the exact same amount without key collision", async () => {
      const chargeId = "chr_h5_partial"

      // Mock remote charge on Culqi with initial state: S/ 100 total, S/ 0 refunded
      mockClient.getCharge
        .mockResolvedValueOnce({
          id: chargeId,
          amount: 10000,
          amount_refunded: 0,
        } as any)
        .mockResolvedValueOnce({
          id: chargeId,
          amount: 10000,
          amount_refunded: 2000,
        } as any)

      mockClient.createRefund
        .mockResolvedValueOnce({
          id: "ref_part_1",
          amount: 2000,
          charge_id: chargeId,
        } as any)
        .mockResolvedValueOnce({
          id: "ref_part_2",
          amount: 2000,
          charge_id: chargeId,
        } as any)

      // Refund 1: S/ 20.00 (céntimos: 2000, target: 2000)
      const res1 = await provider.refundPayment({
        amount: 20,
        data: { charge_id: chargeId, currency_code: "PEN", amount_refunded: 0 },
      })

      expect(res1.data?.last_refund_id).toBe("ref_part_1")
      expect(res1.data?.amount_refunded).toBe(2000)

      // Refund 2: S/ 20.00 (céntimos: 2000, target: 4000)
      const res2 = await provider.refundPayment({
        amount: 20,
        data: { charge_id: chargeId, currency_code: "PEN", amount_refunded: 2000 },
      })

      expect(res2.data?.last_refund_id).toBe("ref_part_2")
      expect(res2.data?.amount_refunded).toBe(4000)

      // Both refunds must have been dispatched to Culqi without key collision
      expect(mockClient.createRefund).toHaveBeenCalledTimes(2)
    })

    // -------------------------------------------------------------------------
    // SCENARIO 23: (N1 & N7) Auto-fix con consulta por orderId resuelve relaciones completas y captura el pago
    // -------------------------------------------------------------------------
    it("synchronizes Medusa payment capture during auto-fix when queried by orderId without fake success", async () => {
      const orderId = "ord_test_n1_n7"
      const sessionId = "payses_test_n1"
      const chargeId = "chr_test_n1_remote"
      const pColId = "pcol_test_n1"
      const paymentId = "pay_test_n1"

      mockClient.getCharge.mockResolvedValueOnce({
        id: chargeId,
        amount: 5000,
        currency_code: "PEN",
        capture: true,
        state: "successful",
      } as any)

      const mockPaymentModule = {
        updatePaymentSession: jest.fn().mockResolvedValue({ id: sessionId }),
        capturePayment: jest.fn().mockResolvedValue({ id: paymentId }),
        authorizePaymentSession: jest.fn(),
      }

      const mockContainer = {
        resolve: jest.fn((key: string) => {
          if (key === "payment") return mockPaymentModule
          if (key === "query") {
            return {
              graph: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: orderId,
                    status: "pending",
                    payment_collections: [
                      {
                        id: pColId,
                        status: "pending",
                        amount: 50,
                        currency_code: "PEN",
                        payments: [
                          {
                            id: paymentId,
                            status: "authorized",
                            amount: 50,
                          },
                        ],
                        payment_sessions: [
                          {
                            id: sessionId,
                            status: "pending",
                            amount: 50,
                            currency_code: "PEN",
                            provider_id: "pp_culqi_culqi",
                            payment_collection_id: pColId,
                            data: { charge_id: chargeId },
                          },
                        ],
                      },
                    ],
                    customer: { email: "shopper@test.com" },
                  },
                ],
              }),
            }
          }
          return null
        }),
      }

      const reconService = new CulqiReconciliationService(mockClient, idempotencyStore, mockLogger)
      const report = await reconService.reconcile(mockContainer as any, {
        orderId,
        autoFix: true,
      })

      expect(report.matched).toBe(true)
      expect(report.reconciled).toBe(true)
      expect(report.action_taken).toBe("captured")
      expect(mockPaymentModule.updatePaymentSession).toHaveBeenCalledWith(
        expect.objectContaining({
          id: sessionId,
          amount: 50,
          currency_code: "PEN",
          status: "captured",
        })
      )
      expect(mockPaymentModule.capturePayment).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_id: paymentId,
          amount: 50,
        })
      )
    })

    // -------------------------------------------------------------------------
    // SCENARIO 24: (N2) refundPayment bloquea con CulqiUncertainStateError ante concurrencia en processing
    // -------------------------------------------------------------------------
    it("blocks concurrent refund with CulqiUncertainStateError when status is processing", async () => {
      const chargeId = "chr_n2_concurrent"
      mockClient.getCharge.mockResolvedValue({
        id: chargeId,
        amount: 10000,
        amount_refunded: 0,
      } as any)

      // Acquire initial lock in processing state
      await idempotencyStore.acquireLock(`refund:${chargeId}:target:2000`, {
        operation_type: "refund",
        charge_id: chargeId,
        amount: 2000,
      })

      // Second concurrent refund call
      await expect(
        provider.refundPayment({
          amount: 20,
          data: { charge_id: chargeId, currency_code: "PEN", amount_refunded: 0 },
        })
      ).rejects.toThrow(CulqiUncertainStateError)

      // createRefund must NOT be called concurrently
      expect(mockClient.createRefund).not.toHaveBeenCalled()
    })

    // -------------------------------------------------------------------------
    // SCENARIO 25: (N2b) refundPayment falla de forma cerrada (fail-closed) si getCharge falla
    // -------------------------------------------------------------------------
    it("fails closed with MedusaError UNEXPECTED_STATE if remote getCharge fails prior to refund", async () => {
      const chargeId = "chr_n2_fail_closed"
      mockClient.getCharge.mockRejectedValueOnce(new Error("Culqi network timeout"))

      await expect(
        provider.refundPayment({
          amount: 20,
          data: { charge_id: chargeId, currency_code: "PEN", amount_refunded: 0 },
        })
      ).rejects.toThrow(MedusaError)

      expect(mockClient.createRefund).not.toHaveBeenCalled()
    })

    // -------------------------------------------------------------------------
    // SCENARIO 26: (N3) authorizePayment bloquea en recuperación si faltan identificadores
    // -------------------------------------------------------------------------
    it("blocks with CulqiUncertainStateError during recovery if missing customer email", async () => {
      const key = CulqiIdempotencyStore.sessionKey("session_n3_no_email")
      await idempotencyStore.acquireLock(key, {
        operation_type: "authorize",
        session_id: "session_n3_no_email",
        amount: 5000,
      })
      await idempotencyStore.fail(key, "Simulated crash", { uncertain: true })

      await expect(
        provider.authorizePayment({
          data: {
            session_id: "session_n3_no_email",
            currency_code: "PEN",
            amount: 5000,
          },
          context: {},
        })
      ).rejects.toThrow(CulqiUncertainStateError)

      expect(mockClient.createCharge).not.toHaveBeenCalled()
    })

    // -------------------------------------------------------------------------
    // SCENARIO 27: (N3b) authorizePayment bloquea en recuperación si getCharge falla en cargo registrado
    // -------------------------------------------------------------------------
    it("blocks with CulqiUncertainStateError during recovery if getCharge fails on recorded charge_id", async () => {
      const sessionId = "session_n3_recorded_fail"
      const key = CulqiIdempotencyStore.sessionKey(sessionId)
      await idempotencyStore.acquireLock(key, {
        operation_type: "authorize",
        session_id: sessionId,
        charge_id: "chr_recorded_prior",
        amount: 5000,
      })
      await idempotencyStore.fail(key, "Timeout before confirmation", {
        uncertain: true,
        charge_id: "chr_recorded_prior",
      })

      mockClient.getCharge.mockRejectedValueOnce(new Error("Connection reset by peer"))

      await expect(
        provider.authorizePayment({
          data: {
            session_id: sessionId,
            currency_code: "PEN",
            email: "shopper@test.com",
            amount: 5000,
          },
          context: {},
        })
      ).rejects.toThrow(CulqiUncertainStateError)

      expect(mockClient.createCharge).not.toHaveBeenCalled()
    })

    // -------------------------------------------------------------------------
    // SCENARIO 28: (N4) Webhook concurrente devuelve HTTP 409 Conflict
    // -------------------------------------------------------------------------
    it("responds with HTTP 409 Conflict when concurrent webhook is processing", async () => {
      const chargeId = "chr_n4_webhook"
      const eventId = "evt_n4_concurrent"

      // Mock remote charge for validation
      mockClient.getCharge.mockResolvedValue({
        id: chargeId,
        amount: 5000,
        currency_code: "PEN",
        capture: true,
        creation_date: Date.now(),
      } as any)

      // Acquire lock in processing state for this webhook event
      await idempotencyStore.acquireLock(`webhook:${eventId}`, {
        operation_type: "webhook",
        charge_id: chargeId,
        amount: 5000,
        currency_code: "PEN",
        event_type: "charge.succeeded",
      })

      const req: any = {
        scope: {
          resolve: jest.fn((key: string) => {
            if (key === "logger") return mockLogger
            return null
          }),
        },
        body: {
          id: eventId,
          type: "charge.succeeded",
          data: { id: chargeId },
        },
        headers: {
          authorization: "Bearer test_wh_sec",
        },
      }

      process.env.CULQI_SECRET_KEY = "sk_test_mock"
      process.env.CULQI_WEBHOOK_SECRET = "test_wh_sec"

      const jsonMock = jest.fn()
      const statusMock = jest.fn().mockReturnValue({ json: jsonMock })
      const res: any = { status: statusMock }

      await webhookPost(req, res)

      expect(statusMock).toHaveBeenCalledWith(409)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          received: false,
          status: "concurrent_processing",
        })
      )
    })

    // -------------------------------------------------------------------------
    // SCENARIO 29: (N6) CulqiIdempotencyStore prohíbe degradación a memoria en producción
    // -------------------------------------------------------------------------
    it("prohibits in-memory degradation when NODE_ENV is production without Knex", async () => {
      const prevEnv = process.env.NODE_ENV
      const prevAllow = process.env.ALLOW_MEMORY_IDEMPOTENCY
      process.env.NODE_ENV = "production"
      delete process.env.ALLOW_MEMORY_IDEMPOTENCY

      try {
        const memoryOnlyStore = new CulqiIdempotencyStore(undefined, mockLogger)
        await expect(
          memoryOnlyStore.acquireLock("test_prod_key", {
            operation_type: "authorize",
          })
        ).rejects.toThrow(/PostgreSQL is required for financial idempotency in production/)
      } finally {
        process.env.NODE_ENV = prevEnv
        if (prevAllow !== undefined) {
          process.env.ALLOW_MEMORY_IDEMPOTENCY = prevAllow
        }
      }
    })

    // -------------------------------------------------------------------------
    // SCENARIO 30: (H6) requireAdminFinancialPrivilege bloquea a manager sin privilegios con 403
    // -------------------------------------------------------------------------
    it("blocks admin user with manager role from financial mutations (HTTP 403)", async () => {
      const req: any = {
        auth_context: {
          actor_id: "usr_manager_1",
          actor_type: "user",
        },
        scope: {
          resolve: jest.fn((key: string) => {
            if (key === "query") {
              return {
                graph: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: "usr_manager_1",
                      email: "manager@fancyperu.com",
                      metadata: { role: "manager" },
                    },
                  ],
                }),
              }
            }
            return null
          }),
        },
      }

      const nextMock = jest.fn()
      const res: any = {}

      await expect(
        requireAdminFinancialPrivilege(req, res, nextMock)
      ).rejects.toThrow(MedusaError)

      expect(nextMock).not.toHaveBeenCalled()
    })
  })
})
