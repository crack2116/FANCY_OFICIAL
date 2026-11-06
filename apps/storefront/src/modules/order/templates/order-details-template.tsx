/**
 * Order detail for the signed-in shopper.
 *
 * A SERVER component on purpose. The order arrives already authorised from
 * `GET /store/customers/me/orders/:id`, which verifies ownership on the
 * backend; there is nothing here for the browser to decide and nothing to
 * protect by hiding it in React. Shipping zero JavaScript for this page also
 * means it works before hydration, which matters most for the page a shopper
 * lands on from an email.
 *
 * SECTIONS
 * Header (number, date, email, the three statuses), the items as cards, the
 * totals, the delivery block, the payment block and the fulfillment block.
 * Every block renders only what exists — no invented courier, no invented
 * tracking number.
 */

import { HttpTypes } from "@medusajs/types"
import { t } from "@lib/i18n/translations"
import { formatEsPeDate } from "@lib/format/date"
import {
  resolveFulfillmentStatus,
  resolveOrderStatus,
  resolvePaymentStatus,
  type StatusTone,
} from "@lib/order-status"
import { Badge, Heading } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import BackArrow from "@modules/common/icons/back"
import Divider from "@modules/common/components/divider"
import OrderItems from "@modules/order/components/order-items"
import OrderTotals from "@modules/order/components/order-totals"
import OrderDelivery from "@modules/order/components/order-delivery"
import OrderPayment from "@modules/order/components/order-payment"
import OrderFulfillment from "@modules/order/components/order-fulfillment"

const TONE_TO_BADGE: Record<StatusTone, "green" | "red" | "blue" | "orange" | "grey"> = {
  positive: "green",
  danger: "red",
  info: "blue",
  warning: "orange",
  neutral: "grey",
}

type OrderDetailsTemplateProps = {
  order: HttpTypes.StoreOrder
}

const OrderDetailsTemplate = ({ order }: OrderDetailsTemplateProps) => {
  const date = formatEsPeDate(order.created_at)

  const orderStatus = resolveOrderStatus(order.status)
  const paymentStatus = resolvePaymentStatus(order.payment_status)
  const fulfillmentStatus = resolveFulfillmentStatus(order.fulfillment_status)

  return (
    <div className="flex flex-col justify-center gap-y-4" data-testid="order-details-container">
      <div className="flex gap-2 justify-between items-center">
        <h1 className="text-2xl font-semibold text-fg-base">
          {t("account.order.heading")}
        </h1>
        <LocalizedClientLink
          href="/account/orders"
          className="flex gap-2 items-center text-small-regular text-ui-fg-subtle hover:text-ui-fg-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-sm"
          data-testid="back-to-overview-button"
        >
          <BackArrow width={16} height={16} />
          {t("account.orders.back")}
        </LocalizedClientLink>
      </div>

      <div className="flex flex-col gap-6 h-full bg-white w-full">
        <section className="flex flex-col gap-y-3" aria-labelledby="order-summary-heading">
          <h2 id="order-summary-heading" className="sr-only">
            {t("account.order.heading")}
          </h2>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <span className="text-large-semi" data-testid="order-id">
              {t("account.order.number")} {order.display_id}
            </span>
            {date ? (
              <span className="text-small-regular text-fg-subtle" data-testid="order-date">
                {t("account.order.date")}: {date}
              </span>
            ) : null}
          </div>
          {order.email ? (
            <p className="text-small-regular text-fg-base" data-testid="order-email-note">
              {t("account.order.confirmationEmail")}:{" "}
              <span className="font-semibold" data-testid="order-email">
                {order.email}
              </span>
              . {t("account.order.confirmationEmailNote")}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 mt-2">
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
        </section>

        <Divider className="!mb-0" />

        <section className="flex flex-col gap-y-4">
          <Heading level="h2" className="text-large-semi">
            {t("account.order.items.title")}
          </Heading>
          <OrderItems items={order.items ?? []} currencyCode={order.currency_code} />
        </section>

        <Divider className="!mb-0" />

        <OrderTotals order={order} />

        <Divider className="!mb-0" />

        <OrderDelivery order={order} />

        <Divider className="!mb-0" />

        <OrderPayment order={order} />

        <Divider className="!mb-0" />

        <OrderFulfillment order={order} />
      </div>
    </div>
  )
}

export default OrderDetailsTemplate