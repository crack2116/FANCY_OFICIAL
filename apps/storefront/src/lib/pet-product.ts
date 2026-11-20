/**
 * The pet-product vocabulary as the storefront reads it.
 *
 * The Store API returns CODES — `species: [{ code: "dog" }]`,
 * `life_stage: "puppy"` — because codes travel through URLs, the search index
 * and filters. A shopper reads Spanish. This module owns that translation in
 * one place so a card, a detail section and a filter can never disagree about
 * what "medium" is called.
 *
 * IT IS ONE-SIDED ON PURPOSE
 * --------------------------
 * Every function here returns `null` for a value it does not recognise, and the
 * callers omit the row. Nothing falls back to echoing the raw code into a label,
 * because `life_stage: "adul"` rendered as a heading reads as a data bug, and
 * `N/A` in a table of mostly-real values teaches a shopper to distrust the whole
 * table. Omitting the row is the honest rendering of "we do not have this".
 *
 * Species is the exception, and deliberately so: the SET of species is data, not
 * code — a store may add `rabbit` or `bird`, and the API only validates the shape
 * of a code. So an unknown species falls back to the code itself, which is
 * merchant data rather than untranslated UI copy. See `speciesLabel`.
 */

import { t, type TranslationKey } from "@lib/i18n/translations"
import type { HttpTypes } from "@medusajs/types"

/** Closed set. `all` is a real commercial value, not a null. */
export const LIFE_STAGES = ["puppy", "adult", "senior", "all"] as const

export type LifeStage = (typeof LIFE_STAGES)[number]

/** Closed set. Presentation (`3 kg`, `M`) deliberately lives in variants. */
export const PET_SIZES = ["small", "medium", "large", "all"] as const

export type PetSize = (typeof PET_SIZES)[number]

/** Mirrors `SPECIES_CODE_PATTERN` in the backend's module constants. */
const SPECIES_CODE_PATTERN = /^[a-z][a-z0-9_]{0,31}$/

/**
 * The codes this build can name.
 *
 * An explicit map rather than a computed key: `TranslationKey` is a union of
 * literals, so `t(\`catalogue.pet.species.${code}\`)` would not type-check and a
 * cast would defeat the point of a typed dictionary. Adding a species means
 * adding a key here too, which is the reviewable moment.
 */
const SPECIES_LABEL_KEYS: Readonly<Record<string, TranslationKey>> = {
  dog: "catalogue.pet.species.dog",
  cat: "catalogue.pet.species.cat",
  other: "catalogue.pet.species.other",
}

const LIFE_STAGE_LABEL_KEYS: Readonly<Record<LifeStage, TranslationKey>> = {
  puppy: "catalogue.pet.lifeStage.puppy",
  adult: "catalogue.pet.lifeStage.adult",
  senior: "catalogue.pet.lifeStage.senior",
  all: "catalogue.pet.lifeStage.all",
}

const PET_SIZE_LABEL_KEYS: Readonly<Record<PetSize, TranslationKey>> = {
  small: "catalogue.pet.petSize.small",
  medium: "catalogue.pet.petSize.medium",
  large: "catalogue.pet.petSize.large",
  all: "catalogue.pet.petSize.all",
}

export const isLifeStage = (value: unknown): value is LifeStage =>
  typeof value === "string" && (LIFE_STAGES as readonly string[]).includes(value)

export const isPetSize = (value: unknown): value is PetSize =>
  typeof value === "string" && (PET_SIZES as readonly string[]).includes(value)

export const isSpeciesCode = (value: unknown): value is string =>
  typeof value === "string" && SPECIES_CODE_PATTERN.test(value)

/** Spanish label for a life stage, or `null` when this build cannot name it. */
export function lifeStageLabel(value: string | null | undefined): string | null {
  return isLifeStage(value) ? t(LIFE_STAGE_LABEL_KEYS[value]) : null
}

/** Spanish label for a size bracket, or `null` when unknown. */
export function petSizeLabel(value: string | null | undefined): string | null {
  return isPetSize(value) ? t(PET_SIZE_LABEL_KEYS[value]) : null
}

