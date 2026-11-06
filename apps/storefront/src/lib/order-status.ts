/**
 * Order status vocabulary — the single source of truth for how a Medusa status
 * reads in Spanish.
 *
 * WHY THIS EXISTS
 * An order in Medusa carries THREE independent statuses that mean different
 * things and can disagree with each other:
 *
 *   - `status`             OrderStatus      — the lifecycle of the order itself
 *   - `payment_status`     PaymentStatus    — where the money is
 *   - `fulfillment_status` FulfillmentStatus — where the goods are
 *
 * They are never collapsed into a single shopper phrase such as "En camino".
 * A shopper who sees "En camino" cannot tell whether the order was cancelled,
 * refunded, or merely prepared. Collapsing them would mean inventing a
 * derivation that is only sometimes true, so this module maps each real value
 * to its own label and keeps the three concepts separate.
 *
 * THE ENUMS ARE NOT GUESSED
 * Every key below is a value that actually exists in the installed
 * `@medusajs/types@2.21.2` (`dist/order/common.d.ts`):
 *
 *   OrderStatus       = "pending" | "completed" | "draft" | "archived"
 *                     | "canceled" | "requires_action"
 *   PaymentStatus     = "not_paid" | "awaiting" | "authorized"
 *                     | "partially_authorized" | "captured"
 *                     | "partially_captured" | "partially_refunded"
 *                     | "refunded" | "canceled" | "requires_action"
 *   FulfillmentStatus = "not_fulfilled" | "partially_fulfilled" | "fulfilled"
 *                     | "partially_shipped" | "shipped"
 *                     | "partially_delivered" | "delivered" | "canceled"
 *
 * A value outside those sets falls back to `order.status.fallback`. The maps
 * are `Record<..., TranslationKey>` over the literal enum, so if Medusa adds a
 * status this file stops compiling at that map instead of silently rendering a
 * blank cell — which is the point of typing them instead of using `string`.
 *
 * `tone` is PRESENTATION ONLY (it picks a badge colour). It is a pure function
 * of the same enum value and never changes the text a shopper reads.
 */

import { t, type TranslationKey } from "@lib/i18n/translations"

/** Visual weight of a status. Never carries meaning on its own. */
export type StatusTone = "neutral" | "info" | "positive" | "warning" | "danger"

type StatusEntry = {
  label: TranslationKey
  tone: StatusTone
}

/**
 * Order lifecycle. "Pendiente" is the state a fresh order sits in until the
 * store fulfils it, so it is rendered as info, not as a problem.
 */
const ORDER_STATUS: Record<string, StatusEntry> = {
  pending: { label: "order.status.order.pending", tone: "info" },
  completed: { label: "order.status.order.completed", tone: "positive" },
  draft: { label: "order.status.order.draft", tone: "neutral" },
  archived: { label: "order.status.order.archived", tone: "neutral" },
  canceled: { label: "order.status.order.canceled", tone: "danger" },
  requires_action: { label: "order.status.order.requires_action", tone: "warning" },
}

/** Where the money is. */
const PAYMENT_STATUS: Record<string, StatusEntry> = {
  not_paid: { label: "order.status.payment.not_paid", tone: "warning" },
  awaiting: { label: "order.status.payment.awaiting", tone: "info" },
  authorized: { label: "order.status.payment.authorized", tone: "info" },
  partially_authorized: {
    label: "order.status.payment.partially_authorized",
    tone: "warning",
  },
  captured: { label: "order.status.payment.captured", tone: "positive" },
  partially_captured: {
    label: "order.status.payment.partially_captured",
    tone: "warning",
  },
  partially_refunded: {
    label: "order.status.payment.partially_refunded",
    tone: "info",
  },
  refunded: { label: "order.status.payment.refunded", tone: "neutral" },
  canceled: { label: "order.status.payment.canceled", tone: "danger" },
  requires_action: { label: "order.status.payment.requires_action", tone: "warning" },
}

