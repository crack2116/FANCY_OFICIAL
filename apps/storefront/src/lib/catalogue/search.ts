/**
 * The catalogue's read path: one search request per page view, answered by the
 * product index.
 *
 * Why the engine and not `GET /store/products`:
 *  - Sorting has to happen BEFORE paging. Re-sorting an already-paginated page
 *    gives the wrong products on every page after the first, which is what the
 *    old `listProductsWithSort` did after fetching 100 products and slicing.
 *  - The engine owns the facets, so filtering, sorting, the exact total and the
 *    price range all come from one consistent snapshot.
 *
 * `POST /store/search` is the only search route. There is no `GET` variant by
 * design, and `q`/`limit` are NOT top-level fields: the free-text query lives in
 * `filters.q` and paging in `pagination.skip`/`pagination.take`. All of that
 * translation is done by `@medusajs/instantsearch-adapter`, which is why this
 * module speaks InstantSearch search parameters and never a raw search body.
 *
 * Caching: this request is deliberately NOT cached. The SDK issues it with no
 * `cache`/`next` hint, so Next.js treats it as `no-store` (see the policy in
 * `./cache-policy`). Filtered, sorted, paged search results are shopper-specific
 * views; freezing one as eternal static content is what previously left the
 * storefront rendering stale results after a reindex.
 */

import { PRODUCT_INDEX_NAME, priceAttribute, searchClient } from "@lib/search-client"
import type { CatalogueSort, CatalogueState } from "@lib/catalogue/state"
import { lifeStageLabel, speciesLabel } from "@lib/pet-product"

import type {
  InstantSearchRequest,
  InstantSearchSearchResponse,
} from "@medusajs/instantsearch-adapter"

/** Default page size. 12 keeps the grid above the fold on a 1024px screen. */
export const CATALOGUE_PAGE_SIZE = 12

/**
 * Upper bound on the product-id allow-list pushed into a single query.
 *
 * A category or collection page restricts the listing to the ids that belong to
 * it, and the availability filter restricts it to the ids that can be bought.
 * Both are real data, so they go into the query as an `id IN (...)` filter and
 * the engine keeps doing the sorting, the counting and the paging.
 *
 * The guard exists so a runaway catalogue produces a clear error instead of an
 * unbounded filter expression. It is far above this project's catalogue.
 */
export const ID_SCOPE_LIMIT = 1000

export type CataloguePriceBounds = { min: number; max: number }

export type CatalogueSearchResult = {
  /** Product ids for the requested page, in the engine's own order. */
  ids: string[]
  /** Total matches for the current filters, straight from the index. */
  count: number
  page: number
  totalPages: number
  /**
   * Lowest and highest indexed `min_price_*` for this query, used to bound and
   * describe the price inputs. Computed WITHOUT the price refinement so the
   * range does not move while the shopper is typing in it.
   */
  priceBounds: CataloguePriceBounds | null
  /**
   * What the filter panel may offer, with counts, taken from the engine's own
   * facet response for this exact query. Only values the engine actually
   * matched appear here: a value with no products is omitted rather than shown
   * as "(0)", because a shopper cannot act on a filter that leads nowhere and a
   * list of zeroes reads as a broken catalogue.
   */
  petFacets: PetFacets
}

export type CatalogueSearchInput = {
  currencyCode: string
  state: CatalogueState
  hitsPerPage?: number
  /** Restrict to these product ids (a category's or a collection's products). */
  scopeIds?: string[]
  /**
   * The category NAME the handle resolved to. The index stores category names,
   * not handles — see `resolveCategoryName` for why that matters.
   */
  categoryName?: string | null
  /** Extra `id IN (...)` allow-list, used by the availability filter. */
  allowedIds?: string[]
}

