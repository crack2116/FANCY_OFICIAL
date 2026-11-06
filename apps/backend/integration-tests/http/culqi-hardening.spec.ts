/**
 * Culqi Financial Hardening - Integration Test Suite (HTTP + PostgreSQL).
 *
 * Runs against a real booted Medusa 2.21.2 instance connected to PostgreSQL:
 * 1. Webhook Security:
 *    - Rejects unauthorized webhook requests when CULQI_WEBHOOK_SECRET is active (401).
 *    - Rejects forged payloads pointing to non-existent charges (400).
 * 2. Database Idempotency Ledger:
 *    - Verifies that `culqi_operations` table is created in PostgreSQL with unique constraints.
 *    - Verifies atomic concurrent locks in PostgreSQL (ON CONFLICT DO NOTHING).
 * 3. Administrative Financial Reconciliation:
 *    - Enforces admin authentication on `POST /admin/orders/:id/reconcile-culqi` (401 without bearer).
 *    - Audits a real database order via admin endpoint, returning structured ReconciliationReport.
 */
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { CulqiIdempotencyStore } from "../../src/modules/culqi-payment/idempotency"

const ADMIN_EMAIL = "culqi-reconciler@fancyperu.test"
const ADMIN_PASSWORD = "culqi-hardening-password-2026"

jest.setTimeout(900000)

