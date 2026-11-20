import {
  listBrandProductIds,
  retrieveBrandDescription,
  type StorefrontBrand,
} from "@lib/data/brands"
import { getRegion } from "@lib/data/regions"
import { t } from "@lib/i18n/translations"
import EmptyState from "@modules/common/components/empty-state"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CatalogueResults from "@modules/store/templates/catalogue-results"

import type { CatalogueSearchParams } from "@modules/store/templates/catalogue-results"

/**
 * A brand's page.
 *
 * THE LISTING IS `CatalogueResults`, NOT A SECOND GRID
 * ---------------------------------------------------
 * The brand page is a collection page with a different header. Its products go
 * through the SAME component as `/store`, a category page and a collection page,
 * so it inherits engine-side filtering, sorting, paging, the result count, the
 * facet counts and the whole filter panel for free — and there is no second grid,
 * no second result count and no second filter implementation to keep in step.
 *
 * The brand is applied as `scopeIds`, the mechanism the collection page already
 * uses. Resolving those ids goes through `searchCatalogue`, so it is the same
 * `brand_handle` filter the facet applies — the page and the facet can never
 * disagree about which products carry the brand.
 *
 * THE DESCRIPTION IS RENDERED ONLY WHEN THE API SUPPLIES ONE
 * -------------------------------------------------------
 * `brand.description` is authored by the shop owner in the Admin, exactly like
 * `product.description`, and it is rendered verbatim for the same reason: it is
 * merchant content, not UI chrome, so it is not a translation key.
 *
 * It reaches the storefront through the store route's public brand allow-list
 * (`name`, `handle`, `description`, `logo_url`) and is read with ONE batched
 * product request, because the product index carries no marketing copy. A brand
 * with no description renders no paragraph — nothing is invented to fill it.
 */
export default async function BrandTemplate({
  brand,
  countryCode,
  searchParams,
}: {
  brand: StorefrontBrand
  countryCode: string
  searchParams: CatalogueSearchParams
}) {
  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  const ids = await listBrandProductIds({
    handle: brand.handle,
    // The region's own currency, so a card's price here is priced exactly as it
    // is everywhere else rather than in a hardcoded PEN fallback.
    currencyCode: region.currency_code,
  })

  const description =
    brand.description ??
    (await retrieveBrandDescription({ ids, regionId: region.id }))

  return (
    <div className="site-container py-8" data-testid="brand-container">
      <header className="mb-8 flex flex-col gap-y-2">
        <LocalizedClientLink
          href="/marcas"
          className="w-fit text-xs uppercase tracking-wider text-fg-muted transition-colors hover:text-brand-700"
        >
          {t("brand.page.allBrands")}
        </LocalizedClientLink>

        <h1
          className="text-3xl font-semibold tracking-tight text-fg-base"
          data-testid="brand-page-title"
        >
          {brand.name}
        </h1>

        {description ? (
          <p
            className="max-w-2xl whitespace-pre-line text-sm leading-relaxed text-fg-subtle"
            data-testid="brand-description"
          >
            {description}
          </p>
        ) : null}

        <p className="text-xs text-fg-muted">
          {brand.count === 1
            ? t("brand.index.productCountOne")
            : t("brand.index.productCount", { count: brand.count })}
        </p>
      </header>

      {ids.length ? (
        <CatalogueResults
          countryCode={countryCode}
          searchParams={searchParams}
          scopeIds={ids}
        />
      ) : (
        /*
         * A brand with no products is a normal state, not an error. It happens
         * right after an operator creates one and before assigning a product, so
         * it says so in Spanish and offers a way out instead of an empty grid.
         */
        <EmptyState
          title={t("empty.state.title")}
          description={t("brand.page.empty")}
          actionLabel={t("brand.page.browseAll")}
          actionHref="/store"
          data-testid="brand-empty"
        />
      )}
    </div>
  )
}