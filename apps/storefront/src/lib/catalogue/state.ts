/**
 * The catalogue's URL contract.
 *
 * Filters, sort and page live in the query string, so a refresh, a copied link
 * and the browser's back button all reproduce exactly what the shopper was
 * looking at. This module is the ONLY place that knows the parameter names, the
 * sort vocabulary, what counts as garbage and which groups count towards the
 * "Filtrar (n)" badge. Components read and write state through these helpers so
 * no two of them can drift.
 *
 * URL shape:
 *   /pe/store?category=alimentos&brand=nutripet-demo&species=dog,cat&life_stage=adult
 *   &min_price=20&max_price=100&in_stock=1&sort=price_asc&q=shampoo&page=2
 *
 * Everything is sanitised on the way IN as well as on the way out. A hand-typed
 * `?min_price=abc` is dropped rather than forwarded to the search endpoint,
 * which would reject the whole request with a validation error and leave the
 * shopper staring at an error page over a typo.
 */

import { isLifeStage, isSpeciesCode } from "@lib/pet-product"

export const CATALOGUE_QUERY_KEYS = {
  query: "q",
  category: "category",
  brand: "brand",
  species: "species",
  lifeStage: "life_stage",
  minPrice: "min_price",
  maxPrice: "max_price",
  inStock: "in_stock",
  sort: "sort",
  page: "page",
} as const

/**
 * Minimum query length before a search is issued.
 *
 * One letter matches a large share of a 18-product catalogue, so a search box
 * that fires on the first keystroke immediately replaces the shopper's list with
 * a near-complete dump and gives no useful signal. Two characters is the
 * shortest string that narrows the catalogue meaningfully in Spanish, and it is
 * short enough that the field still feels instant.
 *
 * The same rule is applied to `?q=` on the way in, so a pasted one-character URL
 * cannot make the page claim it is "searching" while showing the whole
 * catalogue.
 */
export const MIN_SEARCH_LENGTH = 2

/** Longest query we forward. Anything beyond this is a paste accident. */
export const MAX_SEARCH_LENGTH = 120

/** Upper bound for a price filter, in the region's currency. */
export const MAX_PRICE = 1_000_000

/** Beyond this the page is a typo, not a shopper. */
const MAX_PAGE = 1000

/** Handles are kebab-case slugs. Anything else cannot be a real handle. */
const HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Most species a URL may carry.
 *
 * The API caps `species_codes` at 20 and the engine turns the list into a single
 * `$in`. A hand-typed URL with more entries than that is a paste accident, and
 * forwarding it would make the search endpoint reject the whole request.
 */
const MAX_SPECIES_SELECTION = 20

/** A price: an optional non-negative number with at most two decimals. */
const PRICE_PATTERN = /^\d{1,7}(?:\.\d{1,2})?$/

export type CatalogueSort = "relevance" | "price_asc" | "price_desc" | "created_at"

export const CATALOGUE_SORTS: CatalogueSort[] = [
  "relevance",
  "price_asc",
  "price_desc",
  "created_at",
]

export const DEFAULT_SORT: CatalogueSort = "relevance"

export type CatalogueState = {
  query: string
  /** Category HANDLE, as it appears in `/categories/<handle>` and in the URL. */
  category: string | null
  /**
   * Brand HANDLE, never the display name.
   *
   * The index stores both, but only the name is facetable: a shopper reads
   * "NutriPet Demo", never `nutripet-demo`. The handle is what goes in the URL
   * and what the engine filters on, so the two are kept apart deliberately and
   * the mapping between them is resolved from the index's own documents.
   */
  brand: string | null
  /**
   * Species CODES, several at once.
   *
   * A product is valid for more than one species — six demo products are sold
   * for both Perro and Gato — so this is the one multi-select filter. OR-ed
   * inside the engine as a single `$in`.
   */
  species: string[]
  /** Closed enum. `null` means "no filter", which is NOT the same as `all`. */
  lifeStage: string | null
  minPrice: number | null
  maxPrice: number | null
  inStock: boolean
  sort: CatalogueSort
  page: number
}

export const EMPTY_CATALOGUE_STATE: CatalogueState = {
  query: "",
  category: null,
  brand: null,
  species: [],
  lifeStage: null,
  minPrice: null,
  maxPrice: null,
  inStock: false,
  sort: DEFAULT_SORT,
  page: 1,
}

/** Accepts both `URLSearchParams` (client) and the Next.js `searchParams` object. */
export type CatalogueParamsInput =
  | URLSearchParams
  | Record<string, string | string[] | undefined>

