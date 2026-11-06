/**
 * Canonical values for the pet-product domain.
 *
 * These are the values that get STORED. They are deliberately short, lower-case
 * and English: identifiers that travel through URLs, the search index, filters
 * and exports. Human-facing labels ("Cachorro", "Raza mediana", "Todas las
 * etapas") belong to the UI layer and must never leak into a stored value.
 */

/**
 * Life stage of the animal a product is made for.
 *
 * `all` means "no restriction", not "unknown": a product without a profile
 * stores no row at all, so `all` is a deliberate commercial statement.
 */
export const LIFE_STAGES = ["puppy", "adult", "senior", "all"] as const

export type LifeStage = (typeof LIFE_STAGES)[number]

/**
 * Size bracket of the animal a product is made for. Same `all` semantics as
 * `LIFE_STAGES`.
 *
 * This is NOT the product's own presentation. `3 kg` / `S` / `L` already live
 * in Medusa product options and variants; duplicating them here would create two
 * sources of truth for the same fact.
 */
export const PET_SIZES = ["small", "medium", "large", "all"] as const

export type PetSize = (typeof PET_SIZES)[number]

/**
 * Shape of a species `code`.
 *
 * The set of species is data, not code — a store may add `other`, `rabbit`,
 * `bird`. So a code is validated for shape here and for existence against the
 * `pet_product_species` table at the API boundary.
 */
export const SPECIES_CODE_PATTERN = /^[a-z][a-z0-9_]{0,31}$/

/**
 * URL-friendly shape for brand handles. Same rationale as `SPECIES_CODE_PATTERN`.
 */
export const BRAND_HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
