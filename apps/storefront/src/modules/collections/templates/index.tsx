import { OFFERS_COLLECTION_HANDLE } from "@lib/site-config"
import { t } from "@lib/i18n/translations"
import { HttpTypes } from "@medusajs/types"
import EmptyState from "@modules/common/components/empty-state"
import type { CatalogueSearchParams } from "@modules/store/templates/catalogue-results"
import CatalogueResults from "@modules/store/templates/catalogue-results"

/**
 * A collection page.
 *
 * This is also where "Ofertas" lives: the navigation entry points at the real
 * `ofertas` collection, which is populated by the demo bootstrap from the
 * products that genuinely carry a sale price. It is deliberately NOT a facet on
 * the index's `on_sale_*` field — see the note in `@lib/catalogue/cache-policy`.
 */
export default function CollectionTemplate({
  collection,
  countryCode,
  searchParams,
}: {
  collection: HttpTypes.StoreCollection
  countryCode: string
  searchParams: CatalogueSearchParams
}) {
  const productIds = collection.products?.map((product) => product.id) ?? []

  return (
    <div className="site-container py-8" data-testid="collection-container">
      <header className="mb-8">
        <h1
          className="text-3xl font-semibold tracking-tight text-fg-base"
          data-testid="collection-page-title"
        >
          {collection.title}
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-subtle">
          {collection.handle === OFFERS_COLLECTION_HANDLE
            ? t("catalogue.offers.description")
            : t("home.meta.description")}
        </p>
      </header>

      {productIds.length ? (
        <CatalogueResults
          countryCode={countryCode}
          searchParams={searchParams}
          scopeIds={productIds}
        />
      ) : (
        /* A collection with no products is a normal state, not an error: say so
           in Spanish and offer a way out instead of rendering an empty grid. */
        <EmptyState
          title={t("empty.state.title")}
          description={
            collection.handle === OFFERS_COLLECTION_HANDLE
              ? t("catalogue.offers.empty")
              : t("empty.state.collection")
          }
          actionLabel={t("empty.state.browseStore")}
          actionHref="/store"
          data-testid="collection-empty"
        />
      )}
    </div>
  )
}