/** Where the goods are. */
const FULFILLMENT_STATUS: Record<string, StatusEntry> = {
  not_fulfilled: { label: "order.status.fulfillment.not_fulfilled", tone: "neutral" },
  partially_fulfilled: {
    label: "order.status.fulfillment.partially_fulfilled",
    tone: "info",
  },
  fulfilled: { label: "order.status.fulfillment.fulfilled", tone: "info" },
  partially_shipped: { label: "order.status.fulfillment.partially_shipped", tone: "info" },
  shipped: { label: "order.status.fulfillment.shipped", tone: "info" },
  partially_delivered: {
    label: "order.status.fulfillment.partially_delivered",
    tone: "positive",
  },
  delivered: { label: "order.status.fulfillment.delivered", tone: "positive" },
  canceled: { label: "order.status.fulfillment.canceled", tone: "danger" },
}

/**
 * Payment COLLECTION status — a fourth, separate vocabulary.
 *
 * It is NOT `PaymentStatus`: the Payment Collection Module reports
 * "completed"/"failed" where the order reports "captured"/"requires_action".
 * Confusing the two is how a shopper ends up reading "En espera" on a paid
 * order. Values are from `dist/payment/common.d.ts` in the installed types.
 */
const PAYMENT_COLLECTION_STATUS: Record<string, StatusEntry> = {
  not_paid: { label: "order.status.payment.not_paid", tone: "warning" },
  awaiting: { label: "order.status.payment.awaiting", tone: "info" },
  authorized: { label: "order.status.payment.authorized", tone: "info" },
  partially_authorized: {
    label: "order.status.payment.partially_authorized",
    tone: "warning",
  },
  partially_captured: {
    label: "order.status.payment.partially_captured",
    tone: "warning",
  },
  canceled: { label: "order.status.payment.canceled", tone: "danger" },
  failed: { label: "order.status.payment.failed", tone: "danger" },
  completed: { label: "order.status.payment.completed", tone: "positive" },
}

/**
 * Resolve one entry, or `null` when the value is missing or unrecognised.
 * A `null`/undefined status means "the backend did not report one", which is a
 * different situation from "the backend reported a status we do not know", so
 * the caller renders the shared fallback in both cases rather than inventing a
 * label.
 */
function resolve(
  map: Record<string, StatusEntry>,
  status: string | null | undefined
): StatusEntry | null {
  if (!status) {
    return null
  }

  return map[status] ?? null
}

export type ResolvedStatus = {
  label: string
  tone: StatusTone
  /** False when the value was missing or outside the known enum. */
  known: boolean
}

function toResolved(entry: StatusEntry | null): ResolvedStatus {
  if (!entry) {
    return { label: t("order.status.fallback"), tone: "neutral", known: false }
  }

  return { label: t(entry.label), tone: entry.tone, known: true }
}

export function resolveOrderStatus(status: string | null | undefined): ResolvedStatus {
  return toResolved(resolve(ORDER_STATUS, status))
}

export function resolvePaymentStatus(status: string | null | undefined): ResolvedStatus {
  return toResolved(resolve(PAYMENT_STATUS, status))
}

export function resolveFulfillmentStatus(
  status: string | null | undefined
): ResolvedStatus {
  return toResolved(resolve(FULFILLMENT_STATUS, status))
}

export function resolvePaymentCollectionStatus(
  status: string | null | undefined
): ResolvedStatus {
  return toResolved(resolve(PAYMENT_COLLECTION_STATUS, status))
}

/**
 * Every enum value this module knows how to name, in the order Medusa declares
 * them. Exported so a caller (or a future test) can assert coverage without
 * duplicating the list.
 */
export const KNOWN_ORDER_STATUSES = Object.keys(ORDER_STATUS)
export const KNOWN_PAYMENT_STATUSES = Object.keys(PAYMENT_STATUS)
export const KNOWN_FULFILLMENT_STATUSES = Object.keys(FULFILLMENT_STATUS)
export const KNOWN_PAYMENT_COLLECTION_STATUSES = Object.keys(PAYMENT_COLLECTION_STATUS)