/**
 * Sort expressions understood by the product index.
 *
 * `min_price_*` and `created_at` are declared `sortable`, so the ordering is
 * applied by the engine over the whole match set before the page is cut.
 *
 * There is deliberately NO "best selling" / "popularity" option: nothing in the
 * project records sales, so any such ordering would be an invention.
 *
 * KNOWN CONSEQUENCE, documented because it looks like a bug otherwise: the index
 * resolves prices with a currency context ONLY, so its `min_price_*` is the
 * amount before any region-scoped price list. The cards, meanwhile, show the
 * Store API price after that price list. A discounted product can therefore sit
 * next to a neighbour whose DISPLAYED price is lower than its own even though the
 * indexed order is strictly ascending.
 *
 * Sorting on the displayed value instead would mean fetching a page, re-sorting
 * it and slicing it — which is what the previous `listProductsWithSort` did, and
 * which returns the wrong products on every page after the first. Engine-side
 * ordering is the correct trade.
 */
function sortIndexName(sort: CatalogueSort, currencyCode: string): string {
  switch (sort) {
    case "price_asc":
      return `${PRODUCT_INDEX_NAME}/sort/${priceAttribute("min_price", currencyCode)}:asc`
    case "price_desc":
      return `${PRODUCT_INDEX_NAME}/sort/${priceAttribute("min_price", currencyCode)}:desc`
    case "created_at":
      return `${PRODUCT_INDEX_NAME}/sort/created_at:desc`
    default:
      return PRODUCT_INDEX_NAME
  }
}

/**
 * Numeric filters over the region's price field.
 *
 * `min_price_*` is trustworthy: the index resolves prices with a currency
 * context and writes the real calculated amount. This is NOT true of
 * `on_sale_*` — see the note in `./cache-policy` and on the offers route.
 */
function priceFilters(state: CatalogueState, currencyCode: string) {
  const field = priceAttribute("min_price", currencyCode)
  const filters: string[] = []

  if (state.minPrice !== null) {
    filters.push(`${field}>=${state.minPrice}`)
  }

  if (state.maxPrice !== null) {
    filters.push(`${field}<=${state.maxPrice}`)
  }

  return filters
}

/**
 * A facet group of `id:<value>` entries. The adapter collapses a group of values
 * on the same field into a single `{ $in: [...] }`, which is far cheaper than
 * an `$and` of `$eq`s.
 */
function idScopeFilter(ids: string[]): string[] {
  return ids.map((id) => `id:${id}`)
}

function mergeIdScopes(
  scopeIds: string[] | undefined,
  allowedIds: string[] | undefined
): string[] | undefined {
  if (scopeIds && allowedIds) {
    return scopeIds.filter((id) => allowedIds.includes(id))
  }

  return scopeIds ?? allowedIds
}

/**
 * Run one listing query plus one bounds query, in a single request.
 *
 * The bounds query repeats the free-text query but drops the price refinement,
 * so the shopper always sees the full price span their query allows. Asking for
 * both at once costs one HTTP round trip rather than two.
 *
 * WHY THE THIRD QUERY
 * -------------------
 * The brand facet is `brand_name` because that is the only brand field the index
 * declares `facetable()` — `brand_handle` is filterable and retrievable but NOT
 * facetable, and the reason is sound: a shopper reads "NutriPet Demo", never
 * `nutripet-demo`. But the URL must carry the HANDLE (`?brand=nutripet-demo`),
 * so the UI needs a name -> handle mapping.
 *
 * The mapping is read from the index's own documents, one extra query inside the
 * SAME HTTP request: `fields: ["brand_name", "brand_handle"]`, so each hit is
 * just those two values. That is not an N+1 — the adapter already batches two
 * queries per page view and this is a third in the same round trip, so the cost
 * is one engine query, not one per product and not one per brand.
 *
 * The alternative — a separate Store API read to list brands — would need a
 * second network call and would go stale independently of the index. Reading the
 * pairing from the same snapshot that produced the facet counts means a filter
 * option can never point at a handle the engine has not just seen.
 */
