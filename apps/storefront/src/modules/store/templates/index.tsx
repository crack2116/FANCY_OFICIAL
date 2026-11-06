import { t } from "@lib/i18n/translations"
import type { CatalogueSearchParams } from "@modules/store/templates/catalogue-results"
import CatalogueResults from "@modules/store/templates/catalogue-results"

/**
 * `/store` — the whole catalogue, and the destination for a header search.
 *
 * It is deliberately the same component the category and collection pages use, so
 * a shopper who searches and then narrows by category, or who lands on a
 * category and then searches, ends up on one listing with one set of rules.
 */
export default function StoreTemplate({
  searchParams,
  countryCode,
}: {
  searchParams: CatalogueSearchParams
  countryCode: string
}) {
  const query = searchParams.q
  const queryLabel = typeof query === "string" ? query : undefined

  return (
    <div className="bg-[var(--surface-warm)]" data-testid="store-page">
      <div className="site-container py-8 small:py-10">
        <header className="mb-8 border-b border-[var(--border-subtle)] pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">
            {t("store.eyebrow")}
          </p>
          <h1
            className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg-base small:text-4xl"
            data-testid="store-page-title"
          >
            {queryLabel
              ? t("catalogue.results.searchHeading", { query: queryLabel })
              : t("store.title")}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-subtle small:text-base">
            {t("store.description")}
          </p>
        </header>

        <CatalogueResults
          countryCode={countryCode}
          searchParams={searchParams}
        />
      </div>
    </div>
  )
}
