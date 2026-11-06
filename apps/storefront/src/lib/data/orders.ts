/**
 * Order reads.
 *
 * CACHE POLICY — read this before changing a `cache:` value here.
 *
 * Every read in this file returns AUTHENTICATED, PER-CUSTOMER data. Upstream
 * the starter fetched all of it with `cache: "force-cache"` plus a shared
 * `next` tag, which is a cross-user cache leak:
 *
 *   - `force-cache` writes the response into Next's shared Data Cache, keyed by
 *     URL + fetch options. `/store/orders` and `/store/orders/<id>` are the
 *     same URL for every shopper, so one response could be replayed to
 *     whoever asked next.
 *   - The `next` tag came from `getCacheTag("orders")`, which is
 *     `orders-<_medusa_cache_id>`. That cookie is per BROWSER, not per user, so
 *     two different customers signing in and out on the same browser shared one
 *     tag and one cache entry: Customer A's order list could be served to
 *     Customer B, and `revalidateTag` after a write could not separate them.
 *
 * The fix is `cache: "no-store"` on every authenticated read here. It is not a
 * performance compromise that was traded away for correctness:
 * `getAuthHeaders()` calls `cookies()`, which already opts the render into
 * dynamic behaviour, so `force-cache` was never able to serve a static page
 * for a signed-in shopper anyway. The Data Cache bought nothing and could only
 * leak. Account and order data is per-request; public, shareable catalogue data
 * (products, regions, collections) keeps its tagged caching elsewhere.
 */

"use server"

import { sdk } from "@lib/config"
import { classifyError, inspectError, publicErrorMessage } from "@lib/errors/public-error"
import { t } from "@lib/i18n/translations"
import medusaError from "@lib/util/medusa-error"
import { ORDERS_PAGE_SIZE } from "@lib/util/orders"
import { getAuthHeaders } from "./cookies"
import { HttpTypes } from "@medusajs/types"

// `ORDERS_PAGE_SIZE` is imported, not re-exported: this is a `"use server"`
// file, which may only export async functions. Its home and the reason are
// documented in `@lib/util/orders`.

/**
 * `GET /store/customers/me/orders/:id` — the OWNERSHIP-ENFORCED order detail.
 *
 * The public `GET /store/orders/:id` is deliberately NOT used here. Medusa
 * leaves it unauthenticated on purpose (its own comment in the installed
 * `dist/api/store/orders/[id]/route.js` says the order UUID is the credential),
 * so calling it from an account page would rely on knowing the id, which is
 * exactly the guarantee the account area must not make.
 *
 * The protected route resolves the customer from the request's auth context,
 * queries the order by `id` AND `customer_id` server-side, and answers 404 when
 * the order is not the caller's. Ownership is therefore never decided in
 * React and never depends on anything the browser sends.
 */
export type ProtectedOrderResult =
  | { state: "found"; order: HttpTypes.StoreOrder }
  | { state: "not_found" }
  | { state: "unauthorized" }
  | { state: "error"; error: string }

export async function retrieveOwnedOrder(
  id: string
): Promise<ProtectedOrderResult> {
  const headers = await getAuthHeaders()

  // No token at all: nothing to authorise. Returning `unauthorized` lets the
  // page show the expired-session message instead of a misleading 404.
  if (!("authorization" in headers)) {
    return { state: "unauthorized" }
  }

  if (!id.trim()) {
    return { state: "not_found" }
  }

  try {
    const { order } = await sdk.client.fetch<HttpTypes.StoreOrderResponse>(
      `/store/customers/me/orders/${encodeURIComponent(id)}`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    )

    if (!order) {
      return { state: "not_found" }
    }

    return { state: "found", order }
  } catch (error) {
    // `inspectError` is the safe diagnostic surface: it returns the HTTP status
    // without touching the response body, which can carry SQL or a stack.
    //
    // 401 means "no usable session" -> the expired-session message.
    // 404 means "no such order, or not yours" -> the same honest screen either
    // way, so probing cannot tell the two apart.
    //
    // The 404 case is easy to get wrong: `classifyError` has no NOT_FOUND code,
    // so without an explicit status check a wrong-owner order would fall through
    // to `error` and the shopper would be told the page failed to load rather
    // than that the order is not theirs.
    const { code, status } = inspectError(error)

    if (status === 404) {
      return { state: "not_found" }
    }

    if (code === "AUTH_SESSION_EXPIRED") {
      return { state: "unauthorized" }
    }

    return {
      state: "error",
      error: publicErrorMessage(error, t("account.orders.loadError")),
    }
  }
}

/**
 * One page of the signed-in customer's orders.
 *
 * `GET /store/orders` scopes itself to `req.auth_context.actor_id` in the
 * installed `dist/api/store/orders/route.js`, so an authenticated listing never
 * returns another customer's order. The fields are requested explicitly
 * because the store route's default field list does not include the item
 * relations the account list renders.
 */
export type OrderListResult =
  | {
      state: "ok"
      orders: HttpTypes.StoreOrder[]
      count: number
      limit: number
      offset: number
    }
  | { state: "unauthorized" }
  | { state: "error"; error: string }

