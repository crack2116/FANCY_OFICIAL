import type { Metadata } from "next"

import { retrieveCustomer } from "@lib/data/customer"
import { listOrders } from "@lib/data/orders"
import { hasSessionCookie } from "@lib/data/cookies"
import { t } from "@lib/i18n/translations"
import { redirect } from "next/navigation"
import Overview from "@modules/account/components/overview"

export const metadata: Metadata = {
  title: t("account.overview"),
  description: t("account.overview.description"),
  robots: { index: false, follow: false },
}

type Props = {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ reason?: string }>
}

/**
 * Account dashboard.
 *
 * Both reads run in parallel: they need the same session and neither depends on
 * the other. `listOrders` returns the total `count` with the page, so "3 pedidos"
 * comes from the same response that would render the list — there is no second
 * query whose only purpose is to produce a number.
 *
 * NO SESSION — WHY THIS RETURNS `null` INSTEAD OF REDIRECTING
 * `/account` is a parallel-route layout: when `retrieveCustomer()` returns no
 * customer, the LAYOUT renders the `@login` slot instead of this one. This page
 * therefore returns `null` and stays quiet.
 *
 * Redirecting here would be wrong twice over: the layout already decided what to
 * show, and redirecting to `/<countryCode>/account` — the URL that matches this
 * very page — would bounce forever.
 */
export default async function OverviewTemplate(props: Props) {
  const { countryCode } = await props.params
  const { reason } = await props.searchParams

  const [customer, orderResult, hasCookie] = await Promise.all([
    retrieveCustomer(),
    listOrders(1, 0),
    hasSessionCookie(),
  ])

  if (!customer) {
    // A cookie the backend rejects means the session EXPIRED. Say so, once.
    // The `reason` guard makes the redirect self-limiting: the destination URL
    // carries `reason=session-expired`, so re-entering this page finds the guard
    // satisfied and stops. Without it this is an infinite loop.
    //
    // `reason` is a FIXED value defined here, never a URL, so it cannot become an
    // open redirect, and the login form only reacts to the exact value it knows.
    if (hasCookie && reason !== "session-expired") {
      redirect(`/${countryCode}/account?reason=session-expired`)
    }

    return null
  }

  return (
    <Overview
      customer={customer}
      orders={orderResult.state === "ok" ? orderResult.orders : null}
      orderCount={orderResult.state === "ok" ? orderResult.count : 0}
      orderError={orderResult.state === "error" ? orderResult.error : null}
    />
  )
}