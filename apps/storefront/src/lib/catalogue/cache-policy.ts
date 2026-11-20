/**
 * Cache classification for the storefront, and the invalidation hooks that the
 * INSTALLED Next.js actually exposes.
 *
 * Verified against `next@15.5.24` (apps/storefront/package.json) by reading
 * `next/dist/server/web/spec-extension/revalidate.d.ts` in node_modules:
 *
 *   export declare function revalidateTag(tag: string): undefined
 *   export declare function revalidatePath(originalPath: string, type?: 'layout' | 'page'): undefined
 *
 * So both are available, and `revalidateTag` takes ONE argument in this version
 * (the two-argument `revalidateTag(tag, profile)` form belongs to a later
 * release; do not "upgrade" the call without bumping Next).
 *
 * ---------------------------------------------------------------------------
 * Tier 1 — catalogue reference data: CACHEABLE
 * ---------------------------------------------------------------------------
 *   `listCategories` / `getCategoryByHandle` / `listCollections` /
 *   `getCollectionByHandle` — the shape of the taxonomy and of the collections.
 *   These change when merchandising changes, not when a shopper acts, and they
 *   are read on nearly every page, so they stay `force-cache` with the Medusa
 *   cache tag (`getCacheOptions("categories"|"collections")`), which is scoped
 *   per publishable key and therefore invalidated by Medusa itself.
 *
 *   THE TRAP: a stale `.next` once made the home rails render nothing, because
 *   `force-cache` keeps a cached response even when the code around it changed.
 *   Any NEW reference-data read added to a filter-dependent path must not
 *   inherit this flag blindly.
 *
 * ---------------------------------------------------------------------------
 * Tier 2 — search results: NEVER ETERNAL
 * ---------------------------------------------------------------------------
 *   `searchCatalogue` (this folder) and `listProductsByIds`.
 *
 *   Search requests go through `@medusajs/js-sdk`, which attaches no `cache` and
 *   no `next` hint, so Next.js treats them as `no-store` — which is exactly the
 *   intent. `listProductsByIds` states it explicitly with `cache: "no-store"`
 *   because it hydrates filter-dependent results.
 *
 *   Why it matters: results depend on filters, sort, page AND the index version.
 *   A reindex (`active_version` bump) changes what `/store` should show without
 *   changing a single row the storefront can tag. Cached eternal content would
 *   keep serving the previous version's documents.
 *
 * ---------------------------------------------------------------------------
 * Tier 3 — home merchandising: CACHEABLE, but revalidate explicitly
 * ---------------------------------------------------------------------------
 *   The rails are built from cached collections plus a region-priced product
 *   fetch. They are the first thing that looks wrong after a price-list change,
 *   and they carry no shopper-specific state, so a short revalidation window is
 *   enough. See `REVALIDATION` below.
 *
 * ---------------------------------------------------------------------------
 * THE `on_sale_*` CAVEAT — do not build an offers filter on it
 * ---------------------------------------------------------------------------
 * `on_sale_<currency>` is facetable and looks exactly like the thing an "on sale"
 * filter needs. It is NOT trustworthy here, and no component offers it.
 *
 * The index resolves prices with `QueryContext({ currency_code })` only. The demo
 * discount is a REGION-SCOPED price list. So for a product the Store API really
 * sells at 24 instead of 28, the index records
 * `min_price_pen = original_price_pen = 28` and `on_sale_pen = false`.
 *
 * Consequences, all deliberate:
 *  - `min_price_*` / `max_price_*` ARE trustworthy and carry the PEN price filter.
 *  - The offers route is the real `ofertas` Medusa COLLECTION, which
 *    `bootstrap-vet-catalog.ts` populates from that same price list.
 *  - Product cards and the product page derive the true discount from the Store
 *    API (`calculated_price.calculated_price.price_list_type === "sale"`).
 *  - The price facet bound shown in the filter panel is a RANGE, not a discount
 *    signal, so it stays honest.
 *
 * ---------------------------------------------------------------------------
 * Tier 4 — shopper-scoped data: NEVER SHARED
 * ---------------------------------------------------------------------------
 *   `retrieveCustomer`, `listOrders`, `retrieveOwnedOrder`, `retrieveOrder`.
 *
 *   These return one shopper's own record. They used to run with
 *   `force-cache` and the shared `getCacheTag("customers"|"orders")` tag, which
 *   is `tag-<_medusa_cache_id>` — a per-BROWSER cookie, not a per-user one. Two
 *   accounts used on the same browser therefore shared one cache entry, and
 *   `/store/orders` has no secret in its URL at all, so the Data Cache key was
 *   identical for every shopper in the world. That is a cross-user leak: Customer
 *   A's order list could be served to Customer B.
 *
 *   They are now `no-store`. That costs nothing: `getAuthHeaders()` reads
 *   `cookies()`, which already forces a dynamic render, so `force-cache` could
 *   never have produced a static page for a signed-in shopper. The Data Cache was
 *   pure downside here. See the header of `@lib/data/orders.ts` and
 *   `@lib/data/customer.ts` for the full argument.
 *
 *   Residual note, deliberately NOT changed here: `retrieveCart` in
 *   `@lib/data/cart` still uses `force-cache`. Its cache key contains the cart id
 *   in the URL, and a cart id is a secret, so a leak needs the id rather than
 *   merely being the next shopper through the door. That is a materially smaller
 *   exposure than tier 4 and it belongs to the cart/checkout surface verified in
 *   an earlier phase, so it is recorded rather than changed unilaterally. It
 *   should move to `no-store` in the same pass that owns the checkout.
 *
 * ---------------------------------------------------------------------------
 * Recommendation
 * ---------------------------------------------------------------------------
 * Do NOT build a webhook layer for this phase. In order of value:
 *
 *  1. Search results (tier 2) need no invalidation at all because they are never
 *     cached. This removes the whole class of "stale search results" bugs.
 *  2. Reference data keeps its Medusa cache tags; Medusa already calls
 *     `revalidateTag` for the tags it owns when catalogue data changes.
 *  3. When a Medusa-side webhook is added later, one route handler calling
 *     `revalidateTag(tag)` for the affected tag, plus `revalidatePath` for the
 *     home page and the affected category/collection paths, is enough. Both
 *     functions exist in this Next version, as shown above.
 *  4. `revalidatePath` alone cannot help tier 2: path invalidation re-renders the
 *     page, it does not change what the search engine returns.
 */

export const REVALIDATION = {
  /** Seconds. Only used if a caller opts a reference read into time-based caching. */
  referenceDataSeconds: 60 * 60,
  /** Seconds. Short enough that a price-list change is visible quickly. */
  merchandisingSeconds: 60,
} as const

/**
 * Cache directives, named so call sites read as intent rather than as a flag.
 * `no-store` is explicit on the two filter-dependent reads; the reference reads
 * keep `force-cache` inside `@lib/data/*`.
 */
export const CACHE_POLICY = {
  /** Categories and collections. Stable per publishable key. */
  referenceData: "force-cache",
  /** Search results, and the product hydration that renders them. */
  searchResults: "no-store",
  /** Region-priced reads that feed the home rails. */
  merchandising: "force-cache",
  /**
   * One shopper's own data: customer record, saved addresses, orders. Never
   * shared between accounts — see tier 4 above for the leak this replaced.
   */
  customerScoped: "no-store",
} as const