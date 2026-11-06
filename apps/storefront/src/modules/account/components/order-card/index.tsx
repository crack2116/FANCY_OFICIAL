/**
 * One order in the account list.
 *
 * Everything here comes from the order the API returned for THIS customer:
 * `display_id` is the number Medusa shows a shopper, `created_at` is formatted
 * through the single es-PE formatter, and the total goes through the single
 * money formatter. There is no second date or money implementation.
 *
 * The three statuses are shown separately and labelled. They are not merged into
 * one phrase: "Pagado" and "Enviado" describe different things, and collapsing
 * them would hide a cancelled or refunded order behind a reassuring label.
 */

import { HttpTypes } from "@medusajs/types"
import { t } from "@lib/i18n/translations"
import { formatEsPeDate } from "@lib/format/date"
import { convertToLocale } from "@lib/util/money"
import {
  resolveFulfillmentStatus,
  resolveOrderStatus,
  resolvePaymentStatus,
  type StatusTone,
} from "@lib/order-status"
import { Badge, Button } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"

const TONE_TO_BADGE: Record<StatusTone, "green" | "red" | "blue" | "orange" | "grey"> = {
  positive: "green",
  danger: "red",
  info: "blue",
  warning: "orange",
  neutral: "grey",
}

/** Total units across the order's lines, which is what a shopper recognises. */
function unitCount(order: HttpTypes.StoreOrder): number {
  return (order.items ?? []).reduce((total, item) => total + (item.quantity ?? 0), 0)
}

const OrderCard = ({ order }: { order: HttpTypes.StoreOrder }) => {
  const units = unitCount(order)
  const date = formatEsPeDate(order.created_at)

  const orderStatus = resolveOrderStatus(order.status)
  const paymentStatus = resolvePaymentStatus(order.payment_status)
  const fulfillmentStatus = resolveFulfillmentStatus(order.fulfillment_status)

  return (
    <article
      className="bg-white border border-gray-200 rounded-rounded p-5 flex flex-col gap-y-4"
      data-testid="order-card"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <span className="text-large-semi" data-testid="order-display-id">
          {t("account.order.number")} {order.display_id}
        </span>
        {date ? (
          <span className="text-small-regular text-fg-subtle" data-testid="order-created-at">
            {t("account.orders.placedOn")}: {date}
          </span>
        ) : null}
        <span className="text-base-semi" data-testid="order-amount">
          {convertToLocale({
            amount: order.total,
            currency_code: order.currency_code,
          })}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Badge color={TONE_TO_BADGE[orderStatus.tone]} data-testid="order-status">
          {t("account.order.status.order")}: {orderStatus.label}
        </Badge>
        <Badge color={TONE_TO_BADGE[paymentStatus.tone]} data-testid="order-payment-status">
          {t("account.order.status.payment")}: {paymentStatus.label}
        </Badge>
        <Badge color={TONE_TO_BADGE[fulfillmentStatus.tone]} data-testid="order-fulfillment-status">
          {t("account.order.status.fulfillment")}: {fulfillmentStatus.label}
        </Badge>
      </div>

      {order.items && order.items.length > 0 ? (
        <div className="grid grid-cols-3 gap-3" data-testid="order-items-preview">
          {order.items.slice(0, 3).map((item) => (
            <div key={item.id} className="flex flex-col gap-y-1 min-w-0">
              <Thumbnail
                thumbnail={item.thumbnail}
                size="full"
                className="w-full"
                alt={t("account.order.item.imageAlt", { title: item.title })}
              />
              <span
                className="text-small-regular text-ui-fg-base truncate"
                data-testid="item-title"
              >
                {item.title}
              </span>
              <span className="text-compact-small text-ui-fg-muted" data-testid="item-quantity">
                × {item.quantity}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <span className="text-small-regular text-fg-subtle" data-testid="item-count">
          {units === 1
            ? t("account.orders.itemCountOne")
            : t("account.orders.itemCount", { count: units })}
        </span>
        <LocalizedClientLink
          href={`/account/orders/details/${order.id}`}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-sm"
          data-testid="order-details-link"
        >
          <Button variant="secondary">{t("account.orders.viewDetail")}</Button>
        </LocalizedClientLink>
      </div>
    </article>
  )
}

export default OrderCard