function firstValue(
  input: CatalogueParamsInput,
  key: string
): string | undefined {
  if (input instanceof URLSearchParams) {
    return input.get(key) ?? undefined
  }

  const value = input[key]

  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

/** Trim, cap and length-check a free-text query. Returns "" when unusable. */
export function normaliseQuery(raw: string | undefined): string {
  const query = (raw ?? "").trim().slice(0, MAX_SEARCH_LENGTH)

  return query.length >= MIN_SEARCH_LENGTH ? query : ""
}

function normaliseHandle(raw: string | undefined): string | null {
  const handle = (raw ?? "").trim().toLowerCase()

  return HANDLE_PATTERN.test(handle) ? handle : null
}

function normalisePrice(raw: string | undefined): number | null {
  const value = (raw ?? "").trim()

  if (!PRICE_PATTERN.test(value)) {
    return null
  }

  const amount = Number(value)

  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_PRICE) {
    return null
  }

  return amount
}

function normaliseBoolean(raw: string | undefined): boolean {
  return raw === "1" || raw === "true"
}

/**
 * Read the multi-select species list out of one comma-separated parameter.
 *
 * Comma-separated rather than repeated `?species=dog&species=cat` because
 * Next.js hands a server component a `string | string[]` and the array shape has
 * no stable order, so a copied link could re-render the same selection in a
 * different order. One parameter with a deterministic split cannot.
 */
function normaliseSpecies(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(isSpeciesCode)
    .filter((code, index, all) => all.indexOf(code) === index)
    .slice(0, MAX_SPECIES_SELECTION)
}

/**
 * Narrow a raw `life_stage` to the closed set.
 *
 * `all` is a REAL value a shopper can pick, so it is kept; anything outside the
 * set is dropped rather than forwarded, exactly like a bad price.
 */
function normaliseLifeStage(raw: string | undefined): string | null {
  const value = (raw ?? "").trim().toLowerCase()

  return isLifeStage(value) ? value : null
}

function normaliseSort(raw: string | undefined): CatalogueSort {
  return CATALOGUE_SORTS.includes(raw as CatalogueSort)
    ? (raw as CatalogueSort)
    : DEFAULT_SORT
}

function normalisePage(raw: string | undefined): number {
  const page = Number.parseInt((raw ?? "").trim(), 10)

  if (!Number.isFinite(page) || page < 1) {
    return 1
  }

  return Math.min(page, MAX_PAGE)
}

/**
 * Read the sanitised state out of a query string.
 *
 * The two price inputs are ONE filter, so a reversed range is read as the range
 * the shopper obviously meant rather than as an impossible request that returns
 * nothing.
 */
export function readCatalogueState(
  input: CatalogueParamsInput
): CatalogueState {
  const minPrice = normalisePrice(
    firstValue(input, CATALOGUE_QUERY_KEYS.minPrice)
  )
  const rawMaxPrice = normalisePrice(
    firstValue(input, CATALOGUE_QUERY_KEYS.maxPrice)
  )

  const hasBothPrices = minPrice !== null && rawMaxPrice !== null
  const isReversed = hasBothPrices && minPrice > rawMaxPrice

  return {
    query: normaliseQuery(firstValue(input, CATALOGUE_QUERY_KEYS.query)),
    category: normaliseHandle(
      firstValue(input, CATALOGUE_QUERY_KEYS.category)
    ),
    brand: normaliseHandle(firstValue(input, CATALOGUE_QUERY_KEYS.brand)),
    species: normaliseSpecies(firstValue(input, CATALOGUE_QUERY_KEYS.species)),
    lifeStage: normaliseLifeStage(
      firstValue(input, CATALOGUE_QUERY_KEYS.lifeStage)
    ),
    minPrice: isReversed ? rawMaxPrice : minPrice,
    maxPrice: isReversed ? minPrice : rawMaxPrice,
    inStock: normaliseBoolean(firstValue(input, CATALOGUE_QUERY_KEYS.inStock)),
    sort: normaliseSort(firstValue(input, CATALOGUE_QUERY_KEYS.sort)),
    page: normalisePage(firstValue(input, CATALOGUE_QUERY_KEYS.page)),
  }
}

/**
 * Merge a partial change into the current query string and serialise it.
 *
 * Any parameter this module does not own is carried over untouched, which is how
 * the country code context (a path segment) and any future parameter survive a
 * filter change.
 */
