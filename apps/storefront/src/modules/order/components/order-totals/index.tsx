/**
 * The order's money breakdown.
 *
 * A ROW IS ONLY RENDERED WHEN IT SAYS SOMETHING. A "Descuento S/ 0.00" line is
 * noise that implies a discount the shopper never got, so `discount_total`,
 * `gift_card_total` and `tax_total` are all conditional. Shipping always shows,
 * because a shopper is charged (or not charged) for it and needs to know which.
 *
 * Every amount goes through `convertToLocale`, the single money formatter, so
 * the storefront cannot grow a second money format.
 */

import { HttpTypes } from "@medusajs/types"
import { t } from "@lib/i18n/translations"
import { convertToLocale } from "@lib/util/money"
import { Heading } from "@modules/common/components/ui"

type RowProps = {
  label: string
  amount: number
  currencyCode: string
  negative?: boolean
  emphasis?: boolean
  testId: string
}

const TotalsRow = ({
  label,
  amount,
  currencyCode,
  negative = false,
  emphasis = false,
  testId,
}: RowProps) => (
  <div className="flex items-center justify-between gap-4">
    <span className={emphasis ? "text-base-regular font-semibold text-fg-base" : "text-base-regular"}>
      {label}
    </span>
    <span
      className={emphasis ? "text-base-regular font-semibold text-fg-base" : "text-base-regular"}
      data-testid={testId}
    >
      {negative ? "− " : ""}
      {convertToLocale({ amount, currency_code: currencyCode })}
    </span>
  </div>
)

const OrderTotals = ({ order }: { order: HttpTypes.StoreOrder }) => {
  const currencyCode = order.currency_code

  return (
    <section aria-labelledby="order-totals-heading">
      <Heading id="order-totals-heading" level="h2" className="text-large-semi mb-3">
        {t("account.order.totals.title")}
      </Heading>
      <div className="flex flex-col gap-y-2" data-testid="order-totals">
        <TotalsRow
          label={t("account.order.totals.subtotal")}
          amount={order.subtotal ?? 0}
          currencyCode={currencyCode}
          testId="order-subtotal"
        />
        {typeof order.discount_total === "number" && order.discount_total > 0 ? (
          <TotalsRow
            label={t("account.order.totals.discount")}
            amount={order.discount_total}
            currencyCode={currencyCode}
            negative
            testId="order-discount"
          />
        ) : null}
        {typeof order.gift_card_total === "number" && order.gift_card_total > 0 ? (
          <TotalsRow
            label={t("account.order.totals.giftCard")}
            amount={order.gift_card_total}
            currencyCode={currencyCode}
            negative
            testId="order-gift-card"
          />
        ) : null}
        <TotalsRow
          label={t("account.order.totals.shipping")}
          amount={order.shipping_total ?? 0}
          currencyCode={currencyCode}
          testId="order-shipping-total"
        />
        {typeof order.tax_total === "number" && order.tax_total > 0 ? (
          <TotalsRow
            label={t("account.order.totals.taxes")}
            amount={order.tax_total}
            currencyCode={currencyCode}
            testId="order-tax-total"
          />
        ) : null}
        <div className="h-px w-full border-b border-gray-200 border-dashed my-2" />
        <TotalsRow
          label={t("account.order.totals.total")}
          amount={order.total}
          currencyCode={currencyCode}
          emphasis
          testId="order-total"
        />
      </div>
    </section>
  )
}

export default OrderTotals