export async function searchCatalogue({
  currencyCode,
  state,
  hitsPerPage = CATALOGUE_PAGE_SIZE,
  scopeIds,
  categoryName,
  allowedIds,
}: CatalogueSearchInput): Promise<CatalogueSearchResult> {
  const pageSize = Math.max(1, Math.floor(hitsPerPage))
  const pageIndex = Math.max(0, state.page - 1)
  const allowed = mergeIdScopes(scopeIds, allowedIds)

  if (allowed && allowed.length > ID_SCOPE_LIMIT) {
    throw new Error(
      `Catalogue scope of ${allowed.length} products exceeds the supported limit of ${ID_SCOPE_LIMIT}.`
    )
  }

  // An explicitly restricted catalogue that the restriction empties must return
  // nothing rather than falling back to the whole catalogue.
  if (allowed && allowed.length === 0) {
    return {
      ids: [],
      count: 0,
      page: state.page,
      totalPages: 0,
      priceBounds: null,
      petFacets: EMPTY_PET_FACETS,
    }
  }

  const numericFilters = priceFilters(state, currencyCode)
  const petFilters = petProductFilters(state)
  const facetFilters: Array<string | string[]> = []

  if (categoryName) {
    facetFilters.push(`category:${categoryName}`)
  }

  const idFilters = allowed ? idScopeFilter(allowed) : []

  if (idFilters.length) {
    facetFilters.push(idFilters)
  }

  const resultsQuery: InstantSearchRequest = {
    indexName: sortIndexName(state.sort, currencyCode),
    params: {
      query: state.query,
      page: pageIndex,
      hitsPerPage: pageSize,
      ...(facetFilters.length ? { facetFilters } : {}),
      ...(petFilters.length ? { facetFilters: [...facetFilters, ...petFilters] } : {}),
      ...(numericFilters.length ? { numericFilters } : {}),
    },
  }

  // Declared in `numericAttributes`, so the adapter requests it as a `stats`
  // facet and the response carries `facets_stats` with the min and max.
  //
  // It also carries the pet FACET VALUES. This is the query that decides what the
  // filter panel offers, so it deliberately drops the pet refinements too:
  // selecting Perro must not make the Especie list collapse to Perro alone, or a
  // shopper could never widen the selection again. The category and id scopes
  // stay, because those are the PAGE's scope, not a filter the shopper ticked.
  const boundsQuery: InstantSearchRequest = {
    indexName: sortIndexName(state.sort, currencyCode),
    params: {
      query: state.query,
      hitsPerPage: 0,
      page: 0,
      ...(facetFilters.length ? { facetFilters } : {}),
      facets: [
        priceAttribute("min_price", currencyCode),
        ...PET_FACET_FIELDS,
      ],
    },
  }

  // Name -> handle, for the brand filter. See the note above.
  const brandDirectoryQuery: InstantSearchRequest = {
    indexName: PRODUCT_INDEX_NAME,
    params: {
      query: "",
      page: 0,
      hitsPerPage: MAX_BRAND_DIRECTORY_TAKE,
      fields: ["brand_name", "brand_handle"],
    },
  }

  const { results } = await searchClient.search([
    resultsQuery,
    boundsQuery,
    brandDirectoryQuery,
  ])
  const [result, bounds, brandDirectory] = results as [
    InstantSearchSearchResponse,
    InstantSearchSearchResponse,
    InstantSearchSearchResponse,
  ]

  const count = result?.nbHits ?? 0
  const totalPages = pageSize > 0 ? Math.ceil(count / pageSize) : 0

  return {
    ids: (result?.hits ?? [])
      .map((hit) => String(hit.objectID ?? ""))
      .filter(Boolean),
    count,
    page: state.page,
    totalPages,
    priceBounds: readPriceBounds(bounds, currencyCode),
    petFacets: readPetFacets(
      bounds,
      brandHandleByName(brandDirectory),
      state
    ),
  }
}

/**
 * The engine's own maximum page size (`MAX_SEARCH_TAKE` in the store search
 * validator). The brand directory cannot ask for more than this, which is the
 * documented ceiling on how many distinct brands a filter can offer.
 */
export const MAX_BRAND_DIRECTORY_TAKE = 100

