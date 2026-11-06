/**
 * `GET /store/customers/me/orders/:id` — order detail for the signed-in
 * customer, with ownership enforced on the server.
 *
 * WHY THIS ROUTE EXISTS
 * Medusa's `GET /store/orders/:id` is intentionally unauthenticated. Its own
 * installed source says so:
 *
 *   "This API route is intentionally unauthenticated as the order ID is a UUID
 *    that requires brute forcing to gain access to. The order ID is used as the
 *    authentication mechanism ... To restrict access to this route, follow the
 *    secure-order-retrieval guide."
 *
 * That is a reasonable choice for a guest confirmation page and an
 * unacceptable one for an account page: inside `/account` the shopper has
 * ALREADY proved who they are with a session, so the id-as-credential
 * shortcut must not be what decides access. Medusa documents this exact route
 * pattern as the fix, and the installed package keeps its own protected reads
 * under `store/customers/me/**` for the same reason.
 *
 * AUTH
 * Authentication is Medusa's, not ours. The core middleware
 * (`dist/api/store/customers/middlewares.js`) registers
 *
 *   authenticate("customer", ["session", "bearer"]) on matcher "/store/customers/me*"
 *
 * which covers this path, and `src/api/middlewares.ts` registers the same
 * middleware explicitly for this matcher so the requirement does not depend on
 * a wildcard in another package. Either way the handler never parses a token and
 * never accepts a customer id from the request: the only identity it uses is
 * `req.auth_context.actor_id`, which the framework sets after verifying the
 * session cookie or the bearer JWT.
 *
 * OWNERSHIP
 * The customer id is part of the QUERY FILTER, not a comparison done after the
 * fact:
 *
 *   filters: { customer_id: actor_id, is_draft_order: false }
 *
 * `getOrderDetailWorkflow` spreads `input.filters` into the query variables
 * alongside `id`, so the filter and the id reach the same query. A row that
 * belongs to someone else is indistinguishable from a row that does not exist,
 * because the database never returns it. This is stronger than fetching by id and
 * comparing `order.customer_id` in JS, and it means there is no code path where
 * another customer's order reaches a response body.
 *
 * WHY THIS WORKFLOW AND NOT `query.graph`
 * `payment_status` and `fulfillment_status` are NOT columns. `Order`'s MikroORM
 * model has no such fields; the columns exist in the table but nothing maps them.
 * Both values are DERIVED in `getOrderDetailWorkflow` by
 * `getLastPaymentStatus(order)` and `getLastFulfillmentStatus(order)` from the
 * order's `payment_collections` and `fulfillments` (see the installed
 * `dist/order/utils/aggregate-status.js`). A plain `query.graph({entity:"order"})`
 * silently returns an order with both fields MISSING.
 *
 * Using the same workflow as the core store routes is therefore the only way to
 * report the same status the shopper would see elsewhere, and it is what makes
 * those two fields non-optional in the response. `items.detail.
 * raw_fulfilled_quantity` is requested explicitly because
 * `getLastFulfillmentStatus` compares it against `raw_quantity` to decide between
 * `fulfilled` and `partially_fulfilled`.
 *
 * 404, NOT 403
 * A wrong-owner result answers **404**, the same status as a non-existent id.
 * The reason is that 403 would confirm the id exists: an attacker walking
 * `order_01M...` ids could use "200 / 403 / 404" as an oracle to enumerate
 * other people's order ids and their creation dates. 404 makes the two cases
 * indistinguishable. This route is the ONLY order read on /account and it
 * answers 404 in both cases, consistently. The workflow itself is configured with
 * `throwIfKeyNotFound: true`, so a non-owner's row raises the same
 * `MedusaError.Types.NOT_FOUND` an absent row does.
 *
 * FIELDS
 * The response is built from an explicit allow-list. It is deliberately NOT
 * `*payments`, and it never returns a payment's `data`, `provider_id`,
 * `raw_response`, session ids or authorization data — this build runs a
 * development payment provider and there is no card data worth returning. The
 * payment information the shopper sees is the collection's own `status` and
 * `amount`, which are safe and honest.
 */

import { MedusaStoreRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { getOrderDetailWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Exactly what the account order detail renders, and nothing more.
 *
 * Order/item/address fields come from the ORDER'S OWN SNAPSHOT, not from
 * today's product: `items.title`, `items.variant_title` and `items.thumbnail`
 * are written when the order is placed and never rewritten. That is what makes
 * a deleted product still render in a two-year-old order.
 */
const ACCOUNT_ORDER_FIELDS = [
  "id",
  "display_id",
  "custom_display_id",
  "status",
  "payment_status",
  "fulfillment_status",
  "email",
  "currency_code",
  "created_at",
  "canceled_at",
  "subtotal",
  "discount_total",
  "gift_card_total",
  "shipping_total",
  "tax_total",
  "original_total",
  "item_total",
  "credit_line_total",
  "total",
  "region_id",
  // Address snapshot. `province` is Medusa's column for what a Peruvian
  // address calls the departamento/región; there is no `district` column.
  "shipping_address.id",
  "shipping_address.first_name",
  "shipping_address.last_name",
  "shipping_address.company",
  "shipping_address.address_1",
  "shipping_address.address_2",
  "shipping_address.city",
  "shipping_address.province",
  "shipping_address.postal_code",
  "shipping_address.country_code",
  "shipping_address.phone",
  "billing_address.id",
  "billing_address.first_name",
  "billing_address.last_name",
  "billing_address.company",
  "billing_address.address_1",
  "billing_address.address_2",
  "billing_address.city",
  "billing_address.province",
  "billing_address.postal_code",
  "billing_address.country_code",
  "billing_address.phone",
  // Shipping method as recorded on the order.
  "shipping_methods.id",
  "shipping_methods.name",
  "shipping_methods.amount",
  "shipping_methods.total",
  "shipping_methods.delivered_at",
  // Item snapshot columns.
  "items.id",
  "items.title",
  "items.subtitle",
  "items.thumbnail",
  "items.variant_id",
  "items.variant_title",
  "items.product_handle",
  "items.product_type",
  "items.product_collection",
  "items.variant_sku",
  "items.quantity",
  // Required by `getLastFulfillmentStatus` to distinguish `fulfilled` from
  // `partially_fulfilled`; without it the derived status can be wrong.
  "items.detail.raw_fulfilled_quantity",
  "items.unit_price",
  "items.subtotal",
  "items.discount_total",
  "items.tax_total",
  "items.total",
  // Payment collections: status and amount only. `payments` is NOT expanded, so
  // no provider payload, card fragment or authorization object can leak.
  "payment_collections.id",
  "payment_collections.status",
  "payment_collections.amount",
  "payment_collections.currency_code",
]

/**
 * `GET /store/customers/me/orders/:id`
 *
 * 401 — no usable customer session (raised by the authenticate middleware).
 * 404 — the id does not exist, or belongs to another customer, or is a draft.
 * 200 — the order, scoped to the caller.
 */
export async function GET(
  req: MedusaStoreRequest,
  res: MedusaResponse
): Promise<void> {
  const customerId = req.auth_context?.actor_id

  // Defensive only: the authenticate middleware already rejects an
  // unauthenticated request with 401. If it ever failed to run we still refuse
  // rather than serving an order to an anonymous caller.
  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Customer authentication is required"
    )
  }

  const { result: order } = await getOrderDetailWorkflow(req.scope).run({
    input: {
      order_id: req.params.id,
      fields: ACCOUNT_ORDER_FIELDS,
      // OWNERSHIP CHECK. These filters travel with the id into the same query,
      // so a row that is not the caller's is never fetched. `is_draft_order`
      // matches the core store routes, so an admin draft cannot be read through
      // the account area.
      filters: {
        customer_id: customerId,
        is_draft_order: false,
      },
    },
  })

  // `throwIfKeyNotFound` is on inside the workflow, so a missing or non-owned
  // order already raised a 404 by this point. This guard only protects against a
  // future change to that option.
  if (!order) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order not found")
  }

  res.status(200).json({ order })
}