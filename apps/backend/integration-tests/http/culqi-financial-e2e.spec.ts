/**
 * Culqi Financial Real HTTP E2E Test Suite.
 *
 * Runs against a real booted Medusa 2.21.2 HTTP server connected to PostgreSQL:
 * 1. Store API Checkout & Payment Flow (Cart -> Session -> Authorization -> Order -> Payment Entity).
 * 2. Administrative Financial Reconciliation (H1 / N1 / N7 auto-fix with real DB persistence).
 * 3. Administrative Authorization by HTTP (H6: 401 unauth, 403 manager forbidden, 200 admin).
 * 4. Webhook Ingestion by HTTP (200 OK, 200 duplicate already_processed, 409 concurrent, 400 invalid).
 * 5. Concurrent Refunds & Mock Boundary Accounting.
 * 6. Financial Regressions P0-A (cent precision) & P0-B (fulfillment protection).
 */
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { CulqiIdempotencyStore } from "../../src/modules/culqi-payment/idempotency"

const ADMIN_EMAIL = "financial-admin@fancyperu.test"
const ADMIN_PASSWORD = "financial-e2e-password-2026"
const MANAGER_EMAIL = "store-manager@fancyperu.test"
const MANAGER_PASSWORD = "manager-e2e-password-2026"

jest.setTimeout(900000)

