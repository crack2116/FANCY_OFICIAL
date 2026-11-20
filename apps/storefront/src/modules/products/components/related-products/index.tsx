import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { t } from "@lib/i18n/translations"
import { HttpTypes } from "@medusajs/types"
import ProductGrid from "@modules/store/components/product-grid"

/**
 * Products related to this one.
 *
 * The relation is real and simple: other products in the same collection, or
 * carrying the same tag, minus the product itself. When nothing matches, the
 * block disappears entirely rather than rendering a heading over an empty row.
 *
 * It renders through the shared `ProductGrid`, so these cards are the same cards
 * as everywhere else.
 */
export default async function RelatedProducts({
  product,
  countryCode,
}: {
  product: HttpTypes.StoreProduct
  countryCode: string
}) {
  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  const queryParams: HttpTypes.StoreProductListParams = {}

  if (region.id) {
    queryParams.region_id = region.id
  }

  if (product.collection_id) {
    queryParams.collection_id = [product.collection_id]
  }

  if (product.tags?.length) {
    queryParams.tag_id = product.tags.map((tag) => tag.id).filter(Boolean)
  }

  queryParams.is_giftcard = false

  const { response } = await listProducts({
    queryParams,
    countryCode,
  })

  const products = response.products.filter(
    (related) => related.id !== product.id
  )

  if (!products.length) {
    return null
  }

  return (
    <section aria-labelledby="related-products-heading">
      <div className="mb-8 flex flex-col gap-2">
        <h2
          id="related-products-heading"
          className="text-2xl font-semibold tracking-tight text-fg-base"
        >
          {t("product.relatedHeading")}
        </h2>
        <p className="text-sm text-fg-subtle">
          {t("product.relatedSubtitle")}
        </p>
      </div>

      <ProductGrid
        products={products}
        region={region}
        data-testid="related-products-list"
      />
    </section>
  )
}