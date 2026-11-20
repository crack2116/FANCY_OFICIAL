import { HttpTypes } from "@medusajs/types"
import { getAvailableOptionValues } from "@lib/util/product-options"

export const isSimpleProduct = (product: HttpTypes.StoreProduct): boolean => {
  if ((product.variants?.length ?? 0) <= 1) {
    return true
  }

  return (
    product.options?.every(
      (option) => getAvailableOptionValues(product, option).length <= 1
    ) ?? false
  )
}
