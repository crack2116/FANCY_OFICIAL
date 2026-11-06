"use client"

import useToggleState from "@lib/hooks/use-toggle-state"
import { activeFilterCount } from "@lib/catalogue/state"
import type { PetFacets } from "@lib/catalogue/search"
import useCatalogueState from "@lib/hooks/use-catalogue-state"
import { t } from "@lib/i18n/translations"
import { clx } from "@modules/common/components/ui"

import FilterPanel, { type FilterCategory } from "./filter-panel"
import FilterSheet from "./filter-sheet"
import SortControl from "./sort-control"

export type CatalogueFiltersProps = {
  categories: FilterCategory[]
  priceBounds: { min: number; max: number } | null
  /**
   * What the engine actually matched, with counts. A group whose list is empty is
   * not rendered at all, so a catalogue with no pet data shows no empty filter.
   */
  petFacets: PetFacets
  currencyCode: string
}

/**
 * Filters, laid out for both viewports.
 *
 * Desktop (>= `small`, 1024px): a permanent left sidebar. Nothing to open. The
 * sort control is NOT here — it lives in the results header next to the count,
 * so the shopper sees what they are sorting right where the result count is.
 *
 * Below that: NO permanent sidebar. Two triggers — "Filtrar (n)" and "Ordenar" —
 * open one sheet holding both, because the filter groups are stacked on a phone
 * and switching between them should not mean opening, closing and reopening.
 *
 * The badge counts FILTER GROUPS, not query parameters: a category plus a price
 * range reads "Filtrar (2)", not "Filtrar (3)" for `min_price`, `max_price` and
 * `sort`.
 */
export default function CatalogueFilters({
  categories,
  priceBounds,
  petFacets,
  currencyCode,
}: CatalogueFiltersProps) {
  const { state } = useCatalogueState()
  const { state: isSheetOpen, open, close } = useToggleState()

  const count = activeFilterCount(state)

  return (
    <>
      {/* ------------------------------------------------------- desktop --- */}
      <aside
        className="hidden w-[272px] shrink-0 small:block"
        aria-labelledby="catalogue-filters-heading"
        data-testid="filters-sidebar"
      >
        <div className="rounded-2xl border border-[#eadfce] bg-white p-5 shadow-[var(--shadow-card)]">
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
            <h2
              id="catalogue-filters-heading"
              className="text-sm font-semibold text-fg-base"
            >
              {t("catalogue.filters.title")}
            </h2>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M4 7h16M7 12h10M10 17h4" />
              </svg>
            </span>
          </div>

          <FilterPanel
            categories={categories}
            priceBounds={priceBounds}
            petFacets={petFacets}
            currencyCode={currencyCode}
          />
        </div>
      </aside>

      {/* -------------------------------------------------------- mobile --- */}
      <div className="flex items-center gap-2 small:hidden">
        <button
          type="button"
          onClick={open}
          className={clx(
            "inline-flex h-11 items-center justify-center gap-2 rounded-full border px-5 text-sm font-semibold shadow-sm transition-colors",
            count > 0
              ? "border-brand-700 bg-brand-700 text-white"
              : "border-[#eadfce] bg-white text-fg-base hover:bg-brand-50"
          )}
          aria-expanded={isSheetOpen}
          aria-haspopup="dialog"
          data-testid="open-filters"
        >
          {count > 0
            ? t("catalogue.filters.openWithCount", { count })
            : t("catalogue.filters.open")}
        </button>

        <button
          type="button"
          onClick={open}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--border-subtle)] bg-surface px-4 text-sm font-medium text-fg-base transition-colors"
          aria-expanded={isSheetOpen}
          aria-haspopup="dialog"
          data-testid="open-sort"
        >
          {t("catalogue.sort.open")}
        </button>
      </div>

      <FilterSheet
        isOpen={isSheetOpen}
        close={close}
        title={t("catalogue.filters.title")}
      >
        <SortControl className="mb-8" />
        <FilterPanel
          categories={categories}
          priceBounds={priceBounds}
          petFacets={petFacets}
          currencyCode={currencyCode}
        />
      </FilterSheet>
    </>
  )
}