medusaIntegrationTestRunner({
  testSuite: ({ getContainer, api }) => {
    describe("Culqi Financial Hardening & Reconciliation (HTTP + PostgreSQL)", () => {
      let adminToken: string
      let publishableKey: string
      let testOrderId: string
      let bootedContainer: ReturnType<typeof getContainer>

      const adminHeaders = () => ({
        authorization: `Bearer ${adminToken}`,
        "content-type": "application/json",
      })

      const storeHeaders = () => ({
        "x-publishable-api-key": publishableKey,
        "content-type": "application/json",
      })

      beforeAll(async () => {
        bootedContainer = getContainer()

        const apiDefaults = (api as unknown as {
          defaults?: { validateStatus?: (status: number) => boolean }
        })?.defaults
        if (apiDefaults) {
          apiDefaults.validateStatus = () => true
        }

        // 1. Provision Admin Identity
        const authModule = bootedContainer.resolve(Modules.AUTH) as any
        const registration = await authModule.register("emailpass", {
          url: "",
          headers: {},
          query: {},
          body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
          protocol: "",
        })
        expect(registration.success).toBe(true)

        const userService = bootedContainer.resolve(Modules.USER) as any
        const admins = await userService.createUsers([
          { email: ADMIN_EMAIL, first_name: "Culqi", last_name: "Auditor" },
        ])
        const adminUserId = admins[0].id

        await authModule.updateAuthIdentities({
          id: registration.authIdentity!.id,
          app_metadata: { user_id: adminUserId },
        })

        const login = await api.post("/auth/user/emailpass", {
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
        })
        expect(login.status).toBe(200)
        adminToken = login.data.token

        // 2. Provision Publishable Key & Sales Channel
        const apiKeyResponse = await api.post(
          "/admin/api-keys",
          { title: "culqi-hardening-key", type: "publishable" },
          { headers: adminHeaders() }
        )
        expect(apiKeyResponse.status).toBe(200)
        publishableKey = String(apiKeyResponse.data.api_key?.token ?? "")

        const salesChannelsList = await api.get("/admin/sales-channels?limit=1", {
          headers: adminHeaders(),
        })
        let channelId = salesChannelsList.data.sales_channels?.[0]?.id as string | undefined
        if (!channelId) {
          const createdChannel = await api.post(
            "/admin/sales-channels",
            { name: "culqi-sales-channel" },
            { headers: adminHeaders() }
          )
          channelId = createdChannel.data.sales_channel.id as string
        }
        await api.post(
          `/admin/api-keys/${apiKeyResponse.data.api_key.id}/sales-channels`,
          { add: [channelId] },
          { headers: adminHeaders() }
        )

        // 3. Seed Region
        const regionsList = await api.get("/admin/regions?limit=1", {
          headers: adminHeaders(),
        })
        if ((regionsList.data.regions ?? []).length === 0) {
          await api.post(
            "/admin/regions",
            { name: "Peru", currency_code: "pen", countries: ["pe"] },
            { headers: adminHeaders() }
          )
        }

        // 4. Create a real Order in the test database for reconciliation
        const orderService = bootedContainer.resolve(Modules.ORDER) as any
        const order = await orderService.createOrders({
          currency_code: "PEN",
          email: "buyer-culqi-test@fancyperu.pe",
          items: [
            {
              title: "Alimento Canino Premium 15kg",
              quantity: 1,
              unit_price: 79.9,
            },
          ],
          shipping_address: {
            first_name: "Juan",
            last_name: "Perez",
            address_1: "Av. Larco 123",
            city: "Lima",
            country_code: "pe",
          },
        })
        testOrderId = order.id
        expect(testOrderId).toBeDefined()
      })

      // -----------------------------------------------------------------------
      // 1. Webhook Security & Verification
      // -----------------------------------------------------------------------
      describe("Webhook Security & Verification", () => {
        it("rejects unauthorized webhook calls when secret is configured (401)", async () => {
          const originalSecret = process.env.CULQI_WEBHOOK_SECRET
          process.env.CULQI_WEBHOOK_SECRET = "super_secure_webhook_secret_123"

          try {
            const res = await api.post(
              "/store/culqi/webhook",
              { type: "charge.succeeded", data: { id: "chr_forged_attempt" } },
              {
                headers: {
                  ...storeHeaders(),
                  authorization: "Bearer wrong_secret",
                },
              }
            )
            expect(res.status).toBe(401)
            expect(res.data).toEqual(expect.objectContaining({ error: "Unauthorized" }))
          } finally {
            if (originalSecret !== undefined) {
              process.env.CULQI_WEBHOOK_SECRET = originalSecret
            } else {
              delete process.env.CULQI_WEBHOOK_SECRET
            }
          }
        })

        it("fails charge verification on non-existent charge ID (400)", async () => {
          delete process.env.CULQI_WEBHOOK_SECRET
          const res = await api.post(
            "/store/culqi/webhook",
            {
              id: "evt_test_nonexistent",
              type: "charge.succeeded",
              data: { id: "chr_test_does_not_exist_at_culqi" },
            },
            { headers: storeHeaders() }
          )

          // 400: server-to-server check failed against Culqi
          expect(res.status).toBe(400)
        })
      })

      // -----------------------------------------------------------------------
      // 2. PostgreSQL Idempotency Ledger
      // -----------------------------------------------------------------------
      describe("PostgreSQL Idempotency Ledger", () => {
        it("creates culqi_operations table and executes atomic lock in real PostgreSQL", async () => {
          const knex = bootedContainer.resolve(ContainerRegistrationKeys.PG_CONNECTION)
          expect(knex).toBeDefined()

          const logger = bootedContainer.resolve(ContainerRegistrationKeys.LOGGER)
          const store = new CulqiIdempotencyStore(knex, logger)

          await store.ensureTable()

          const hasTable = await knex.schema.hasTable("culqi_operations")
          expect(hasTable).toBe(true)

          const key = `integration_test_lock_${Date.now()}`
          const lock1 = await store.acquireLock(key, {
            operation_type: "authorize",
            session_id: "sess_integration_001",
            amount: 7990,
            currency_code: "PEN",
          })

          expect(lock1.acquired).toBe(true)
          expect(lock1.isDuplicate).toBe(false)
          expect(lock1.record.status).toBe("processing")

          // Attempt duplicate acquire on the exact same key
          const lock2 = await store.acquireLock(key, {
            operation_type: "authorize",
            session_id: "sess_integration_001",
            amount: 7990,
          })

          expect(lock2.acquired).toBe(false)
          expect(lock2.isDuplicate).toBe(true)

          // Complete the operation
          await store.complete(key, {
            charge_id: "chr_integration_completed",
            amount: 7990,
            status: "completed",
            response_payload: { verified: true },
          })

          const record = await store.getByKey(key)
          expect(record).toBeDefined()
          expect(record?.status).toBe("completed")
          expect(record?.charge_id).toBe("chr_integration_completed")
        })

        it("serializes concurrent lock attempts in PostgreSQL cleanly", async () => {
          const knex = bootedContainer.resolve(ContainerRegistrationKeys.PG_CONNECTION)
          const logger = bootedContainer.resolve(ContainerRegistrationKeys.LOGGER)
          const store = new CulqiIdempotencyStore(knex, logger)

          const concurrentKey = `race_key_${Date.now()}`
          const [res1, res2] = await Promise.all([
            store.acquireLock(concurrentKey, {
              operation_type: "webhook",
              charge_id: "chr_race_001",
            }),
            store.acquireLock(concurrentKey, {
              operation_type: "webhook",
              charge_id: "chr_race_001",
            }),
          ])

          // Exactly one must acquire the lock, the other must see isDuplicate: true
          const acquiredCount = (res1.acquired ? 1 : 0) + (res2.acquired ? 1 : 0)
          expect(acquiredCount).toBe(1)
        })
      })

      // -----------------------------------------------------------------------
      // 3. Administrative Financial Reconciliation
      // -----------------------------------------------------------------------
      describe("Administrative Financial Reconciliation", () => {
        it("rejects unauthenticated requests to reconcile-culqi (401)", async () => {
          const res = await api.post(`/admin/orders/${testOrderId}/reconcile-culqi`, {})
          expect(res.status).toBe(401)
        })

        it("allows authenticated admin to audit order against Culqi", async () => {
          const originalKey = process.env.CULQI_SECRET_KEY
          process.env.CULQI_SECRET_KEY = "sk_test_mock_reconciliation_key"

          try {
            const res = await api.post(
              `/admin/orders/${testOrderId}/reconcile-culqi`,
              { auto_fix: false, charge_id: "chr_test_audit_reconcile" },
              { headers: adminHeaders() }
            )

            expect(res.status).toBe(200)
            expect(res.data).toHaveProperty("reconciliation")
            const report = res.data.reconciliation

            expect(report.order_id).toBe(testOrderId)
            expect(report.matched).toBe(false)
            expect(report.reconciled).toBe(false)
            expect(report.action_taken).toBe("none")
            expect(Array.isArray(report.discrepancies)).toBe(true)
            expect(report.discrepancies.length).toBeGreaterThan(0)
            expect(report.audit.reconciled_by).toBe(ADMIN_EMAIL)
          } finally {
            if (originalKey !== undefined) {
              process.env.CULQI_SECRET_KEY = originalKey
            } else {
              delete process.env.CULQI_SECRET_KEY
            }
          }
        })
      })
    })
  },
})