/**
 * Spanish label for a species code.
 *
 * The ONLY function here that does not return `null`. An unrecognised code is
 * returned as itself: it came from the merchant's own `pet_product_species` row,
 * it is a legitimate value, and hiding it would make a real product look
 * unclassified. `other` exists precisely so a store has a bucket for species this
 * build has no Spanish word for.
 */
export function speciesLabel(code: string): string {
  const key = SPECIES_LABEL_KEYS[code]

  return key ? t(key) : code
}

/**
 * The public shape of the linked commercial data on a Store product.
 *
 * Only `brand.name/handle/logo_url` and the profile's
 * `life_stage/pet_size/species.code` are exposed publicly — every other field of
 * those modules is rejected by the Store API. This type reflects exactly that,
 * so a component cannot reach for something the API will not return.
 */
export type StoreProductBrand = {
  name: string
  handle: string
  logo_url?: string | null
}

export type StorePetProductProfile = {
  life_stage: string | null
  pet_size: string | null
  species: { code: string }[]
}

/**
 * A Store product carrying the two linked modules' public fields.
 *
 * `brand` and `pet_product_profile` are reached through Medusa MODULE LINKS, so
 * they are not part of the generated `StoreProduct` type — that type describes
 * the Product Module's own fields only. This is the one place the storefront
 * declares their shape, and the one place it narrows a `StoreProduct` to read
 * them. Everywhere else takes the already-narrowed result, so the boundary is
 * visible in one file instead of being repeated at every call site.
 *
 * It matches the API's verified public surface exactly: `brand.name/handle` and
 * the profile's `life_stage/pet_size/species.code`. Every other field of those
 * modules is rejected by the Store API, so nothing is declared that cannot arrive.
 */
type StoreProductWithLinks = HttpTypes.StoreProduct & {
  brand?: StoreProductBrand | null
  pet_product_profile?: StorePetProductProfile | null
}

export type ProductPetData = {
  brand: StoreProductBrand | null
  profile: StorePetProductProfile | null
}

/**
 * Read a product's brand and pet profile.
 *
 * Both are `null` when absent, which is the normal case for part of the
 * catalogue: five of eighteen products carry no brand and four carry no profile.
 * Callers omit the row rather than rendering a placeholder, so a missing value
 * never reads as a broken one.
 */
export function readProductPetData(product: HttpTypes.StoreProduct): ProductPetData {
  const linked = product as StoreProductWithLinks
  const brand = linked.brand
  const profile = linked.pet_product_profile ?? null

  return {
    // A brand with no name or no handle is not usable: one cannot be linked and
    // the other cannot be displayed, so it is treated as absent.
    brand: brand?.name && brand?.handle ? brand : null,
    profile,
  }
}

/** The `/store/products` field set that resolves both links in ONE request. */
export const PET_PRODUCT_FIELDS =
  "+brand.name,+brand.handle,+brand.logo_url," +
  "+pet_product_profile.life_stage,+pet_product_profile.pet_size," +
  "+pet_product_profile.species.code"

/**
 * The species codes of a product, de-duplicated and in a stable order.
 *
 * A product can carry several species (six demo products are valid for both
 * Perro and Gato). Ordering by the canonical species order rather than by
 * whatever the API returned keeps the detail section and a facet list stable
 * between renders.
 */
export function productSpeciesCodes(
  profile: StorePetProductProfile | null
): string[] {
  if (!profile?.species) {
    return []
  }

  const unique = Array.from(
    new Set(
      profile.species
        .map((entry) => entry?.code)
        .filter((code): code is string => Boolean(code) && isSpeciesCode(code))
    )
  )

  return unique.sort((a, b) => {
    const order = ["dog", "cat", "other"]
    const left = order.indexOf(a)
    const right = order.indexOf(b)

    return (
      (left === -1 ? order.length : left) - (right === -1 ? order.length : right) ||
      a.localeCompare(b)
    )
  })
}