export async function listOrders(
  limit: number = ORDERS_PAGE_SIZE,
  offset: number = 0
): Promise<OrderListResult> {
  const headers = await getAuthHeaders()

  if (!("authorization" in headers)) {
    return { state: "unauthorized" }
  }

  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)
  const safeOffset = Math.max(Math.trunc(offset), 0)

  try {
    const response = await sdk.client.fetch<HttpTypes.StoreOrderListResponse>(
      "/store/orders",
      {
        method: "GET",
        query: {
          limit: safeLimit,
          offset: safeOffset,
          order: "-created_at",
          fields: "*items,*items.variant",
        },
        headers,
        cache: "no-store",
      }
    )

    return {
      state: "ok",
      orders: response.orders ?? [],
      count: typeof response.count === "number" ? response.count : (response.orders?.length ?? 0),
      limit: typeof response.limit === "number" ? response.limit : safeLimit,
      offset: typeof response.offset === "number" ? response.offset : safeOffset,
    }
  } catch (error) {
    if (classifyError(error) === "AUTH_SESSION_EXPIRED") {
      return { state: "unauthorized" }
    }

    return {
      state: "error",
      error: publicErrorMessage(error, t("account.orders.loadError")),
    }
  }
}

/**
 * The newest order, or `null` when the customer has none.
 *
 * Reuses the same request the dashboard already needs rather than adding a
 * second query just to have a "last order" widget.
 */
export async function retrieveLatestOrder(): Promise<HttpTypes.StoreOrder | null> {
  const result = await listOrders(1, 0)

  return result.state === "ok" ? (result.orders[0] ?? null) : null
}

/**
 * `GET /store/orders/:id` — the PUBLIC, UNAUTHENTICATED order read.
 *
 * Used ONLY by the guest confirmation flow
 * (`/[countryCode]/order/[id]/confirmed`) and by the transfer pages, where the
 * shopper is not signed in and there is no session to scope the read to. The
 * account order detail uses `retrieveOwnedOrder` instead.
 *
 * Still `no-store`: an order confirmation is per-visitor and the shared Data
 * Cache must never hold a customer's order payload, not even for the minutes a
 * guest page happens to be open.
 */
export const retrieveOrder = async (
  id: string
): Promise<HttpTypes.StoreOrder> => {
  return sdk.client
    .fetch<HttpTypes.StoreOrderResponse>(`/store/orders/${encodeURIComponent(id)}`, {
      method: "GET",
      query: {
        fields:
          "*payment_collections,*items,*items.variant,*shipping_address,*billing_address",
      },
      cache: "no-store",
    })
    .then(({ order }) => order)
    .catch((err) => medusaError(err))
}

/**
 * Order-ownership transfer.
 *
 * Medusa lets a signed-in customer hand an order to another account by
 * requesting the transfer; the current owner's email receives a link. This is
 * the only supported way to attach an order placed as a guest to an account, so
 * it stays available on the orders page.
 *
 * `requestTransfer` is authenticated in the installed
 * `dist/api/store/orders/middlewares.js`, which is why it reads the same auth
 * headers as every other order call.
 */
export const createTransferRequest = async (
  _state: {
    success: boolean
    error: string | null
    order: HttpTypes.StoreOrder | null
  },
  formData: FormData
): Promise<{
  success: boolean
  error: string | null
  order: HttpTypes.StoreOrder | null
}> => {
  const id = (formData.get("order_id") as string | null)?.trim()

  if (!id) {
    return {
      success: false,
      error: t("order.transfer.error.missingId"),
      order: null,
    }
  }

  const headers = await getAuthHeaders()

  return await sdk.store.order
    .requestTransfer(
      id,
      {},
      {
        fields: "id, email",
      },
      headers
    )
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({
      success: false,
      error: publicErrorMessage(err, t("order.transfer.error")),
      order: null,
    }))
}

/**
 * Accept or decline an incoming transfer from the link in the owner's inbox.
 *
 * Both routes are intentionally UNAUTHENTICATED in the installed middleware
 * list (the token in the URL is the credential), so they deliberately send no
 * auth headers — sending one would not help and would tie a link to the browser
 * that opened it.
 */
export const acceptTransferRequest = async (id: string, token: string) => {
  return await sdk.store.order
    .acceptTransfer(id, { token }, {})
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({
      success: false,
      error: publicErrorMessage(err, t("order.transfer.error")),
      order: null,
    }))
}

export const declineTransferRequest = async (id: string, token: string) => {
  return await sdk.store.order
    .declineTransfer(id, { token }, {})
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({
      success: false,
      error: publicErrorMessage(err, t("order.transfer.error")),
      order: null,
    }))
}

/**
 * Submit customer transaction reference for manual payment (Yape / Plin / BCP).
 */
export async function submitManualPaymentReference(
  orderId: string,
  reference: string,
  paymentMethod: string = "transferencia",
  email?: string,
  token?: string
) {
  const headers: Record<string, string> = {
    ...(await getAuthHeaders()),
    "Content-Type": "application/json",
  }

  if (token) {
    headers["x-order-token"] = token
  }

  const backendUrl = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
  try {
    const res = await fetch(`${backendUrl}/store/orders/${orderId}/manual-payment`, {
      method: "POST",
      headers,
      body: JSON.stringify({ reference, payment_method: paymentMethod, email, token }),
      cache: "no-store",
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { success: false, error: data.message || "No se pudo registrar la referencia" }
    }

    return { success: true, message: data.message }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error de conexión al registrar referencia",
    }
  }
}