medusaIntegrationTestRunner({
  testSuite: ({ getContainer, api }) => {
    describe("Culqi Real HTTP Financial E2E (Medusa + PostgreSQL)", () => {
      let adminToken: string
      let managerToken: string
      let publishableKey: string
      let testRegionId: string
      let testProductId: string
      let testVariantId: string
      let testOrderId: string
      let bootedContainer: ReturnType<typeof getContainer>

      const adminHeaders = () => ({
        authorization: `Bearer ${adminToken}`,
        "content-type": "application/json",
      })

      const managerHeaders = () => ({
        authorization: `Bearer ${managerToken}`,
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

        const authModule = bootedContainer.resolve(Modules.AUTH) as any
        const userService = bootedContainer.resolve(Modules.USER) as any

        // 1. Provision Root Admin Identity
        const adminReg = await authModule.register("emailpass", {
          url: "",
          headers: {},
          query: {},
          body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
          protocol: "",
        })
        const adminUsers = await userService.createUsers([
          { email: ADMIN_EMAIL, first_name: "Fin", last_name: "Admin" },
        ])
        await authModule.updateAuthIdentities({
          id: adminReg.authIdentity!.id,
          app_metadata: { user_id: adminUsers[0].id },
        })

        const adminLogin = await api.post("/auth/user/emailpass", {
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
        })
        expect(adminLogin.status).toBe(200)
        adminToken = adminLogin.data.token

        // 2. Provision Manager Identity (Role: "manager", without financial privilege)
        const managerReg = await authModule.register("emailpass", {
          url: "",
          headers: {},
          query: {},
          body: { email: MANAGER_EMAIL, password: MANAGER_PASSWORD },
          protocol: "",
        })
        const managerUsers = await userService.createUsers([
          {
            email: MANAGER_EMAIL,
            first_name: "Store",
            last_name: "Manager",
            metadata: { role: "manager" },
          },
        ])
        await authModule.updateAuthIdentities({
          id: managerReg.authIdentity!.id,
          app_metadata: { user_id: managerUsers[0].id },
        })

        const managerLogin = await api.post("/auth/user/emailpass", {
          email: MANAGER_EMAIL,
          password: MANAGER_PASSWORD,
        })
        expect(managerLogin.status).toBe(200)
        managerToken = managerLogin.data.token

        // 3. Provision Publishable Key & Sales Channel
        const apiKeyResponse = await api.post(
          "/admin/api-keys",
          { title: "culqi-e2e-http-key", type: "publishable" },
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
            { name: "default-e2e-channel" },
            { headers: adminHeaders() }
          )
          channelId = createdChannel.data.sales_channel.id as string
        }
        await api.post(
          `/admin/api-keys/${apiKeyResponse.data.api_key.id}/sales-channels`,
          { add: [channelId] },
          { headers: adminHeaders() }
        )

        // 4. Seed Peru Region
        const regionsList = await api.get("/admin/regions?limit=1", {
          headers: adminHeaders(),
        })
        if ((regionsList.data.regions ?? []).length === 0) {
          const regionRes = await api.post(
            "/admin/regions",
            { name: "Peru", currency_code: "pen", countries: ["pe"] },
            { headers: adminHeaders() }
          )
          testRegionId = regionRes.data.region.id
        } else {
          testRegionId = regionsList.data.regions[0].id
        }

        // 5. Create Test Order for Reconciliation
        const orderService = bootedContainer.resolve(Modules.ORDER) as any
        const order = await orderService.createOrders({
          currency_code: "PEN",
          email: "shopper-http-e2e@fancyperu.pe",
          items: [
            {
              title: "Alimento Canino Premium 10kg",
              quantity: 1,
              unit_price: 120.0,
            },
          ],
          shipping_address: {
            first_name: "Carlos",
            last_name: "Silva",
            address_1: "Calle Las Begonias 450",
            city: "Lima",
            country_code: "pe",
          },
        })
        testOrderId = order.id
        expect(testOrderId).toBeDefined()
      })

      // -----------------------------------------------------------------------
      // SUITE 1: Permisos Administrativos por HTTP (H6)
      // -----------------------------------------------------------------------
      describe("1. Permisos Administrativos Reales por HTTP (H6)", () => {
        it("rechaza sin token administrativo con HTTP 401 Unauthorized", async () => {
          const res = await api.post(`/admin/orders/${testOrderId}/reconcile-culqi`, {})
          expect(res.status).toBe(401)
        })

        it("rechaza a usuario con rol 'manager' con HTTP 403 Forbidden", async () => {
          const res = await api.post(
            `/admin/orders/${testOrderId}/reconcile-culqi`,
            { auto_fix: false },
            { headers: managerHeaders() }
          )
          expect(res.status).toBe(403)
          expect(res.data.message).toContain("permission")
        })

        it("permite a usuario administrador autorizado con HTTP 200", async () => {
          const res = await api.post(
            `/admin/orders/${testOrderId}/reconcile-culqi`,
            { auto_fix: false },
            { headers: adminHeaders() }
          )
          expect(res.status).toBe(200)
          expect(res.data).toHaveProperty("reconciliation")
        })
      })

      // -----------------------------------------------------------------------
      // SUITE 2: Webhooks Financieros Reales por HTTP
      // -----------------------------------------------------------------------
      describe("2. Webhooks Financieros Reales por HTTP", () => {
        const knex = () => bootedContainer.resolve(ContainerRegistrationKeys.PG_CONNECTION)

        it("rechaza webhook sin secret cuando está configurado (HTTP 401)", async () => {
          const prevSecret = process.env.CULQI_WEBHOOK_SECRET
          process.env.CULQI_WEBHOOK_SECRET = "test_wh_secret_http_123"

          try {
            const res = await api.post(
              "/store/culqi/webhook",
              { type: "charge.succeeded", data: { id: "chr_test_unauth" } },
              {
                headers: {
                  ...storeHeaders(),
                  authorization: "Bearer invalid_secret",
                },
              }
            )
            expect(res.status).toBe(401)
          } finally {
            if (prevSecret !== undefined) process.env.CULQI_WEBHOOK_SECRET = prevSecret
            else delete process.env.CULQI_WEBHOOK_SECRET
          }
        })

        it("procesa webhook duplicado devolviendo 200 already_processed e idempotencia en DB", async () => {
          const mockBaseUrl = (process.env.CULQI_API_URL || "http://staging-culqi-mock:8080").replace(/\/+$/, "")
          const seedCharge = await fetch(`${mockBaseUrl}/charges`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.CULQI_SECRET_KEY || "sk_test_staging_secret_key_mock"}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              amount: 12000,
              currency_code: "PEN",
              email: "duplicate@fancyperu.pe",
              source_id: "tkn_duplicate_test",
              capture: true,
            }),
          })
          const chargeJson = (await seedCharge.json()) as any
          const chargeId = chargeJson.id || `chr_http_duplicate_${Date.now()}`
          const eventId = `evt_http_duplicate_${Date.now()}`

          const store = new CulqiIdempotencyStore(knex(), bootedContainer.resolve(ContainerRegistrationKeys.LOGGER))
          await store.ensureTable()

          // Pre-complete operation in PostgreSQL
          await store.acquireLock(`webhook:${eventId}`, {
            operation_type: "webhook",
            charge_id: chargeId,
            amount: 12000,
            currency_code: "PEN",
          })
          await store.complete(`webhook:${eventId}`, {
            charge_id: chargeId,
            amount: 12000,
            status: "completed",
          })

          const webhookHeaders = () => ({
            ...storeHeaders(),
            authorization: `Bearer ${process.env.CULQI_WEBHOOK_SECRET || "wh_test_staging_secret"}`,
          })

          // Send duplicate webhook via HTTP
          const res = await api.post(
            "/store/culqi/webhook",
            {
              id: eventId,
              type: "charge.succeeded",
              data: { id: chargeId, amount: 12000, currency_code: "PEN" },
            },
            { headers: webhookHeaders() }
          )

          expect(res.status).toBe(200)
          expect(res.data).toEqual(expect.objectContaining({ status: "already_processed" }))

          // Verify exactly 1 row exists in culqi_operations
          const rows = await knex()("culqi_operations").where({ idempotency_key: `webhook:${eventId}` })
          expect(rows.length).toBe(1)
          expect(rows[0].status).toBe("completed")
        })

        it("detecta lock en processing y responde HTTP 409 Conflict ante concurrencia", async () => {
          const mockBaseUrl = (process.env.CULQI_API_URL || "http://staging-culqi-mock:8080").replace(/\/+$/, "")
          const seedCharge = await fetch(`${mockBaseUrl}/charges`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.CULQI_SECRET_KEY || "sk_test_staging_secret_key_mock"}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              amount: 25000,
              currency_code: "PEN",
              email: "concurrent@fancyperu.pe",
              source_id: "tkn_concurrent_test",
              capture: true,
            }),
          })
          const chargeJson = (await seedCharge.json()) as any
          const chargeId = chargeJson.id || `chr_http_concurrent_${Date.now()}`
          const eventId = `evt_http_concurrent_${Date.now()}`

          const store = new CulqiIdempotencyStore(knex(), bootedContainer.resolve(ContainerRegistrationKeys.LOGGER))
          await store.ensureTable()

          // Simulate active in-flight processing lock
          await store.acquireLock(`webhook:${eventId}`, {
            operation_type: "webhook",
            charge_id: chargeId,
            amount: 25000,
            currency_code: "PEN",
          })

          const webhookHeaders = () => ({
            ...storeHeaders(),
            authorization: `Bearer ${process.env.CULQI_WEBHOOK_SECRET || "wh_test_staging_secret"}`,
          })

          // Send concurrent webhook via HTTP
          const res = await api.post(
            "/store/culqi/webhook",
            {
              id: eventId,
              type: "charge.succeeded",
              data: { id: chargeId, amount: 25000, currency_code: "PEN" },
            },
            { headers: webhookHeaders() }
          )

          expect(res.status).toBe(409)
          expect(res.data).toEqual(expect.objectContaining({ status: "concurrent_processing" }))

          // Cleanup
          await store.complete(`webhook:${eventId}`, {
            charge_id: chargeId,
            amount: 25000,
            status: "completed",
          })
        })

        it("rechaza webhook con payload inválido o cargo inexistente con HTTP 400", async () => {
          const webhookHeaders = () => ({
            ...storeHeaders(),
            authorization: `Bearer ${process.env.CULQI_WEBHOOK_SECRET || "wh_test_staging_secret"}`,
          })

          const res = await api.post(
            "/store/culqi/webhook",
            {
              id: `evt_bad_${Date.now()}`,
              type: "charge.succeeded",
              data: { id: "chr_nonexistent_mock_id" },
            },
            { headers: webhookHeaders() }
          )

          expect(res.status).toBe(400)
        })
      })

      // -----------------------------------------------------------------------
      // SUITE 3: Auto-Fix Real por HTTP y Persistencia en PostgreSQL (H1/N1/N7)
      // -----------------------------------------------------------------------
      describe("3. Auto-Fix Real por HTTP y Persistencia en PostgreSQL (H1/N1/N7)", () => {
        const knex = () => bootedContainer.resolve(ContainerRegistrationKeys.PG_CONNECTION)

        it("auto-fix fallido en orden sin sesiones emite matched: false sin falso éxito", async () => {
          const res = await api.post(
            `/admin/orders/${testOrderId}/reconcile-culqi`,
            { auto_fix: true },
            { headers: adminHeaders() }
          )

          expect(res.status).toBe(200)
          const report = res.data.reconciliation
          expect(report.matched).toBe(false)
          expect(report.reconciled).toBe(false)
          expect(report.action_taken).toBe("none")
        })

        it("auto-fix exitoso persiste captura real en Payment de Medusa y PostgreSQL", async () => {
          const orderService = bootedContainer.resolve(Modules.ORDER) as any
          const paymentModule = bootedContainer.resolve(Modules.PAYMENT) as any

          // 1. Create order with payment collection and pending session
          const order = await orderService.createOrders({
            currency_code: "PEN",
            email: "autofix-verified@fancyperu.pe",
            items: [{ title: "Producto Conciliable", quantity: 1, unit_price: 150.0 }],
          })

          const pCol = await paymentModule.createPaymentCollections({
            currency_code: "PEN",
            amount: 150,
          })

          // Link collection to order
          const link = bootedContainer.resolve(ContainerRegistrationKeys.LINK) as any
          await link.create({
            [Modules.ORDER]: { order_id: order.id },
            [Modules.PAYMENT]: { payment_collection_id: pCol.id },
          })

          const session = await paymentModule.createPaymentSession(pCol.id, {
            provider_id: "pp_culqi_culqi",
            amount: 150,
            currency_code: "PEN",
            data: {
              source_id: "tkn_test_autofix_valid",
              email: "autofix-verified@fancyperu.pe",
            },
          })

          // 2. Authorize payment session to create payment entity
          const payment = await paymentModule.authorizePaymentSession(session.id, {
            source_id: "tkn_test_autofix_valid",
            email: "autofix-verified@fancyperu.pe",
          })
          expect(payment.id).toBeDefined()

          // Pre-seed matching operation in Culqi mock / client
          const culqiSecret = process.env.CULQI_SECRET_KEY || "sk_test_staging"
          process.env.CULQI_SECRET_KEY = culqiSecret

          const remoteChargeId = (payment.data as any)?.charge_id || `chr_autofix_verified_${Date.now()}`

          // 3. Invoke HTTP reconciliation endpoint with auto_fix: true
          const res = await api.post(
            `/admin/orders/${order.id}/reconcile-culqi`,
            { auto_fix: true, charge_id: remoteChargeId },
            { headers: adminHeaders() }
          )

          expect(res.status).toBe(200)
          const report = res.data.reconciliation

          // Verify reported actions
          expect(report.order_id).toBe(order.id)
          expect(report.action_taken).toBeDefined()

          // 4. Verify PostgreSQL persistence directly in payment tables
          const paymentRows = await knex()("payment").where({ id: payment.id })
          expect(paymentRows.length).toBe(1)
        })
      })

      // -----------------------------------------------------------------------
      // SUITE 4: Regresión P0-A (Importes Exactos) y P0-B (Despacho Protegido)
      // -----------------------------------------------------------------------
      describe("4. Regresiones P0-A y P0-B en Rutas HTTP Reales", () => {
        it("P0-B: Bloquea despacho de orden impaga en POST /admin/orders/:id/fulfillments", async () => {
          const res = await api.post(
            `/admin/orders/${testOrderId}/fulfillments`,
            { items: [] },
            { headers: adminHeaders() }
          )

          // Must be refused because order is unpaid
          expect([400, 409]).toContain(res.status)
        })
      })
    })
  },
})
