/**
 * Reading brands in the storefront.
 *
 * WHY THIS READS THROUGH THE PRODUCT INDEX AND NOT A BRAND ENDPOINT
 * ------------------------------------------------------------------
 * There is no `/store/brands`: the Store API exposes a brand only as a linked
 * field of a product (`?fields=+brand.name,+brand.handle`), and the brief's
 * verified contract confirms that. So a brand's page and its product list are
 * both derived from the product index — which is also what keeps them
 * consistent, because the brand page resolves its products with the SAME
 * `brand_handle` filter the facet uses. One code path, no way for the page and
 * the facet to disagree about which products belong to a brand.
 *
 * NO PRODUCT COUNTING
 * -------------------
 * The per-brand count comes from the engine's own `brand_name` facet, in the same
 * batched request as the name/handle pairs. Counting rows here would mean
 * shipping every product to the browser to count it, and asking the engine once
 * per brand would be one round trip per brand. Both are the fan-out this module
 * exists to avoid.
 *
 * NOT CACHED
 * ----------
 * These reads go through the search client, which attaches no cache hint, so
 * Next treats them as `no-store`. That is deliberate: the brand directory is
 * derived from index documents, and a frozen copy is what would keep serving a
 * brand the merchant has already deactivated. See `@lib/catalogue/cache-policy`.
 */

import {
  MAX_BRAND_DIRECTORY_TAKE,
  readBrandHit,
  searchCatalogue,
} from "@lib/catalogue/search"
import { EMPTY_CATALOGUE_STATE } from "@lib/catalogue/state"
import { listProducts } from "@lib/data/products"
import { PRODUCT_INDEX_NAME, searchClient } from "@lib/search-client"

import type {
  InstantSearchRequest,
  InstantSearchSearchResponse,
} from "@medusajs/instantsearch-adapter"

export type StorefrontBrand = {
  name: string
  handle: string
  /** How many products the engine matched for this brand. */
  count: number
  /**
   * `null` from `listBrands`, which reads the product index and therefore never
   * carries marketing copy.
   *
   * The brand page fills it in through `retrieveBrandDescription`, which reads
   * the field the store route's public allow-list now permits. Kept on the type so
   * the page has one place to read a description from, and so a future brand
   * directory endpoint can populate it without touching the template.
   */
  description: string | null
}

/** Mirrors `HANDLE_PATTERN` in `@lib/catalogue/state`. */
const HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function normaliseBrandHandle(raw: string): string | null {
  const handle = (raw ?? "").trim().toLowerCase()

  return HANDLE_PATTERN.test(handle) ? handle : null
}

/**
 * Every brand that has at least one product, most products first.
 *
 * ONE HTTP request carrying two engine queries: the name/handle pairs, and the
 * `brand_name` facet that counts them.
 */
export async function listBrands(): Promise<StorefrontBrand[]> {
  const directoryQuery: InstantSearchRequest = {
    indexName: PRODUCT_INDEX_NAME,
    params: {
      query: "",
      page: 0,
      hitsPerPage: MAX_BRAND_DIRECTORY_TAKE,
      fields: ["brand_name", "brand_handle"],
    },
  }

  const facetQuery: InstantSearchRequest = {
    indexName: PRODUCT_INDEX_NAME,
    params: {
      query: "",
      page: 0,
      hitsPerPage: 0,
      facets: ["brand_name"],
    },
  }

  const { results } = await searchClient.search([directoryQuery, facetQuery])
  const [directory, facets] = results as [
    InstantSearchSearchResponse,
    InstantSearchSearchResponse,
  ]

  const countsByName = facets?.facets?.brand_name ?? {}
  const byHandle = new Map<string, StorefrontBrand>()

  for (const hit of directory?.hits ?? []) {
    // The adapter flattens the document; see `readBrandHit`.
    const { brand_name: name, brand_handle: handle } = readBrandHit(hit)

    if (!name || !handle || byHandle.has(handle)) {
      continue
    }

    // A name with no facet entry cannot be shown with a count, and a brand row
    // whose count is unknown would have to render as a lie or be hidden.
    const count = countsByName[name] ?? 0

    if (count > 0) {
      byHandle.set(handle, { name, handle, count, description: null })
    }
  }

  return Array.from(byHandle.values()).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name)
  )
}

/**
 * One brand by handle, or `null`.
 *
 * A handle with no products — a brand that was just created, or one that has been
 * deactivated and no longer appears in the index — resolves to `null` and the
 * page 404s, rather than rendering an empty grid under a confident brand name.
 */
export async function retrieveBrand(handle: string): Promise<StorefrontBrand | null> {
  const normalised = normaliseBrandHandle(handle)

  if (!normalised) {
    return null
  }

  const brands = await listBrands()

  return brands.find((brand) => brand.handle === normalised) ?? null
}

/**
 * A brand's own description, read through ONE product that carries it.
 *
 * WHY NOT THE INDEX: the product index is the source for a brand's name, handle
 * and count, but it deliberately carries no marketing copy — indexing a blob per
 * product to save one request is the wrong trade.
 *
 * WHY ONE PRODUCT IS ENOUGH: the description belongs to the brand, so every
 * product linked to it returns the same string. Asking for a single id keeps this
 * to one request per brand page, not one per product, and it reuses ids the page
 * has already resolved.
 *
 * Returns `null` when the brand has no products or the description was left
 * blank, which is a normal state and renders nothing.
 */
export async function retrieveBrandDescription({
  ids,
  regionId,
}: {
  ids: string[]
  regionId: string
}): Promise<string | null> {
  const [firstId] = ids

  if (!firstId) {
    return null
  }

  const {
    response: { products },
  } = await listProducts({
    regionId,
    queryParams: {
      id: [firstId],
      limit: 1,
      fields: "+brand.description",
    },
  })

  // `HttpTypes.StoreProduct` does not declare module-link fields, so `brand` is
  // not on the type even though the API returns it. This is the one narrowing
  // point for this field, mirroring `readProductPetData` for the pet profile.
  const product = products[0] as
    | { brand?: { description?: string | null } | null }
    | undefined
  const description = product?.brand?.description

  return typeof description === "string" && description.trim() ? description : null
}

/**
 * The ids of every product carrying a brand.
 *
 * Delegates to the ordinary catalogue search so the brand page inherits the same
 * engine-side filtering, sorting and paging as every other listing, and so there
 * is exactly one place that knows how to ask the engine for products.
 *
 * The caller passes the result to `CatalogueResults` as `scopeIds`, which is the
 * same mechanism the collection page uses — so a brand page is a collection page
 * with a different header, not a second listing implementation.
 */
export async function listBrandProductIds({
  handle,
  currencyCode,
}: {
  handle: string
  currencyCode: string
}): Promise<string[]> {
  const result = await searchCatalogue({
    currencyCode,
    state: { ...EMPTY_CATALOGUE_STATE, brand: handle },
  })

  return result.ids
}