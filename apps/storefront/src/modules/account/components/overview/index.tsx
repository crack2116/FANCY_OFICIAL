/**
 * Account dashboard.
 *
 * WHAT IS ON THIS PAGE, AND WHY NOTHING ELSE
 * Three cards (orders, data, addresses) plus the customer's most recent order,
 * and nothing else. There is deliberately no loyalty tier, no points balance,
 * no "you saved S/ X" and no membership level: none of those exist in this
 * build, and a number a shopper cannot verify is worse than an absent one.
 *
 * The two counts are REAL and come from data the page already loaded — the
 * customer's own addresses and the order count returned by the orders API.
 * There is no extra query whose only purpose is to produce a number.
 *
 * The `profile completion` percentage the upstream starter showed was removed:
 * it scored four arbitrary fields out of four and called the result a
 * "completion", which tells a shopper nothing actionable.
 */

import { HttpTypes } from "@medusajs/types"
import { t, type TranslationKey } from "@lib/i18n/translations"
import { formatEsPeDate } from "@lib/format/date"
import { convertToLocale } from "@lib/util/money"
import {
  resolveFulfillmentStatus,
  resolveOrderStatus,
  resolvePaymentStatus,
} from "@lib/order-status"
import { Badge, Container } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import MapPin from "@modules/common/icons/map-pin"
import Package from "@modules/common/icons/package"
import User from "@modules/common/icons/user"

type OverviewProps = {
  customer: HttpTypes.StoreCustomer
  orders: HttpTypes.StoreOrder[] | null
  orderCount: number
  /** Set when the order read failed. The rest of the page still renders. */
  orderError?: string | null
}

/** "3 pedidos" / "1 pedido" — one of the two keys, never "{count} pedido". */
function countLabel(count: number, plural: TranslationKey, one: TranslationKey): string {
  return count === 1 ? t(one) : t(plural, { count })
}

const TONE_TO_BADGE: Record<string, "green" | "red" | "blue" | "orange" | "grey"> = {
  positive: "green",
  danger: "red",
  info: "blue",
  warning: "orange",
  neutral: "grey",
}

type CardProps = {
  href: string
  titleKey: TranslationKey
  bodyKey: TranslationKey
  countLabel: string
  Icon: React.ComponentType<{ size?: string }>
  testId: string
}

const DashboardCard = ({ href, titleKey, bodyKey, countLabel, Icon, testId }: CardProps) => (
  <Container
    className="flex flex-col gap-y-4 h-full justify-between border border-gray-200 shadow-none"
    data-testid={testId}
  >
    <div className="flex items-start justify-between gap-x-4">
      <h2 className="text-large-semi">{t(titleKey)}</h2>
      <Icon size="22" />
    </div>
    <p className="text-small-regular text-fg-subtle">{t(bodyKey)}</p>
    <div className="flex items-end justify-between gap-x-4">
      <span className="text-2xl-semi leading-none">{countLabel}</span>
      <LocalizedClientLink
        href={href}
        className="text-small-regular underline hover:text-fg-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-sm"
        data-testid={`${testId}-link`}
      >
        {t("account.dashboard.action")}
      </LocalizedClientLink>
    </div>
  </Container>
)

