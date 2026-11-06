import { HttpTypes } from "@medusajs/types"

export const isSimpleProduct = (product: HttpTypes.StoreProduct): boolean => {
  return product.options?.length === 1 && product.options[0].values?.length === 1
}

/**
 * Option values that can actually produce a variant.
 *
 * Medusa keeps option values at product level, so a catalogue can contain
 * values that no variant uses (the demo seed does this). Rendering those values
 * gives the shopper a button that can never satisfy the variant matcher: the
 * option looks selected while the buy button stays disabled. Only advertise
 * values that exist on a variant compatible with the other selected options.
 */
export const getAvailableOptionValues = (
  product: HttpTypes.StoreProduct,
  selectedOptions: Record<string, string | undefined>
): Record<string, string[]> => {
  const variants = product.variants ?? []
  const options = product.options ?? []
  const result: Record<string, string[]> = {}

  for (const option of options) {
    const otherSelections = Object.entries(selectedOptions).filter(
      ([optionId, value]) => optionId !== option.id && Boolean(value)
    )
    const values = new Set<string>()

    for (const variant of variants) {
      const variantOptions = variant.options ?? []
      const matchesOtherSelections = otherSelections.every(
        ([optionId, value]) =>
          variantOptions.some(
            (variantOption) =>
              variantOption.option_id === optionId &&
              variantOption.value === value
          )
      )

      if (!matchesOtherSelections) {
        continue
      }

      const variantValue = variantOptions.find(
        (variantOption) => variantOption.option_id === option.id
      )?.value

      if (variantValue) {
        values.add(variantValue)
      }
    }

    result[option.id] = Array.from(values)
  }

  return result
}