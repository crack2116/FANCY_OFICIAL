import type { HttpTypes } from "@medusajs/types"

const GENERIC_OPTION_TITLES = new Set([
  "",
  "size",
  "sizes",
  "talla",
  "tallas",
  "tamaño",
  "tamaños",
  "tamano",
  "tamanos",
  "presentación",
  "presentacion",
  "peso",
  "weight",
  "kilo",
  "kilos",
  "kg",
  "volumen",
  "volume",
  "default option",
])

const COLOR_VALUE_LABELS: Readonly<Record<string, string>> = {
  black: "Negro",
  white: "Blanco",
  red: "Rojo",
  blue: "Azul",
  green: "Verde",
  yellow: "Amarillo",
  pink: "Rosado",
  orange: "Naranja",
  gray: "Gris",
  grey: "Gris",
  brown: "Marrón",
  beige: "Beige",
}

const FOOD_PATTERN =
  /\b(alimentos?|comida|croquetas?|snacks?|galletas?|premios?|nutrici[oó]n|lata|h[uú]medo|pedigree|royal\s*canin|ricocan|canbo|pro\s*plan|hills|chunky|nutram|kibble|food)\b/i

const APPAREL_PATTERN =
  /\b(ropa|vestimenta|camisas?|polos?|poleras?|su[eé]ter(?:es)?|chompas?|chalecos?|pantal[oó]n(?:es)?|shorts?|vestidos?|merch|shirts?|pants|sweatshirts?|collares?|correas?|arn[eé]s(?:es)?|pecheras?|bandanas?)\b/i

function collectProductSearchText(product: HttpTypes.StoreProduct): string {
  const categoryText = (product.categories ?? [])
    .map((c) => `${c.handle ?? ""} ${c.name ?? ""}`)
    .join(" ")

  const tagText = (product.tags ?? []).map((tag) => tag.value ?? "").join(" ")

  return [
    categoryText,
    tagText,
    product.type?.value ?? "",
    product.title ?? "",
    product.handle ?? "",
  ]
    .filter(Boolean)
    .join(" ")
}

function isKgValue(value: string): boolean {
  return /^\d+(?:[.,]\d+)?\s*(kg|kilo|kilos)\b/i.test(value.trim())
}

function isWeightValue(value: string): boolean {
  return /^\d+(?:[.,]\d+)?\s*(kg|kilo|kilos|g|gr|gramo|gramos)\b/i.test(
    value.trim()
  )
}

function isVolumeValue(value: string): boolean {
  return /^\d+(?:[.,]\d+)?\s*(ml|l|lt|litro|litros)\b/i.test(value.trim())
}

function isApparelLetterSize(value: string): boolean {
  return /^(xxxs|xxs|xs|s|m|l|xl|xxl|xxxl|2xl|3xl|4xl)$/i.test(value.trim())
}

function isDescriptiveSize(value: string): boolean {
  return /^(mini|toy|chico|chica|pequeñ[oa]|mediano|mediana|grande|extra\s*grande|[uú]nica|est[aá]ndar)$/i.test(
    value.trim()
  )
}

function isBareNumber(value: string): boolean {
  return /^\d+(?:[.,]\d+)?$/.test(value.trim())
}

const APPAREL_SIZE_ORDER: Readonly<Record<string, number>> = {
  xxxs: 0,
  xxs: 1,
  xs: 2,
  s: 3,
  m: 4,
  l: 5,
  xl: 6,
  xxl: 7,
  "2xl": 7,
  xxxl: 8,
  "3xl": 8,
  "4xl": 9,
}

const DESCRIPTIVE_SIZE_ORDER: Readonly<Record<string, number>> = {
  mini: 0,
  toy: 1,
  chico: 2,
  chica: 2,
  pequeño: 2,
  pequeña: 2,
  mediano: 3,
  mediana: 3,
  grande: 4,
  "extra grande": 5,
}

function getNumericRank(value: string): number | null {
  const trimmed = value.trim().replace(",", ".")
  const match = trimmed.match(
    /^(\d+(?:\.\d+)?)\s*(kg|kilo|kilos|g|gr|gramos?|l|lt|litros?|ml)?$/i
  )
  if (!match) {
    return null
  }
  const num = Number(match[1])
  if (!Number.isFinite(num)) {
    return null
  }
  const unit = (match[2] ?? "").toLowerCase()
  if (unit === "kg" || unit === "kilo" || unit === "kilos" || unit === "l" || unit === "lt" || unit === "litro" || unit === "litros") {
    return num * 1000
  }
  return num
}

