import { readCatalogueState } from "@lib/catalogue/state"
import {
  CATALOGUE_PAGE_SIZE,
  ID_SCOPE_LIMIT,
  searchCatalogue,
} from "@lib/catalogue/search"
import { listCategories } from "@lib/data/categories"
import { listProductsByIds, listPurchasableProductIds } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { t } from "@lib/i18n/translations"
import EmptyState from "@modules/common/components/empty-state"
import CatalogueFilters from "@modules/store/components/catalogue/filters"
import SortControl from "@modules/store/components/catalogue/sort-control"
import { Pagination } from "@modules/store/components/pagination"
import ProductGrid from "@modules/store/components/product-grid"

export type CatalogueSearchParams = Record<
  string,
  string | string[] | undefined
>

/**
 * The listing, for every route that shows products.
 *
 * `/store`, `/categories/[...category]` and `/collections/[handle]` all render
 * this, so the category page, the collection page and search results cannot
 * drift apart: they are one component with a different scope.
 *
 * The read path is the product index, not `GET /store/products`. Sorting happens
 * in the engine over the whole match set BEFORE the page is cut, so page 3 of
 * "precio: menor a mayor" really is the third cheapest twelve. The hits are then
 * hydrated into real Store API products, because an index document has no
 * variants and therefore cannot price a card or say whether anything is in
 * stock.
 */
export type CatalogueResultsProps = {
  countryCode: string
  searchParams: CatalogueSearchParams
  /**
   * Restrict the listing to these product ids — a category's or a collection's
   * own products. The id filter is pushed into the same search query, so
   * sorting, counting and paging still happen inside the engine.
   */
  scopeIds?: string[]
  /**
   * Hide the category radios. A category page is already scoped to one
   * category, so offering a second category choice there would only ever produce
   * an empty grid.
   */
  hideCategoryFilter?: boolean
}

export default async function CatalogueResults({
  countryCode,
  searchParams,
  scopeIds,
  hideCategoryFilter = false,
}: CatalogueResultsProps) {
  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  const state = readCatalogueState(searchParams)
  const currencyCode = region.currency_code

  // Cached reference data: the taxonomy does not change because a shopper acted.
  const categories = await listCategories({
    fields: "handle,name",
    parent_category_id: null,
  })

  /**
   * The URL carries the category HANDLE; the index stores category NAMES. So the
   * handle is resolved against the real taxonomy before it becomes a filter.
   * A handle that matches nothing is ignored rather than turned into a filter
   * that silently returns zero results.
   */
  const categoryName =
    categories.find((category) => category.handle === state.category)?.name ??
    null

  // Availability is the one filter the index cannot express: the schema has no
  // inventory field at all. Read the real purchasable ids from the Store API and
  // push them into the query instead, so the count and the ordering stay exact.
  const allowedIds = state.inStock
    ? await listPurchasableProductIds({ countryCode, regionId: region.id })
    : undefined

  const result = await searchCatalogue({
    currencyCode,
    state,
    hitsPerPage: CATALOGUE_PAGE_SIZE,
    scopeIds: scopeIds?.slice(0, ID_SCOPE_LIMIT),
    categoryName,
    allowedIds,
  })

  const products = await listProductsByIds({
    ids: result.ids,
    countryCode,
    regionId: region.id,
  })

  const countLabel =
    result.count === 1
      ? t("catalogue.results.countOne")
      : t("catalogue.results.count", { count: result.count })

  return (
    <div
      className="flex flex-col gap-6 small:flex-row small:items-start small:gap-8"
      data-testid="catalogue-results"
    >
      <CatalogueFilters
        categories={
          hideCategoryFilter
            ? []
            : categories.map((category) => ({
                handle: category.handle,
                name: category.name,
              }))
        }
        priceBounds={result.priceBounds}
        petFacets={result.petFacets}
        currencyCode={currencyCode}
      />

      <div className="min-w-0 flex-1">
        {/* On mobile the trigger row above has already offered "Ordenar"; the
            heading here only labels the grid for screen readers. */}
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-[#eadfce] bg-white/70 px-4 py-3 xsmall:flex-row xsmall:items-center xsmall:justify-between">
          <p
            className="text-sm font-medium text-fg-subtle"
            aria-live="polite"
            data-testid="result-count"
          >
            {countLabel}
          </p>

          {/* Below `small` the sort lives in the filter sheet, reached from the
              "Ordenar" trigger, so it is not repeated here. */}
          <div className="hidden small:block">
            <SortControl layout="inline" />
          </div>
        </div>

        {products.length === 0 ? (
          <EmptyState
            title={t("store.noResults")}
            description={t("store.noResults.description")}
            actionLabel={t("empty.state.browseStore")}
            actionHref="/store"
            data-testid="no-products"
          />
        ) : (
          <ProductGrid products={products} region={region} />
        )}

        {result.totalPages > 1 ? (
          <Pagination
            data-testid="product-pagination"
            page={state.page}
            totalPages={result.totalPages}
          />
        ) : null}
      </div>
    </div>
  )
}