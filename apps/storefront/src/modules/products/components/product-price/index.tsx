import { clx } from "@modules/common/components/ui"

import { getProductPrice } from "@lib/util/get-product-price"
import { t } from "@lib/i18n/translations"
import { HttpTypes } from "@medusajs/types"

/**
 * The price block.
 *
 * Reads `calculated_price.calculated_price.price_list_type === "sale"` — the
 * Store API's own verdict after it has applied the region's price list. That is
 * why the discount shown here is trustworthy while the index's `on_sale_*` field
 * is not: the index resolves prices with a currency context only and never sees a
 * region-scoped price list.
 */
export default function ProductPrice({
  product,
  variant,
}: {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
}) {
  const { cheapestPrice, variantPrice } = getProductPrice({
    product,
    variantId: variant?.id,
  })

  const selectedPrice = variant ? variantPrice : cheapestPrice

  if (!selectedPrice) {
    return <div className="block h-9 w-32 animate-pulse bg-surface-subtle" />
  }

  const isSale = selectedPrice.price_type === "sale"

  return (
    <div className="flex flex-col text-fg-base">
      <span
        className={clx(
          "font-display text-3xl font-semibold tracking-tight",
          {
            "text-accent-600": isSale,
          }
        )}
      >
        {!variant ? (
          <span className="mr-1 text-sm font-medium text-fg-muted">
            {t("product.priceFrom")}
          </span>
        ) : null}
        <span
          data-testid="product-price"
          data-value={selectedPrice.calculated_price_number}
        >
          {selectedPrice.calculated_price}
        </span>
      </span>

      {isSale ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="text-fg-subtle">
            {t("product.priceOriginalLabel")}:{" "}
            <span
              className="line-through"
              data-testid="original-product-price"
              data-value={selectedPrice.original_price_number}
            >
              {selectedPrice.original_price}
            </span>
          </span>
          <span className="rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-semibold text-accent-600">
            -{selectedPrice.percentage_diff}%
          </span>
        </div>
      ) : null}
    </div>
  )
}