function sortOptionValues(values: string[]): string[] {
  if (values.length <= 1) {
    return values
  }

  const numericRanks = values.map(getNumericRank)
  if (numericRanks.every((r): r is number => r !== null)) {
    return [...values].sort((a, b) => (getNumericRank(a) ?? 0) - (getNumericRank(b) ?? 0))
  }

  if (values.every((v) => v.trim().toLowerCase() in APPAREL_SIZE_ORDER)) {
    return [...values].sort(
      (a, b) =>
        (APPAREL_SIZE_ORDER[a.trim().toLowerCase()] ?? 99) -
        (APPAREL_SIZE_ORDER[b.trim().toLowerCase()] ?? 99)
    )
  }

  if (values.every((v) => v.trim().toLowerCase() in DESCRIPTIVE_SIZE_ORDER)) {
    return [...values].sort(
      (a, b) =>
        (DESCRIPTIVE_SIZE_ORDER[a.trim().toLowerCase()] ?? 99) -
        (DESCRIPTIVE_SIZE_ORDER[b.trim().toLowerCase()] ?? 99)
    )
  }

  return values
}

/**
 * Returns only option values that belong to at least one variant of `product`.
 * Prevents shared option pools from showing unrelated weights/sizes on a product.
 */
export function getAvailableOptionValues(
  product: HttpTypes.StoreProduct,
  option: HttpTypes.StoreProductOption
): string[] {
  const variants = product.variants ?? []
  const usedValues = new Set<string>()

  for (const variant of variants) {
    for (const varOpt of variant.options ?? []) {
      const matchesById = Boolean(varOpt.option_id && varOpt.option_id === option.id)
      const matchesByTitle =
        !varOpt.option_id &&
        Boolean(
          option.title &&
            varOpt.option?.title?.toLowerCase() === option.title.toLowerCase()
        )

      if ((matchesById || matchesByTitle) && varOpt.value) {
        usedValues.add(varOpt.value)
      }
    }
  }

  const definedValues = (option.values ?? [])
    .map((v) => v.value)
    .filter((value): value is string => Boolean(value))

  if (usedValues.size === 0) {
    return sortOptionValues(Array.from(new Set(definedValues)))
  }

  const ordered: string[] = []
  const seen = new Set<string>()

  for (const value of definedValues) {
    if (usedValues.has(value) && !seen.has(value)) {
      ordered.push(value)
      seen.add(value)
    }
  }

  for (const value of Array.from(usedValues)) {
    if (!seen.has(value)) {
      ordered.push(value)
      seen.add(value)
    }
  }

  return sortOptionValues(ordered)
}

/**
 * Resolves a human-friendly Spanish option label depending on the product type
 * and its active variant values (e.g. "Peso (kg)" for food bags vs "Talla" for apparel).
 */
export function resolveOptionDisplayTitle(
  product: HttpTypes.StoreProduct,
  option: HttpTypes.StoreProductOption,
  availableValues: string[]
): string {
  const rawTitle = (option.title ?? "").trim()
  const lowerTitle = rawTitle.toLowerCase()

  if (lowerTitle === "color" || lowerTitle === "colour") {
    return "Color"
  }
  if (lowerTitle === "flavor" || lowerTitle === "flavour" || lowerTitle === "sabor") {
    return "Sabor"
  }
  if (lowerTitle === "material") {
    return "Material"
  }

  if (!GENERIC_OPTION_TITLES.has(lowerTitle)) {
    return rawTitle
  }

  const contextText = collectProductSearchText(product)
  const isFood = FOOD_PATTERN.test(contextText)
  const isApparel = APPAREL_PATTERN.test(contextText)

  if (availableValues.some(isKgValue)) {
    return "Peso (kg)"
  }
  if (availableValues.some(isWeightValue)) {
    return "Peso"
  }
  if (availableValues.some(isVolumeValue)) {
    return "Volumen"
  }
  if (isFood && availableValues.length > 0 && availableValues.every(isBareNumber)) {
    return "Peso (kg)"
  }
  if (availableValues.some(isApparelLetterSize)) {
    return "Talla"
  }
  if (availableValues.some(isDescriptiveSize)) {
    return isApparel ? "Talla" : "Tamaño"
  }

  if (isFood) {
    return "Peso (kg)"
  }
  if (isApparel) {
    return "Talla"
  }

  return rawTitle && lowerTitle !== "size" && lowerTitle !== "default option"
    ? rawTitle
    : "Presentación"
}

/**
 * Formats an option value for display without modifying the underlying Medusa value.
 */
export function formatOptionValueForDisplay(
  rawValue: string,
  resolvedTitle: string
): string {
  if (resolvedTitle === "Color") {
    const mapped = COLOR_VALUE_LABELS[rawValue.trim().toLowerCase()]
    if (mapped) {
      return mapped
    }
  }

  if (resolvedTitle === "Peso (kg)" && isBareNumber(rawValue)) {
    return `${rawValue.trim()} kg`
  }

  return rawValue
}
