import type { Metadata } from "next"

import { retrieveOwnedOrder } from "@lib/data/orders"
import { hasSessionCookie } from "@lib/data/cookies"
import { t } from "@lib/i18n/translations"
import { redirect } from "next/navigation"
import OrderDetailsTemplate from "@modules/order/templates/order-details-template"

type Props = {
  params: Promise<{ countryCode: string; id: string }>
  searchParams: Promise<{ reason?: string }>
}

/**
 * Account order detail.
 *
 * The order comes from `GET /store/customers/me/orders/:id`, the PROTECTED route
 * that resolves the customer from the request's auth context and filters the
 * query by `customer_id`. The public `GET /store/orders/:id` is never called from
 * here.
 *
 * That means this page cannot show another customer's order even if the id is
 * known, and it cannot be made to by anything the browser sends.
 *
 * OUTCOMES
 * - `unauthorized` → the session is gone. Send the shopper to sign in with the
 *   expired-session message; the `reason` guard makes that redirect
 *   self-limiting. If there was no session cookie at all, there is nothing to
 *   explain and the page returns `null` for the layout's sign-in slot.
 * - `not_found`    → either no such order or not theirs. Both answer 404 from the
 *   backend, and both render the same honest "we could not find it" screen, so
 *   the page never becomes an oracle for which ids exist.
 * - `error`        → the read failed. Say so in Spanish; never show the backend's
 *   own error.
 */
async function loadOrder(params: Props["params"]) {
  const { countryCode, id } = await params
  const result = await retrieveOwnedOrder(id)

  return { countryCode, id, result }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { result } = await loadOrder(props.params)

  // `generateMetadata` must not redirect or call `notFound`, so it degrades to a
  // neutral title when the order could not be loaded.
  const number =
    result.state === "found" ? result.order.display_id ?? result.order.id : undefined

  return {
    title: number != null ? t("account.order.title", { id: number }) : t("account.orders"),
    description: t("account.order.description"),
    robots: { index: false, follow: false },
  }
}

export default async function OrderDetailPage(props: Props) {
  const { reason } = await props.searchParams
  const { countryCode, result } = await loadOrder(props.params)

  if (result.state === "unauthorized") {
    const hasCookie = await hasSessionCookie()

    if (hasCookie && reason !== "session-expired") {
      redirect(`/${countryCode}/account?reason=session-expired`)
    }

    return null
  }

  if (result.state === "error") {
    return (
      <div className="w-full" data-testid="order-detail-error">
        <h1 className="text-2xl font-semibold text-fg-base mb-4">
          {t("account.order.error.title")}
        </h1>
        <p role="alert" className="text-base-regular text-rose-500">
          {result.error}
        </p>
      </div>
    )
  }

  if (result.state === "not_found") {
    return (
      <div className="w-full" data-testid="order-detail-not-found">
        <h1 className="text-2xl font-semibold text-fg-base mb-4">
          {t("account.order.notFound.title")}
        </h1>
        <p className="text-base-regular text-fg-base">{t("account.order.notFound.body")}</p>
      </div>
    )
  }

  return <OrderDetailsTemplate order={result.order} />
}