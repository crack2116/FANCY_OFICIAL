/**
 * Order header facts: confirmation email, date and the visible order number.
 *
 * THE VISIBLE NUMBER
 * `display_id` is the sequential integer Medusa assigns for shoppers;
 * `custom_display_id` is preferred when the merchant configured one, because
 * that is the number printed on an invoice. The internal `order_01M...` id is
 * NEVER shown as a label — it is a database key, and a shopper who reads it
 * learns nothing and can trivially paste it into the public order URL.
 *
 * Dates go through the single es-PE formatter, so nothing here can print
 * "Mon Oct 05 2026" or the ambiguous "10/5/26".
 */

import { HttpTypes } from "@medusajs/types"
import { t } from "@lib/i18n/translations"
import { formatEsPeDate } from "@lib/format/date"

/** The shopper-facing order number, or an honest placeholder if there is none. */
export function orderNumber(
  order: Pick<HttpTypes.StoreOrder, "display_id" | "custom_display_id">
): string {
  if (order.custom_display_id) {
    return order.custom_display_id
  }

  return order.display_id != null ? String(order.display_id) : t("common.notAvailable")
}

const OrderDetails = ({ order }: { order: HttpTypes.StoreOrder }) => {
  const date = formatEsPeDate(order.created_at)

  return (
    <div>
      {order.email ? (
        <p className="text-base-regular text-ui-fg-base">
          {t("account.order.confirmationEmail")}:{" "}
          <span className="font-semibold" data-testid="order-email">
            {order.email}
          </span>
          . {t("account.order.confirmationEmailNote")}
        </p>
      ) : null}
      {date ? (
        <p className="mt-2 text-base-regular text-ui-fg-base">
          {t("account.order.date")}: <span data-testid="order-date">{date}</span>
        </p>
      ) : null}
      <p className="mt-2 text-base-regular text-fg-base">
        {t("account.order.number")}:{" "}
        <span className="font-semibold" data-testid="order-id">
          {orderNumber(order)}
        </span>
      </p>
    </div>
  )
}

export default OrderDetails