/** Facet fields that drive the pet-product filter groups. */
const PET_FACET_FIELDS = ["brand_name", "species", "life_stage", "pet_size"] as const

/**
 * Filter expressions over the linked commercial fields.
 *
 * `brand_handle` is used rather than `brand_name` so a URL keeps working if a
 * brand is RENAMED: the handle is the URL key and does not change, while the name
 * does. `species` is collapsed to a single `$in` by the adapter rather than an
 * `$and` of `$eq`s, which is what makes "Perro or Gato" one filter.
 */
function petProductFilters(state: CatalogueState): Array<string | string[]> {
  const filters: Array<string | string[]> = []

  if (state.brand) {
    filters.push(`brand_handle:${state.brand}`)
  }

  if (state.species.length === 1) {
    filters.push(`species:${state.species[0]}`)
  } else if (state.species.length > 1) {
    filters.push(state.species.map((code) => `species:${code}`))
  }

  if (state.lifeStage) {
    filters.push(`life_stage:${state.lifeStage}`)
  }

  return filters
}

/** One selectable value of a facet, as the panel needs it. */
export type FacetOption = {
  /** The value the URL carries: a brand HANDLE, or a species/enum code. */
  value: string
  /** What the shopper reads. */
  label: string
  /** How many products the engine matched for this value. */
  count: number
}

export type PetFacets = {
  /**
   * Brand options, as HANDLE + label + count.
   *
   * A KNOWN LIMITATION, INHERITED FROM THE INDEX, NOT INTRODUCED HERE
   * ----------------------------------------------------------------
   * Only `handle` is unique; two brands may share a `name`. Because the facet is
   * on `brand_name`, the engine counts those two as ONE value and the name ->
   * handle mapping resolves to whichever handle was read last, so a duplicated
   * name yields one option pointing at one of its brands with the combined count.
   * Nothing here can fix that without an index change (a facetable handle, or a
   * uniqueness constraint on the name), both of which are backend work. It is
   * documented rather than worked around: a filter that silently summed two
   * brands would be worse than one that picks one.
   *
   * The UI mitigates it in the only place it can — `validateBrandForm` in the
   * Admin asks for a distinct handle per brand and the storefront's `?brand=`
   * always travels by handle — so a merchant who follows the hint never hits it.
   */
  brands: FacetOption[]
  species: FacetOption[]
  lifeStages: FacetOption[]
}

const EMPTY_PET_FACETS: PetFacets = {
  brands: [],
  species: [],
  lifeStages: [],
}

/**
 * Read one value facet out of a response.
 *
 * The adapter has already flattened Medusa's `{ type: "value", values: [...] }`
 * into InstantSearch's `Record<value, count>` shape — see `adaptFacets` in
 * `@medusajs/instantsearch-adapter` — so that is what is read here. A zero count
 * is dropped: the engine counts every value it has ever seen, including ones the
 * current refinement excluded, and "(0)" is not something to offer a shopper.
 */
function readFacetValues(
  response: InstantSearchSearchResponse | undefined,
  field: string
): { value: string; count: number }[] {
  const facet = response?.facets?.[field]

  if (!facet) {
    return []
  }

  return Object.entries(facet)
    .map(([value, count]) => ({ value, count }))
    .filter((entry) => typeof entry.count === "number" && entry.count > 0)
}

/** One brand's pairing, as a single flattened index hit carries it. */
export type BrandHit = {
  brand_name?: string | null
  brand_handle?: string | null
}

/**
 * Read a brand's name/handle pair out of a search hit.
 *
 * THE ADAPTER FLATTENS THE DOCUMENT, AND ITS TYPE SAYS OTHERWISE
 * -----------------------------------------------------------
 * `adaptHit` in `@medusajs/instantsearch-adapter` returns
 * `{ ...hit.document, objectID }` — the document's fields sit at the TOP LEVEL of
 * the hit, with no `document` property. The published `InstantSearchHit<T>` type
 * declares `document: T`, so reading `hit.document.brand_name` type-checks and
 * silently returns `undefined` for every hit at runtime. Verified against the
 * installed 2.21.2 bundle, not inferred.
 *
 * So the flattened shape is declared here, in one place, with a single cast, and
 * every reader goes through it. This is the only cast in the catalogue search
 * path and it exists because the upstream type does not describe the upstream
 * runtime.
 */
