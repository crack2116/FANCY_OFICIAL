import { t } from "@lib/i18n/translations"
import type { HttpTypes } from "@medusajs/types"
import ProductPreview from "@modules/products/components/product-preview"

/**
 * The one product grid.
 *
 * `/store`, category pages, collection pages, the offers route and the related
 * products block all render this. It exists because the previous `<ul>` +
 * `ProductPreview` pair was copy-pasted into four places and had already drifted:
 * one copy lost the `data-testid`s, another lost the region. One component means
 * a card can never disagree with itself between the search results and the
 * category page.
 *
 * Cards are always `ProductPreview`, which is the only product card in the
 * project. It reads price and stock from the Store API variants, so the grid
 * takes real `StoreProduct`s and never renders a bare index document.
 */
export type ProductGridProps = {
  products: HttpTypes.StoreProduct[]
  region?: HttpTypes.StoreRegion
  /** Card width override for the narrower contexts (related products). */
  isFeatured?: boolean
  className?: string
  "data-testid"?: string
}

export default function ProductGrid({
  products,
  region,
  isFeatured,
  className,
  "data-testid": dataTestId = "products-list",
}: ProductGridProps) {
  if (!products.length) {
    return null
  }

  return (
    <ul
      className={
        className ??
        "grid w-full grid-cols-2 gap-x-6 gap-y-8 small:grid-cols-3 medium:grid-cols-4"
      }
      data-testid={dataTestId}
      aria-label={t("catalogue.results.label")}
    >
      {products.map((product) => (
        <li key={product.id}>
          <ProductPreview
            product={product}
            region={region}
            isFeatured={isFeatured}
          />
        </li>
      ))}
    </ul>
  )
}