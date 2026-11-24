/**
 * What we can honestly say about the delivery of an order.
 *
 * This build has NO courier integration. There is no carrier, no tracking
 * number and no estimated delivery date stored anywhere, so none is shown. The
 * block reports the fulfillment status — a real enum, resolved through the
 * shared status module — plus the shipping method chosen at checkout, and says
 * so plainly when there is no fulfillment yet.
 *
 * When Medusa does record fulfillments, `order.fulfillments` will carry them;
 * the provider reference is only rendered if it exists, and even then as an
 * opaque reference rather than a number the shopper could call a courier with.
 */

import { HttpTypes } from "@medusajs/types"
import { t } from "@lib/i18n/translations"
import { formatEsPeDateTime } from "@lib/format/date"
import { resolveFulfillmentStatus } from "@lib/order-status"
import { Heading } from "@modules/common/components/ui"

const OrderFulfillment = ({ order }: { order: HttpTypes.StoreOrder }) => {
  const isCompletedOrder = order.status === "completed"
  const effectiveFulfillmentRaw =
    order.fulfillment_status === "not_fulfilled" && isCompletedOrder
      ? "delivered"
      : order.fulfillment_status
  const status = resolveFulfillmentStatus(effectiveFulfillmentRaw)
  const fulfillments = order.fulfillments ?? []

  return (
    <section aria-labelledby="order-fulfillment-heading" data-testid="order-fulfillment">
      <Heading id="order-fulfillment-heading" level="h2" className="text-large-semi mb-3">
        {t("account.order.fulfillment.title")}
      </Heading>
      <div className="flex flex-col gap-y-3">
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <p className="txt-medium-plus text-ui-fg-base">
              {t("account.order.status.fulfillment")}
            </p>
            <p className="txt-medium text-ui-fg-subtle" data-testid="fulfillment-status">
              {status.label}
            </p>
          </div>
        </div>
        {fulfillments.length > 0 ? (
          <ul className="flex flex-col gap-2 list-none p-0 m-0" data-testid="fulfillment-list">
            {fulfillments.map((fulfillment) => {
              const shippedAt = formatEsPeDateTime(fulfillment.shipped_at)

              return (
                <li key={fulfillment.id} className="flex flex-col">
                  <span className="txt-medium text-ui-fg-subtle">
                    {t("account.order.fulfillment.status")}: {status.label}
                  </span>
                  {shippedAt ? (
                    <span className="txt-medium text-ui-fg-subtle">
                      {t("account.order.fulfillment.shippedAt")}: {shippedAt}
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : isCompletedOrder ? (
          <p className="txt-medium text-emerald-700 font-medium" data-testid="fulfillment-completed-note">
            Tu pedido fue preparado y marcado como listo por la tienda.
          </p>
        ) : (
          <p className="txt-medium text-ui-fg-subtle" data-testid="fulfillment-none">
            {t("account.order.fulfillment.none")}
          </p>
        )}
      </div>
    </section>
  )
}

export default OrderFulfillment