export function readBrandHit(hit: unknown): BrandHit {
  return (hit ?? {}) as BrandHit
}

/**
 * `brand_name` -> `brand_handle`, from the directory query's hits.
 *
 * A name with no handle in the mapping is DROPPED, not guessed: a filter option
 * whose URL value cannot be resolved would silently return zero results, which
 * is worse than the option being absent.
 */
function brandHandleByName(
  response: InstantSearchSearchResponse | undefined
): Record<string, string> {
  const mapping: Record<string, string> = {}

  for (const hit of response?.hits ?? []) {
    const { brand_name: name, brand_handle: handle } = readBrandHit(hit)

    if (name && handle) {
      mapping[name] = handle
    }
  }

  return mapping
}

/**
 * Turn the engine's facet counts into selectable options.
 *
 * `pet_size` is read and deliberately NOT offered. Its live values are `all: 13`
 * and `medium: 1`: a size filter would be one useful option and one bucket that
 * means "no restriction", and a group that offers "Todos los tamaños (13)" next
 * to "Raza mediana (1)" teaches a shopper that the size data is barely filled in
 * — while promising that choosing "Raza mediana" narrows to one product. The
 * data is presented on the product page instead, where there is room to explain
 * it. If the catalogue ever holds real `small`/`large` values this becomes worth
 * adding, and the field is already facetable and filterable.
 */
function readPetFacets(
  response: InstantSearchSearchResponse | undefined,
  handlesByName: Record<string, string>,
  state: CatalogueState
): PetFacets {
  const brands = readFacetValues(response, "brand_name")
    .map((entry) => {
      const handle = handlesByName[entry.value]

      return handle
        ? { value: handle, label: entry.value, count: entry.count }
        : null
    })
    .filter((entry): entry is FacetOption => entry !== null)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))

  const species = readFacetValues(response, "species")
    .map((entry) => ({
      value: entry.value,
      label: speciesLabel(entry.value),
      count: entry.count,
    }))
    .sort((a, b) => a.count - b.count || a.label.localeCompare(b.label))

  // A selected value is kept in the list even when the current refinement leaves
  // it with no matches, so the shopper can see — and un-tick — what they chose.
  // Without this, ticking "Senior" and reaching an empty grid makes the filter
  // panel forget the selection, and there is no way back short of the URL.
  /*
   * `all` is the sentinel a merchant stores on a product that suits every life
   * stage, not a life stage of its own. The panel already renders a reset radio
   * ("Todas las etapas") for "no life-stage refinement"; keeping the facet value
   * as well produced two identically labelled radios with the same DOM id, and
   * selecting the second one silently narrowed the grid to the products whose
   * profile literally says `all` — the opposite of what its label promises.
   */
  const lifeStages = readFacetValues(response, "life_stage")
    .filter((entry) => entry.value !== "all")
    .map((entry) => ({
      value: entry.value,
      label: lifeStageLabel(entry.value) ?? entry.value,
      count: entry.count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))

  if (state.lifeStage && !lifeStages.some((entry) => entry.value === state.lifeStage)) {
    const label = lifeStageLabel(state.lifeStage)

    if (label) {
      lifeStages.push({ value: state.lifeStage, label, count: 0 })
    }
  }

  return { brands, species, lifeStages }
}

function readPriceBounds(
  response: InstantSearchSearchResponse | undefined,
  currencyCode: string
): CataloguePriceBounds | null {
  const stats = response?.facets_stats?.[priceAttribute("min_price", currencyCode)]

  if (!stats || !Number.isFinite(stats.min) || !Number.isFinite(stats.max)) {
    return null
  }

  return { min: Math.floor(stats.min), max: Math.ceil(stats.max) }
}