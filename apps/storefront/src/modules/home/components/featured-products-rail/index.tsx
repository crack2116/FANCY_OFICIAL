import { listProducts } from "@lib/data/products"
import { RAIL_PRODUCT_LIMIT } from "@lib/home-config"
import { t } from "@lib/i18n/translations"
import { HttpTypes } from "@medusajs/types"
import ProductRail from "@modules/home/components/product-rail"

/**
 * Featured rail for "PRODUCTOS DEL MES".
 *
 * Ensures the primary home product showcase is always populated with store products,
 * even when collections have not been linked yet in the backend.
 */
export default async function FeaturedProductsRail({
  region,
}: {
  region: HttpTypes.StoreRegion
}) {
  const prodResult = await listProducts({
    regionId: region.id,
    queryParams: {
      limit: RAIL_PRODUCT_LIMIT,
    },
  }).catch(() => null)

  const products = prodResult?.response?.products ?? []

  if (!products.length) {
    return null
  }

  return (
    <ProductRail
      id="productos-del-mes"
      title={t("home.rails.featured.title")}
      subtitle={t("home.rails.featured.subtitle")}
      viewAllLabel={t("home.rails.viewAll")}
      href="/store"
      products={products}
      region={region}
    />
  )
}
