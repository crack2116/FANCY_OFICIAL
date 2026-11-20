/**
 * Account dashboard.
 *
 * Displays the customer's real summary cards (orders, profile data, saved
 * addresses, and local browser favorites) plus the customer's most recent order.
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
import { Badge } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import MapPin from "@modules/common/icons/map-pin"
import Package from "@modules/common/icons/package"
import User from "@modules/common/icons/user"
import FavoritesDashboardCard from "./favorites-card"

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
  statusText: string
  hasPositiveValue: boolean
  Icon: React.ComponentType<{ size?: string }>
  testId: string
}

const DashboardCard = ({
  href,
  titleKey,
  bodyKey,
  statusText,
  hasPositiveValue,
  Icon,
  testId,
}: CardProps) => (
  <div
    className="group rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_24px_rgba(15,53,46,0.04)] transition-all duration-150 hover:border-[#FFD8B8] hover:shadow-[0_12px_30px_rgba(243,111,33,0.08)] flex flex-col justify-between gap-5"
    data-testid={testId}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF3E8] text-[#F36F21]">
          <Icon size="21" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-[#0F352E]">{t(titleKey)}</h2>
        </div>
      </div>
      <LocalizedClientLink
        href={href}
        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FFF5EB] px-3 py-1 text-xs font-semibold text-[#D85A0E] transition-colors hover:bg-[#FFE8D6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F36F21]"
        data-testid={`${testId}-link`}
      >
        <span>{t("account.dashboard.action")}</span>
        <span aria-hidden="true">→</span>
      </LocalizedClientLink>
    </div>

    <p className="text-sm text-slate-600 leading-relaxed">{t(bodyKey)}</p>

    <div className="pt-1">
      {hasPositiveValue ? (
        <span className="text-lg font-bold text-[#0F352E] break-words">{statusText}</span>
      ) : (
        <span className="inline-flex items-center rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
          {statusText}
        </span>
      )}
    </div>
  </div>
)

const Overview = ({ customer, orders, orderCount, orderError }: OverviewProps) => {
  const addressCount = customer.addresses?.length ?? 0
  const lastOrder = orders && orders.length > 0 ? orders[0] : null

  const orderStatus = resolveOrderStatus(lastOrder?.status)
  const paymentStatus = resolvePaymentStatus(lastOrder?.payment_status)
  const fulfillmentStatus = resolveFulfillmentStatus(lastOrder?.fulfillment_status)

  const lastOrderDate = lastOrder ? formatEsPeDate(lastOrder.created_at) : null

  const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(" ")
  const phoneText = customer.phone?.trim()
    ? customer.phone.trim()
    : t("account.dashboard.card.profile.emptyPhone")
  const profileStatus = fullName ? `${fullName} · ${phoneText}` : phoneText

  return (
    <div className="flex flex-col gap-y-6" data-testid="overview-page-wrapper">
      <div className="rounded-3xl border border-[#FFE4CC] bg-gradient-to-r from-[#FFF8F1] via-[#FFFDF9] to-white p-6 sm:p-8 shadow-[0_8px_24px_rgba(243,111,33,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-y-1.5 min-w-0">
          <h1
            className="text-2xl sm:text-3xl font-bold text-[#0F352E] tracking-tight"
            data-testid="welcome-message"
          >
            {customer.first_name
              ? t("account.dashboard.greeting", { name: customer.first_name })
              : t("account.dashboard.greeting.anonymous")}
          </h1>
          {customer.email ? (
            <p className="text-sm text-slate-600 truncate">
              {t("account.dashboard.signedInAs", { email: customer.email })}
            </p>
          ) : null}
        </div>
        <LocalizedClientLink
          href="/store"
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#F36F21] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#E05E10]"
        >
          {t("account.menu.viewStore")}
        </LocalizedClientLink>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <DashboardCard
          href="/account/orders"
          titleKey="account.dashboard.card.orders.title"
          bodyKey="account.dashboard.card.orders.body"
          hasPositiveValue={orderCount > 0}
          statusText={
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
          hasPositiveValue={Boolean(customer.phone?.trim())}
          statusText={profileStatus}
          Icon={User}
          testId="dashboard-card-profile"
        />

        <DashboardCard
          href="/account/addresses"
          titleKey="account.dashboard.card.addresses.title"
          bodyKey="account.dashboard.card.addresses.body"
          hasPositiveValue={addressCount > 0}
          statusText={
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

        <FavoritesDashboardCard />
      </div>

      {orderError ? (
        <p role="alert" className="text-small-regular text-rose-500" data-testid="orders-error">
          {orderError}
        </p>
      ) : null}

      {lastOrder ? (
        <section className="flex flex-col gap-y-3" aria-labelledby="last-order-heading">
          <div className="flex items-center justify-between">
            <h2 id="last-order-heading" className="text-lg font-bold text-[#0F352E]">
              {t("account.dashboard.lastOrder.title")}
            </h2>
            <LocalizedClientLink
              href="/account/orders"
              className="text-xs font-semibold text-[#D85A0E] hover:underline"
            >
              {t("account.dashboard.help.cta")} →
            </LocalizedClientLink>
          </div>
          <div
            className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_24px_rgba(15,53,46,0.04)] flex flex-col gap-y-4"
            data-testid="last-order-card"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <span className="text-base font-bold text-[#0F352E]" data-testid="last-order-number">
                {t("account.order.number")} {lastOrder.display_id}
              </span>
              {lastOrderDate ? (
                <span className="text-xs font-medium text-slate-500" data-testid="last-order-date">
                  {t("account.order.date")}: {lastOrderDate}
                </span>
              ) : null}
              <span className="text-base font-bold text-[#0F352E]" data-testid="last-order-total">
                {convertToLocale({
                  amount: lastOrder.total,
                  currency_code: lastOrder.currency_code,
                })}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
                className="inline-flex items-center gap-1 rounded-full bg-[#FFF5EB] px-4 py-1.5 text-xs font-semibold text-[#D85A0E] transition-colors hover:bg-[#FFE8D6]"
                data-testid="last-order-link"
              >
                <span>{t("account.orders.viewDetail")}</span>
                <span aria-hidden="true">→</span>
              </LocalizedClientLink>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}

export default Overview
