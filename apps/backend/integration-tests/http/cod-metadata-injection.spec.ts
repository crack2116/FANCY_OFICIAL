/**
 * P0-B definitive closure - integration test (HTTP).
 *
 * Reproduces the audited attack end to end: a buyer writes the reserved
 * authorization shapes into cart / order metadata and tries to get an unpaid
 * order fulfilled without ever contacting an admin.
 *
 * Layers verified here (against a real booted Medusa app):
 * 1. Ingestion - POST /store/carts and POST /store/carts/:id strip the
 *    reserved keys (`fancyperu_cod`, `manual_payment_status`,
 *    `manual_payment_audit_trail`) while keeping legitimate metadata.
 * 2. Gate - an order whose metadata carries the buyer-forged shapes (what
 *    Medusa core 2.21.2 produces when cart metadata survives to the order,
 *    @medusajs/core-flows/dist/cart/workflows/complete-cart.js:454) is
 *    REFUSED for fulfillment (400 [RESTRICTION]) with no payment captured.
 * 3. Route - POST /admin/orders/:id/authorize-cod with a REAL admin login
 *    writes a server-signed fancyperu_cod (HMAC, remediation over injected
 *    markers), is idempotent-by-rejection, refuses canceled orders and
 *    unauthenticated calls; after authorization the same fulfillment attempt
 *    no longer hits the [RESTRICTION] guard.
 *
 * Orders are created through the Order module (real rows in the test
 * database) instead of driving the full storefront checkout, which requires
 * region/product/inventory seed data this focused spec does not need: the
 * security assertions live in the ingestion middleware, the gate middleware
 * and the authorize route, all of which run on real HTTP requests.
 */
import { Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"

const ADMIN_EMAIL = "cod-authorizer-p0b@fancyperu.test"
const ADMIN_PASSWORD = "p0b-integration-password"
const BUYER_EMAIL = "buyer-p0b@fancyperu.test"

const FORGED_CART_METADATA = {
  fancyperu_cod: {
    authorized_by: "hacker",
    authorized_at: "2026-10-17T00:00:00.000Z",
  },
  manual_payment_status: "verified_and_captured",
  manual_payment_audit_trail: [{ action: "fake" }],
  keep_me: "yes",
}

const FORGED_ORDER_METADATA = {
  fancyperu_cod: {
    authorized_by: "auto_injected",
    authorized_at: "2026-10-17T00:00:00.000Z",
  },
  manual_payment_status: "verified_and_captured",
  keep_me: "safe-now",
}

type EmailPassRegisterResult = {
  success: boolean
  error?: string
  authIdentity?: { id: string }
}

type AuthTestService = {
  register: (provider: string, data: Record<string, unknown>) => Promise<EmailPassRegisterResult>
  updateAuthIdentities: (data: { id: string; app_metadata?: Record<string, unknown> }) => Promise<unknown>
}

type UserTestService = {
  createUsers: (data: Array<Record<string, unknown>>) => Promise<Array<{ id: string }>>
}

type OrderTestService = {
  createOrders: (data: Record<string, unknown>) => Promise<{ id: string }>
  createOrderLineItems: (
    orderId: string,
    items: Array<Record<string, unknown>>
  ) => Promise<Array<{ id: string; quantity: number }>>
  updateOrders: (data: Array<Record<string, unknown>>) => Promise<unknown>
}

jest.setTimeout(900000)

medusaIntegrationTestRunner({
  testSuite: ({ getContainer, api }) => {
    describe("P0-B: buyer metadata injection cannot self-authorize COD dispatch", () => {
      let adminToken: string
      let publishableKey: string
      let bootedContainer: ReturnType<typeof getContainer>

      beforeAll(async () => {
        bootedContainer = getContainer()

        // The runner's api helper is a bare axios instance. Make every HTTP
        // status observable so the assertions below can verify the 400/401
        // contract responses instead of aborting on AxiosError.
        const apiDefaults = (api as unknown as {
          defaults: { validateStatus?: (status: number) => boolean }
        }).defaults
        apiDefaults.validateStatus = () => true

        // Real admin identity: emailpass provider registration + user actor,
        // bound exactly the way the core login route reads actor_id back
        // (auth identity app_metadata.user_id).
        const authModule = bootedContainer.resolve(Modules.AUTH) as unknown as AuthTestService
        const registration = await authModule.register("emailpass", {
          url: "",
          headers: {},
          query: {},
          body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
          protocol: "",
        })
        expect(registration.success).toBe(true)
        expect(registration.authIdentity).toBeDefined()

        const userService = bootedContainer.resolve(Modules.USER) as unknown as UserTestService
        const admins = await userService.createUsers([
          { email: ADMIN_EMAIL, first_name: "P0B Authorizer" },
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
        expect(typeof login.data.token).toBe("string")
        adminToken = login.data.token

        // Provision a publishable api key and link it to a sales channel:
        // Medusa v2 core requires x-publishable-api-key on every /store route
        // and the runner database starts without any keys or storefront link.
        const apiKeyResponse = await api.post(
          "/admin/api-keys",
          { title: "p0b-publishable-key", type: "publishable" },
          { headers: adminHeaders() }
        )
        expect(apiKeyResponse.status).toBe(200)
        publishableKey = String(apiKeyResponse.data.api_key?.token ?? "")
        expect(publishableKey.length).toBeGreaterThan(0)

        const salesChannelsList = await api.get("/admin/sales-channels?limit=1", {
          headers: adminHeaders(),
        })
        expect(salesChannelsList.status).toBe(200)
        let channelId = salesChannelsList.data.sales_channels?.[0]?.id as string | undefined
        if (!channelId) {
          const createdChannel = await api.post(
            "/admin/sales-channels",
            { name: "p0b-sales-channel" },
            { headers: adminHeaders() }
          )
          expect(createdChannel.status).toBe(200)
          channelId = createdChannel.data.sales_channel.id as string
        }
        const linked = await api.post(
          `/admin/api-keys/${apiKeyResponse.data.api_key.id}/sales-channels`,
          { add: [channelId] },
          { headers: adminHeaders() }
        )
        expect(linked.status).toBe(200)

        // Cart creation resolves the region from the database (an empty list
        // surfaces as "No regions found" / 404 from POST /store/carts), and the
        // runner database starts without regions: seed a minimal one.
        const regionsList = await api.get("/admin/regions?limit=1", {
          headers: adminHeaders(),
        })
        expect(regionsList.status).toBe(200)
        if ((regionsList.data.regions ?? []).length === 0) {
          const createdRegion = await api.post(
            "/admin/regions",
            { name: "p0b-region", currency_code: "pen", countries: ["pe"] },
            { headers: adminHeaders() }
          )
          expect(createdRegion.status).toBe(200)
        }
      })

      const adminHeaders = () => ({ authorization: `Bearer ${adminToken}` })

      // ...and this is the publishable-key header the store routes demand.
      const storeHeaders = () => ({ "x-publishable-api-key": publishableKey })

      async function createOrderWithMetadata(metadata?: Record<string, unknown>) {
        const orderService = bootedContainer.resolve(Modules.ORDER) as unknown as OrderTestService
        const order = await orderService.createOrders({
          email: BUYER_EMAIL,
          currency_code: "PEN",
          metadata: metadata ?? {},
        })
        // Real line item so the core fulfillment validator (items.min(1))
        // lets the request reach the project's fulfillment gate.
        const items = await orderService.createOrderLineItems(order.id, [
          { title: "P0B test item", quantity: 1, unit_price: 1000 },
        ])
        return { order, items }
      }

      const fulfillmentBody = (items: Array<{ id: string; quantity: number }>) => ({
        items: items.map((item) => ({
          id: item.id,
          // Order-module create responses are allowed to omit quantity on
          // items; the fulfillment validator requires it on every row.
          quantity: Number(item.quantity ?? 1),
        })),
      })

      describe("ingestion: reserved keys are stripped from store cart writes", () => {
        it("POST /store/carts keeps legitimate metadata and drops the reserved keys", async () => {
          const response = await api.post(
            "/store/carts",
            { metadata: FORGED_CART_METADATA },
            { headers: storeHeaders() }
          )

          expect(response.status).toBe(200)
          expect(response.data.cart.metadata).toEqual({ keep_me: "yes" })
        })

        it("POST /store/carts/:id keeps legitimate metadata and drops the reserved keys", async () => {
          const created = await api.post("/store/carts", {}, { headers: storeHeaders() })
          expect(created.status).toBe(200)

          const updated = await api.post(
            `/store/carts/${created.data.cart.id}`,
            {
              metadata: FORGED_CART_METADATA,
            },
            { headers: storeHeaders() }
          )

          expect(updated.status).toBe(200)
          expect(updated.data.cart.metadata).toEqual({ keep_me: "yes" })
        })
      })

      describe("gate: forged order metadata never unlocks fulfillment", () => {
        it("blocks fulfillment of an unpaid order with buyer-forged COD and manual-payment metadata", async () => {
          const { order, items } = await createOrderWithMetadata(FORGED_ORDER_METADATA)

          const response = await api.post(
            `/admin/orders/${order.id}/fulfillments`,
            fulfillmentBody(items),
            { headers: adminHeaders() }
          )

          expect(response.status).toBe(400)
          expect(String(response.data?.message ?? "")).toContain("[RESTRICTION]")
        })

        it("exposes the order metadata (as if copied by the core) but the gate still blocks it", async () => {
          const { order, items } = await createOrderWithMetadata(FORGED_ORDER_METADATA)

          const read = await api.get(`/admin/orders/${order.id}?fields=+metadata`, {
            headers: adminHeaders(),
          })
          expect(read.status).toBe(200)
          const metadata = read.data.order.metadata as Record<string, unknown> | null
          expect(metadata).toEqual(
            expect.objectContaining({ manual_payment_status: "verified_and_captured" })
          )

          const fulfillment = await api.post(
            `/admin/orders/${order.id}/fulfillments`,
            fulfillmentBody(items),
            { headers: adminHeaders() }
          )
          expect(fulfillment.status).toBe(400)
          expect(String(fulfillment.data?.message ?? "")).toContain("[RESTRICTION]")
        })
      })

      describe("authorize-cod route with a real admin login", () => {
        it("requires an authenticated admin (401 without a bearer token)", async () => {
          const { order } = await createOrderWithMetadata()

          const response = await api.post(`/admin/orders/${order.id}/authorize-cod`, {})

          expect(response.status).toBe(401)
        })

        it("authorizes a metadata-injection remnant: overwrites the forged marker with a signed one", async () => {
          const { order, items } = await createOrderWithMetadata(FORGED_ORDER_METADATA)

          const first = await api.post(`/admin/orders/${order.id}/authorize-cod`, {}, { headers: adminHeaders() })
          expect(first.status).toBe(200)
          expect(first.data.cod.status).toBe("authorized")

          const read = await api.get(`/admin/orders/${order.id}?fields=+metadata,items.quantity`, {
            headers: adminHeaders(),
          })
          const metadata = read.data.order.metadata as Record<string, unknown>
          const cod = metadata.fancyperu_cod as {
            authorized_by: string
            authorized_signature?: string
          }
          expect(cod.authorized_by).toBe(ADMIN_EMAIL)
          expect(cod.authorized_signature ?? "").toHaveLength(64)

          const fulfillment = await api.post(
            `/admin/orders/${order.id}/fulfillments`,
            fulfillmentBody(items),
            { headers: adminHeaders() }
          )
          expect(String(fulfillment.data?.message ?? "")).not.toContain("[RESTRICTION]")
        })

        it("rejects a second authorization of the same order (idempotent by rejection)", async () => {
          const { order } = await createOrderWithMetadata()

          const first = await api.post(`/admin/orders/${order.id}/authorize-cod`, {}, { headers: adminHeaders() })
          expect(first.status).toBe(200)

          const second = await api.post(`/admin/orders/${order.id}/authorize-cod`, {}, { headers: adminHeaders() })
          expect(second.status).toBe(400)
          expect(String(second.data?.message ?? "")).toContain("already authorized")
        })

        it("never authorizes canceled orders", async () => {
          const { order } = await createOrderWithMetadata()
          const orderService = bootedContainer.resolve(Modules.ORDER) as unknown as OrderTestService
          await orderService.updateOrders([{ id: order.id, status: "canceled" }])

          const response = await api.post(`/admin/orders/${order.id}/authorize-cod`, {}, { headers: adminHeaders() })

          expect(response.status).toBe(400)
          expect(String(response.data?.message ?? "")).toContain("canceled")
        })
      })
    })
  },
})
