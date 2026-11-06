/**
 * The vocabulary of the veterinary commercial domain, as the Admin UI sees it.
 *
 * Two jobs:
 *
 *  1. TYPES. The shapes `GET /admin/brands`, `GET /admin/pet-product-species`
 *     and the two product links actually return, declared once. Every admin
 *     screen types against these instead of re-guessing a response body.
 *
 *  2. LABELS AND VALIDATION. The canonical values are STORED in English
 *     (`puppy`, `medium`, `nutripet-demo`) because they travel through URLs,
 *     the search index and filters. The operator reads Spanish
 *     ("Cachorro", "Raza mediana"). This module owns that mapping in one place
 *     so a stored value and its label can never drift.
 *
 * The stored sets are duplicated from `src/modules/pet-product/constants.ts`
 * rather than imported from it. That module is server code resolved through the
 * Medusa container, and the admin bundle is built by a separate Vite pass with
 * its own tsconfig; pulling server module code into admin code would couple two
 * build graphs that are deliberately independent. `LIFE_STAGES` and `PET_SIZES`
 * are verified against the API's zod validators in
 * `src/api/admin/products/validators.ts`.
 */

/** Closed set, in the order the operator should read it. */
export const LIFE_STAGES = ["puppy", "adult", "senior", "all"] as const

export type LifeStage = (typeof LIFE_STAGES)[number]

/** Closed set. `all` means "no restriction", never "unknown". */
export const PET_SIZES = ["small", "medium", "large", "all"] as const

export type PetSize = (typeof PET_SIZES)[number]

/**
 * A brand, exactly as `GET /admin/brands` and `GET /admin/brands/:id` report it.
 *
 * `GET /admin/brands` deliberately returns no product count, so this type has
 * no `product_count` field and no screen may invent one. Counting would mean
 * listing every product in the catalogue to count it, which the list route
 * cannot afford on every render.
 */
export type AdminBrand = {
  id: string
  name: string
  handle: string
  description: string | null
  logo_url: string | null
  is_active: boolean
}

export type AdminSpecies = {
  id: string
  code: string
  /** Operator-facing name, owned by the store. `dog` -> "Perro". */
  name: string
  is_active: boolean
  sort_order: number
}

/** Body of `POST /admin/products/:id/brand`. */
export type AssignBrandBody = {
  brand_id: string
}

/** Body of `POST /admin/products/:id/pet-product-profile`. */
export type UpsertPetProductProfileBody = {
  life_stage: LifeStage
  pet_size: PetSize
  /** CODES, not ids. The API resolves them against real rows and 400s otherwise. */
  species_codes: string[]
}

/** Mirrors `BRAND_HANDLE_PATTERN` in the module constants. */
const BRAND_HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Mirrors `SPECIES_CODE_PATTERN` in the module constants. */
const SPECIES_CODE_PATTERN = /^[a-z][a-z0-9_]{0,31}$/

export const isLifeStage = (value: unknown): value is LifeStage =>
  typeof value === "string" &&
  (LIFE_STAGES as readonly string[]).includes(value)

export const isPetSize = (value: unknown): value is PetSize =>
  typeof value === "string" && (PET_SIZES as readonly string[]).includes(value)

export const isBrandHandle = (value: string): boolean =>
  BRAND_HANDLE_PATTERN.test(value)

export const isSpeciesCode = (value: string): boolean =>
  SPECIES_CODE_PATTERN.test(value)

/**
 * The Spanish label for a life stage.
 *
 * Returns `null` for a value outside the closed set instead of echoing it: an
 * unknown stored value must render as "unknown to us", never as a raw machine
 * token next to a real label, which reads as a data bug rather than an
 * unsupported value.
 */
export const LIFE_STAGE_LABELS: Readonly<Record<LifeStage, string>> = {
  puppy: "Cachorro",
  adult: "Adulto",
  senior: "Senior",
  all: "Todas las etapas",
}

export const PET_SIZE_LABELS: Readonly<Record<PetSize, string>> = {
  small: "Raza pequeña",
  medium: "Raza mediana",
  large: "Raza grande",
  all: "Todos los tamaños",
}

export const lifeStageLabel = (value: string): string | null =>
  isLifeStage(value) ? LIFE_STAGE_LABELS[value] : null

export const petSizeLabel = (value: string): string | null =>
  isPetSize(value) ? PET_SIZE_LABELS[value] : null

/**
 * Narrow a value read back from the API to the closed set.
 *
 * A stored enum the database's check constraint already guarantees is still
 * narrowed here, because a value this build does not know about must be
 * REPORTED rather than passed through to a form that would then post it back.
 * Returns `null` for anything outside the set.
 */
export const toLifeStage = (value: string): LifeStage | null =>
  isLifeStage(value) ? value : null

/** Narrow a stored enum value, or report it as unusable. See `toLifeStage`. */
export const toPetSize = (value: string): PetSize | null =>
  isPetSize(value) ? value : null

/**
 * A handle the operator did not have to invent.
 *
 * The API derives the handle from the name when it is absent, so this mirrors
 * that behaviour to PREVIEW the URL the brand will live at. Previews only; the
 * API remains the authority and a 400 is still handled.
 */
export function suggestBrandHandle(name: string): string {
  return name
    .normalize("NFD")
    // Strip combining marks left behind by NFD, so "Café" previews as "cafe"
    // instead of "caf" plus a stray diacritic the pattern would eat silently.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}