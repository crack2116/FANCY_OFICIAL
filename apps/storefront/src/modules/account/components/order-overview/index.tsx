/**
 * The list of the customer's orders, plus its empty state.
 *
 * The empty state lives here so there is exactly one place that owns it, and the
 * page above stays a plain server component that only supplies the data.
 */

import { HttpTypes } from "@medusajs/types"
import { t } from "@lib/i18n/translations"
import { Button } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import OrderCard from "../order-card"

const OrderOverview = ({ orders }: { orders: HttpTypes.StoreOrder[] }) => {
  return (
    <div className="flex flex-col gap-y-8 w-full" data-testid="order-overview">
      {orders.length > 0 ? (
        <ul className="flex flex-col gap-y-6 list-none p-0 m-0" data-testid="orders-wrapper">
          {orders.map((order) => (
            <li key={order.id} data-testid="order-wrapper">
              <OrderCard order={order} />
            </li>
          ))}
        </ul>
      ) : (
        <div
          className="w-full flex flex-col items-center gap-y-4 text-center py-8"
          data-testid="no-orders-container"
        >
          <h2 className="text-large-semi">{t("account.orders.empty.title")}</h2>
          <p className="text-base-regular text-fg-base max-w-prose">
            {t("account.orders.empty.body")}
          </p>
          <div className="mt-2">
            <LocalizedClientLink href="/store" data-testid="continue-shopping-button">
              <Button>{t("account.orders.empty.cta")}</Button>
            </LocalizedClientLink>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderOverview