/**
 * Stock rules, in ONE place.
 *
 * Three surfaces need to agree on "is this buyable, and is it nearly gone?":
 * the product card, the product page and the availability filter. They used to
 * each carry their own copy of the threshold, which is exactly the kind of
 * duplication that makes a card promise something the checkout then refuses.
 * Everything reads from here now.
 *
 * Every value comes from fields the Store API already returns
 * (`inventory_quantity`, `manage_inventory`, `allow_backorder`). Nothing is
 * inferred from the search index, which carries no inventory data at all.
 */

import type { HttpTypes } from "@medusajs/types"

/**
 * At or below this many units a product is flagged "pocas unidades".
 * Deliberately a single constant: a second threshold anywhere else is a bug.
 */
export const LOW_STOCK_THRESHOLD = 5

export type StockState = "out" | "low" | "available"

/**
 * Whether a single variant can be bought right now.
 *
 * A variant that does not manage inventory, or that allows backorders, is
 * always purchasable: the API is telling us there is no finite stock to run
 * out of. Treating a missing `inventory_quantity` as zero instead would put
 * every untracked product behind an "Agotado" badge, which would be a lie.
 */
export function isVariantPurchasable(
  variant: Pick<
    HttpTypes.StoreProductVariant,
    "manage_inventory" | "allow_backorder" | "inventory_quantity"
  >
): boolean {
  if (!variant.manage_inventory || variant.allow_backorder) {
    return true
  }

  return (variant.inventory_quantity ?? 0) > 0
}

/**
 * How many units of a variant can actually be added, or `null` when there is no
 * real ceiling to enforce.
 *
 * `null` means "the data does not state a limit", which is different from 0:
 * the quantity control then stays uncapped instead of refusing to add anything.
 */
export function getVariantStockCap(
  variant: Pick<
    HttpTypes.StoreProductVariant,
    "manage_inventory" | "allow_backorder" | "inventory_quantity"
  >
): number | null {
  if (!variant.manage_inventory || variant.allow_backorder) {
    return null
  }

  return Math.max(variant.inventory_quantity ?? 0, 0)
}

/** Whether any variant of the product can be bought. */
export function isProductPurchasable(
  product: Pick<HttpTypes.StoreProduct, "variants">
): boolean {
  const variants = product.variants ?? []

  if (variants.length === 0) {
    return true
  }

  return variants.some(isVariantPurchasable)
}

/**
 * Stock state for a whole product, derived from the variants the API already
 * returns. `low` only applies when stock is actually tracked: an untracked
 * product with a nominal quantity of 0 is `available`, not "almost gone".
 */
export function getStockState(product: Pick<HttpTypes.StoreProduct, "variants">): StockState {
  const variants = product.variants ?? []

  if (variants.length === 0) {
    return "available"
  }

  if (!variants.some(isVariantPurchasable)) {
    return "out"
  }

  const managedStock = variants
    .filter(
      (variant) => variant.manage_inventory && !variant.allow_backorder
    )
    .reduce((total, variant) => total + (variant.inventory_quantity ?? 0), 0)

  const tracksStock = variants.some(
    (variant) => variant.manage_inventory && !variant.allow_backorder
  )

  if (tracksStock && managedStock > 0 && managedStock <= LOW_STOCK_THRESHOLD) {
    return "low"
  }

  return "available"
}