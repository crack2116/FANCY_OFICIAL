/**
 * Where the order is going: the shipping address snapshot, the contact details
 * and the shipping method chosen at checkout.
 *
 * THE ADDRESS COMES FROM THE ORDER, NOT FROM THE CUSTOMER
 * `order.shipping_address` is the copy stored when the order was placed. Reading
 * the customer's current saved address instead would show a delivery address the
 * shopper never used for this order.
 *
 * NO `undefined`, NO `null`, NO EMPTY BULLET
 * Every line is filtered before rendering and the block falls back to one honest
 * sentence when the order recorded nothing. A missing value is a data fact, not
 * a rendering bug, so it is stated rather than printed as "undefined".
 *
 * There is no district or region column in Medusa's `order_address`; `city` is
 * labelled "Distrito o ciudad" and `province` "Departamento o región", matching
 * the saved-address form so a shopper reads the same labels in both places.
 */

import { HttpTypes } from "@medusajs/types"
import { t } from "@lib/i18n/translations"
import { convertToLocale } from "@lib/util/money"
import { Heading } from "@modules/common/components/ui"

/** Drop empty fragments so a line is never rendered as ", ,". */
function joinParts(parts: (string | null | undefined)[]): string[] {
  return parts
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter((part) => part.length > 0)
}

function AddressBlock({
  title,
  address,
  testId,
}: {
  title: string
  address?: HttpTypes.StoreOrderAddress | null
  testId: string
}) {
  const lines = joinParts([
    [address?.first_name, address?.last_name].filter(Boolean).join(" "),
    address?.company,
    address?.address_1,
    address?.address_2,
    [address?.postal_code, address?.city].filter(Boolean).join(" "),
    address?.province,
    address?.country_code?.toUpperCase(),
    address?.phone,
  ])

  return (
    <div data-testid={testId}>
      <p className="txt-medium-plus text-ui-fg-base mb-1">{title}</p>
      {lines.length > 0 ? (
        <address className="not-italic flex flex-col">
          {lines.map((line, index) => (
            <span key={`${testId}-${index}`} className="txt-medium text-ui-fg-subtle">
              {line}
            </span>
          ))}
        </address>
      ) : (
        <p className="txt-medium text-ui-fg-subtle">{t("account.order.address.unknown")}</p>
      )}
    </div>
  )
}

const OrderDelivery = ({ order }: { order: HttpTypes.StoreOrder }) => {
  const shippingMethod = order.shipping_methods?.[0]

  return (
    <section aria-labelledby="order-delivery-heading" data-testid="order-delivery">
      <Heading id="order-delivery-heading" level="h2" className="text-large-semi mb-3">
        {t("account.order.shipping.title")}
      </Heading>
      <div className="grid grid-cols-1 medium:grid-cols-3 gap-6">
        <AddressBlock
          title={t("account.order.shipping.title")}
          address={order.shipping_address}
          testId="shipping-address-summary"
        />
        <div data-testid="shipping-billing-summary">
          <AddressBlock
            title={t("account.order.billing.title")}
            address={order.billing_address ?? order.shipping_address}
            testId="billing-address-summary"
          />
        </div>
        <div data-testid="shipping-method-summary">
          <p className="txt-medium-plus text-ui-fg-base mb-1">
            {t("account.order.shippingMethod.title")}
          </p>
          {shippingMethod ? (
            <>
              <span className="txt-medium text-ui-fg-subtle" data-testid="shipping-method-name">
                {shippingMethod.name}
              </span>
              <span className="block txt-medium text-ui-fg-subtle" data-testid="shipping-method-amount">
                {convertToLocale({
                  amount: shippingMethod.total ?? shippingMethod.amount ?? 0,
                  currency_code: order.currency_code,
                })}
              </span>
            </>
          ) : (
            <span className="txt-medium text-ui-fg-subtle">
              {t("account.order.shippingMethod.none")}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

export default OrderDelivery