const Overview = ({ customer, orders, orderCount, orderError }: OverviewProps) => {
  const addressCount = customer.addresses?.length ?? 0
  // Only the newest order is surfaced, and only when there is one. The list
  // itself lives at /account/orders.
  const lastOrder = orders && orders.length > 0 ? orders[0] : null

  const orderStatus = resolveOrderStatus(lastOrder?.status)
  const paymentStatus = resolvePaymentStatus(lastOrder?.payment_status)
  const fulfillmentStatus = resolveFulfillmentStatus(lastOrder?.fulfillment_status)

  const lastOrderDate = lastOrder ? formatEsPeDate(lastOrder.created_at) : null

  return (
    <div className="flex flex-col gap-y-8" data-testid="overview-page-wrapper">
      <div className="flex flex-col gap-y-1">
        <h1 className="text-2xl font-semibold text-fg-base" data-testid="welcome-message">
          {customer.first_name
            ? t("account.dashboard.greeting", { name: customer.first_name })
            : t("account.dashboard.greeting.anonymous")}
        </h1>
        {customer.email ? (
          <p className="text-small-regular text-fg-subtle">
            {t("account.dashboard.signedInAs", { email: customer.email })}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 medium:grid-cols-3 gap-4">
        <DashboardCard
          href="/account/orders"
          titleKey="account.dashboard.card.orders.title"
          bodyKey="account.dashboard.card.orders.body"
          countLabel={
            orderCount > 0
              ? countLabel(
                  orderCount,
                  "account.dashboard.card.orders.count",
                  "account.dashboard.card.orders.countOne"
                )
              : t("account.dashboard.card.orders.empty")
          }
          Icon={Package}
          testId="dashboard-card-orders"
        />
        <DashboardCard
          href="/account/profile"
          titleKey="account.dashboard.card.profile.title"
          bodyKey="account.dashboard.card.profile.body"
          countLabel={customer.phone ?? t("account.profile.field.phone")}
          Icon={User}
          testId="dashboard-card-profile"
        />
        <DashboardCard
          href="/account/addresses"
          titleKey="account.dashboard.card.addresses.title"
          bodyKey="account.dashboard.card.addresses.body"
          countLabel={
            addressCount > 0
              ? countLabel(
                  addressCount,
                  "account.dashboard.card.addresses.count",
                  "account.dashboard.card.addresses.countOne"
                )
              : t("account.dashboard.card.addresses.empty")
          }
          Icon={MapPin}
          testId="dashboard-card-addresses"
        />
      </div>

      {orderError ? (
        <p role="alert" className="text-small-regular text-rose-500" data-testid="orders-error">
          {orderError}
        </p>
      ) : null}

      {lastOrder ? (
        <section className="flex flex-col gap-y-4" aria-labelledby="last-order-heading">
          <h2 id="last-order-heading" className="text-large-semi">
            {t("account.dashboard.lastOrder.title")}
          </h2>
          <Container
            className="flex flex-col gap-y-4 border border-gray-200 shadow-none"
            data-testid="last-order-card"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <span className="text-base-semi" data-testid="last-order-number">
                {t("account.order.number")} {lastOrder.display_id}
              </span>
              {lastOrderDate ? (
                <span className="text-small-regular text-fg-subtle" data-testid="last-order-date">
                  {t("account.order.date")}: {lastOrderDate}
                </span>
              ) : null}
              <span className="text-base-semi" data-testid="last-order-total">
                {convertToLocale({
                  amount: lastOrder.total,
                  currency_code: lastOrder.currency_code,
                })}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Badge color={TONE_TO_BADGE[orderStatus.tone]} data-testid="last-order-status">
                {t("account.order.status.order")}: {orderStatus.label}
              </Badge>
              <Badge color={TONE_TO_BADGE[paymentStatus.tone]} data-testid="last-order-payment-status">
                {t("account.order.status.payment")}: {paymentStatus.label}
              </Badge>
              <Badge
                color={TONE_TO_BADGE[fulfillmentStatus.tone]}
                data-testid="last-order-fulfillment-status"
              >
                {t("account.order.status.fulfillment")}: {fulfillmentStatus.label}
              </Badge>
            </div>
            <div>
              <LocalizedClientLink
                href={`/account/orders/details/${lastOrder.id}`}
                className="text-small-regular underline hover:text-fg-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-sm"
                data-testid="last-order-link"
              >
                {t("account.orders.viewDetail")}
              </LocalizedClientLink>
            </div>
          </Container>
        </section>
      ) : null}
    </div>
  )
}

export default Overview