export function writeCatalogueState(
  current: URLSearchParams,
  change: Partial<CatalogueState> & { page?: number }
): string {
  const params = new URLSearchParams(current)
  const next = { ...readCatalogueState(current), ...change }

  const assign = (key: string, value: string) => {
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
  }

  assign(CATALOGUE_QUERY_KEYS.query, next.query)
  assign(CATALOGUE_QUERY_KEYS.category, next.category ?? "")
  assign(CATALOGUE_QUERY_KEYS.brand, next.brand ?? "")
  assign(CATALOGUE_QUERY_KEYS.species, next.species.join(","))
  assign(CATALOGUE_QUERY_KEYS.lifeStage, next.lifeStage ?? "")
  assign(
    CATALOGUE_QUERY_KEYS.minPrice,
    next.minPrice === null ? "" : String(next.minPrice)
  )
  assign(
    CATALOGUE_QUERY_KEYS.maxPrice,
    next.maxPrice === null ? "" : String(next.maxPrice)
  )
  assign(CATALOGUE_QUERY_KEYS.inStock, next.inStock ? "1" : "")
  assign(
    CATALOGUE_QUERY_KEYS.sort,
    next.sort === DEFAULT_SORT ? "" : next.sort
  )

  // A changed filter invalidates the current page: staying on page 4 of a
  // two-page result set is how a shopper ends up staring at an empty grid.
  const page = change.page ?? 1

  if (page > 1) {
    params.set(CATALOGUE_QUERY_KEYS.page, String(page))
  } else {
    params.delete(CATALOGUE_QUERY_KEYS.page)
  }

  return params.toString()
}

/** True when the state asks for the unfiltered catalogue. */
export function isDefaultCatalogueState(state: CatalogueState): boolean {
  return (
    state.query === "" &&
    state.category === null &&
    state.brand === null &&
    state.species.length === 0 &&
    state.lifeStage === null &&
    state.minPrice === null &&
    state.maxPrice === null &&
    !state.inStock &&
    state.sort === DEFAULT_SORT &&
    state.page === 1
  )
}

/**
 * One entry per GROUP a shopper can see, never per technical parameter.
 *
 * "Filtrar (2)" for a category plus a price range, not "Filtrar (3)" because
 * `min_price`, `max_price` and `sort` are three separate query parameters. Sort
 * only counts when it differs from the default: relevance is what the page
 * already does, so counting it would inflate the badge with no visible effect.
 */
export type CatalogueFilterGroupId =
  | "query"
  | "category"
  | "brand"
  | "species"
  | "lifeStage"
  | "price"
  | "stock"
  | "sort"

export function activeFilterGroups(
  state: CatalogueState
): CatalogueFilterGroupId[] {
  const groups: CatalogueFilterGroupId[] = []

  if (state.query) {
    groups.push("query")
  }

  if (state.category) {
    groups.push("category")
  }

  if (state.brand) {
    groups.push("brand")
  }

  // ONE group for the whole multi-select, not one per tick: four species ticked
  // is a single decision the shopper made, and "Filtrar (4)" next to "Especie"
  // with four boxes ticked reads as four different filters.
  if (state.species.length > 0) {
    groups.push("species")
  }

  if (state.lifeStage) {
    groups.push("lifeStage")
  }

  if (state.minPrice !== null || state.maxPrice !== null) {
    groups.push("price")
  }

  if (state.inStock) {
    groups.push("stock")
  }

  if (state.sort !== DEFAULT_SORT) {
    groups.push("sort")
  }

  return groups
}

/** The number shown on the "Filtrar" trigger. */
export function activeFilterCount(state: CatalogueState): number {
  return activeFilterGroups(state).length
}

/** Every commercial parameter, i.e. everything "Limpiar filtros" removes. */
export const COMMERCIAL_QUERY_KEYS: string[] = [
  CATALOGUE_QUERY_KEYS.query,
  CATALOGUE_QUERY_KEYS.category,
  CATALOGUE_QUERY_KEYS.brand,
  CATALOGUE_QUERY_KEYS.species,
  CATALOGUE_QUERY_KEYS.lifeStage,
  CATALOGUE_QUERY_KEYS.minPrice,
  CATALOGUE_QUERY_KEYS.maxPrice,
  CATALOGUE_QUERY_KEYS.inStock,
  CATALOGUE_QUERY_KEYS.sort,
  CATALOGUE_QUERY_KEYS.page,
]

/**
 * Drop the commercial filters and keep the context.
 *
 * The country code is a path segment, so it cannot be lost by rewriting the
 * query string, and any parameter this module does not own is carried over.
 * Paging goes too: the first page of the unfiltered catalogue is the only page
 * that is guaranteed to exist.
 */
export function clearCommercialFilters(current: URLSearchParams): string {
  const params = new URLSearchParams(current)

  COMMERCIAL_QUERY_KEYS.forEach((key) => params.delete(key))

  return params.toString()
}