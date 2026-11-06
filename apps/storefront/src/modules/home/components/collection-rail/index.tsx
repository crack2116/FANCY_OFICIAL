import { listCategories } from "@lib/data/categories"
import { listProducts } from "@lib/data/products"
import { RAIL_PRODUCT_LIMIT } from "@lib/home-config"
import { t } from "@lib/i18n/translations"
import type { ResolvedRail } from "@lib/util/home-merchandising"
import { HttpTypes } from "@medusajs/types"
import ProductRail from "@modules/home/components/product-rail"
import type { RailCategory } from "@modules/home/components/product-rail/rail-tabs"

/**
 * Fetches the products of one configured collection and hands them to the
 * reusable `ProductRail`.
 *
 * This is the only place on the home page that knows about collections, which
 * is why the rail markup exists once instead of three times.
 *
 * `fields` is intentionally NOT passed: `listProducts` already asks for
 * `*variants.calculated_price` AND `+variants.inventory_quantity`, and a local
 * `fields` would REPLACE that default — which is how the previous rail lost its
 * stock badges. Sale badges still come from the real
 * `calculated_price.price_list_type`, never from a hardcoded percentage.
 */
export default async function CollectionRail({
  rail,
  region,
}: {
  rail: ResolvedRail
  region: HttpTypes.StoreRegion
}) {
  const [prodResult, categories] = await Promise.all([
    listProducts({
      regionId: region.id,
      queryParams: {
        collection_id: [rail.collection.id],
        limit: RAIL_PRODUCT_LIMIT,
      },
    }).catch(() => null),

    listCategories().catch(() => [] as HttpTypes.StoreProductCategory[]),
  ])

  let products = prodResult?.response?.products ?? []

  if (!products.length) {
    const fallback = await listProducts({
      regionId: region.id,
      queryParams: {
        limit: RAIL_PRODUCT_LIMIT,
      },
    }).catch(() => null)
    products = fallback?.response?.products ?? []
  }

  return (
    <ProductRail
      id={rail.id}
      title={t(rail.titleKey)}
      subtitle={t(rail.subtitleKey)}
      viewAllLabel={t(rail.viewAllKey)}
      href={rail.href}
      products={products}
      categoryIndex={indexCategories(products, categories)}
      region={region}
    />
  )
}

/**
 * Which of THIS rail's products belong to which category, keyed by product id.
 *
 * Restricted to the products the rail is actually rendering, so the tab strip
 * can never offer a category whose cards are not on screen. A product in no
 * category is simply absent from the map, which the rail reads as "belongs to
 * nothing" — it shows under the "all" tab and under no category tab.
 *
 * Built once per rail rather than once per card: a product belongs to several
 * categories in the data model, and a card must not be able to disagree with
 * itself about which tabs it belongs under.
 */
function indexCategories(
  products: HttpTypes.StoreProduct[],
  categories: HttpTypes.StoreProductCategory[]
): Map<string, RailCategory[]> {
  const wanted = new Set(products.map((product) => product.id))
  const index = new Map<string, RailCategory[]>()

  for (const category of categories) {
    for (const product of category.products ?? []) {
      if (!wanted.has(product.id)) {
        continue
      }

      const membership = index.get(product.id) ?? []

      membership.push({ handle: category.handle, name: category.name })
      index.set(product.id, membership)
    }
  }

  return index
}
