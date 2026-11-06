import type { Metadata } from "next"

import { listOrders } from "@lib/data/orders"
import { ORDERS_PAGE_SIZE } from "@lib/util/orders"
import { hasSessionCookie } from "@lib/data/cookies"
import { t } from "@lib/i18n/translations"
import Link from "next/link"
import { redirect } from "next/navigation"
import Divider from "@modules/common/components/divider"
import OrderOverview from "@modules/account/components/order-overview"
import TransferRequestForm from "@modules/account/components/transfer-request-form"

export const metadata: Metadata = {
  title: t("account.orders"),
  description: t("account.orders.description"),
  robots: { index: false, follow: false },
}

type Props = {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ page?: string; reason?: string }>
}

/**
 * "Mis pedidos".
 *
 * PAGINATION
 * Real `limit`/`offset` against `GET /store/orders`, which scopes itself to
 * `req.auth_context.actor_id`. The total `count` comes back with the page, so the
 * pager knows whether a next page exists without a second request.
 *
 * The page parameter is read as a string and coerced, never passed through as-is:
 * `?page=abc` or `?page=-5` must land on page 1, not on a backend query.
 *
 * Without a session this returns `null`; the `/account` layout renders the sign-in
 * slot instead. See `account/@dashboard/page.tsx` for why a redirect here would
 * loop.
 */
export default async function Orders(props: Props) {
  const { countryCode } = await props.params
  const { page, reason } = await props.searchParams

  const parsed = Number.parseInt(page ?? "1", 10)
  const currentPage = Number.isFinite(parsed) && parsed > 0 ? parsed : 1
  const offset = (currentPage - 1) * ORDERS_PAGE_SIZE

  const [result, hasCookie] = await Promise.all([
    listOrders(ORDERS_PAGE_SIZE, offset),
    hasSessionCookie(),
  ])

  if (result.state === "unauthorized") {
    if (hasCookie && reason !== "session-expired") {
      redirect(`/${countryCode}/account?reason=session-expired`)
    }

    return null
  }

  if (result.state === "error") {
    return (
      <div className="w-full" data-testid="orders-page-wrapper">
        <div className="mb-8 flex flex-col gap-y-4">
          <h1 className="text-2xl font-semibold text-fg-base">{t("account.orders")}</h1>
        </div>
        <p role="alert" className="text-base-regular text-rose-500">
          {result.error}
        </p>
      </div>
    )
  }

  const totalPages = Math.max(1, Math.ceil(result.count / ORDERS_PAGE_SIZE))
  const hasPrevious = currentPage > 1
  const hasNext = currentPage < totalPages

  return (
    <div className="w-full" data-testid="orders-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl font-semibold text-fg-base">{t("account.orders")}</h1>
        <p className="text-base-regular text-fg-base">{t("account.orders.body")}</p>
      </div>

      <OrderOverview orders={result.orders} />

      {result.count > ORDERS_PAGE_SIZE ? (
        <>
          <Divider className="mt-8 mb-4" />
          <nav
            className="flex flex-wrap items-center justify-between gap-4"
            aria-label={t("account.orders.paginationLabel")}
            data-testid="orders-pagination"
          >
            {hasPrevious ? (
              <Link
                href={`/${countryCode}/account/orders?page=${currentPage - 1}`}
                className="text-small-regular underline hover:text-fg-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-sm"
                data-testid="orders-previous"
                // `aria-current` is for the item you are on, not the previous
                // page, so this link deliberately does not set it.
                rel="prev"
              >
                {t("account.orders.previous")}
              </Link>
            ) : (
              <span />
            )}
            <span
              className="text-small-regular text-fg-subtle"
              aria-live="polite"
              data-testid="orders-page-status"
            >
              {t("account.orders.pageStatus", { page: currentPage, total: totalPages })}
            </span>
            {hasNext ? (
              <Link
                href={`/${countryCode}/account/orders?page=${currentPage + 1}`}
                className="text-small-regular underline hover:text-fg-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-sm"
                data-testid="orders-next"
                rel="next"
              >
                {t("account.orders.next")}
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </>
      ) : null}

      <Divider className="mb-8 mt-8" />
      <TransferRequestForm />
    </div>
  )
}