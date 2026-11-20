import { t } from "@lib/i18n/translations"
import { getPercentageDiff } from "@lib/util/get-percentage-diff"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"

type LineItemPriceProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  style?: "default" | "tight"
  currencyCode: string
}

const LineItemPrice = ({
  item,
  style = "default",
  currencyCode,
}: LineItemPriceProps) => {
  const { total, original_total } = item
  const originalPrice = original_total ?? 0
  const currentPrice = total ?? 0
  const hasReducedPrice = currentPrice < originalPrice

  return (
    <div className="flex flex-col items-end text-right tabular-nums">
      {hasReducedPrice && (
        <div className="flex flex-col items-end">
          <p className="whitespace-nowrap text-xs">
            {style === "default" && (
              <span className="text-fg-subtle">
                {t("product.priceOriginalLabel")}:{" "}
              </span>
            )}
            <span
              className="line-through text-fg-muted"
              data-testid="product-original-price"
            >
              {convertToLocale({
                amount: originalPrice,
                currency_code: currencyCode,
              })}
            </span>
          </p>
          {style === "default" && (
            <span className="text-xs font-semibold text-accent-600">
              -{getPercentageDiff(originalPrice, currentPrice || 0)}%
            </span>
          )}
        </div>
      )}
      <span
        className={clx("whitespace-nowrap text-sm font-bold text-[#0F352E]", {
          "text-accent-600": hasReducedPrice,
        })}
        data-testid="product-price"
      >
        {convertToLocale({
          amount: currentPrice,
          currency_code: currencyCode,
        })}
      </span>
    </div>
  )
}

export default LineItemPrice
