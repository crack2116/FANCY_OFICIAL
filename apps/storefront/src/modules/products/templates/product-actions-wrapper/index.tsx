import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"

/**
 * Re-reads the product for live pricing immediately before the buy box renders.
 *
 * The buy box shows the quantity ceiling and the sale price, both of which change
 * when a price list or an inventory level changes. Relying on the page's own copy
 * would mean a shopper sees "Pocas unidades" next to a stale number.
 *
 * The read still goes through `listProducts`, which is reference-cached by
 * Medusa's own tags, so this is a cache hit in the common case rather than a
 * second live fetch.
 */
export default async function ProductActionsWrapper({
  id,
  region,
}: {
  id: string
  region: HttpTypes.StoreRegion
}) {
  const product = await listProducts({
    queryParams: { id: [id] },
    regionId: region.id,
  }).then(({ response }) => response.products[0] ?? null)

  if (!product) {
    return null
  }

  return <ProductActions product={product} region={region} />
}
