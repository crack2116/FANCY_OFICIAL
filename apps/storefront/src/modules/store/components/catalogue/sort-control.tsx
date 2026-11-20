"use client"

import { useId } from "react"

import { CATALOGUE_SORTS, type CatalogueSort } from "@lib/catalogue/state"
import useCatalogueState from "@lib/hooks/use-catalogue-state"
import { t, type TranslationKey } from "@lib/i18n/translations"
import { clx } from "@modules/common/components/ui"

/**
 * The four sort orders, in Spanish.
 *
 * There is no "best selling" or "most popular" option and there must not be one:
 * nothing in this project records a sale, so any popularity ordering would be
 * fabricated. Every option here is a field the index can actually sort on.
 */
export const SORT_LABEL_KEYS: Record<CatalogueSort, TranslationKey> = {
  relevance: "catalogue.sort.relevance",
  price_asc: "catalogue.sort.priceAsc",
  price_desc: "catalogue.sort.priceDesc",
  created_at: "catalogue.sort.createdAt",
}

/**
 * Sorting control.
 *
 * A real `fieldset`/`legend` around real radio inputs with real labels, so it is
 * announced correctly and reachable by keyboard, and the browser gives arrow-key
 * navigation for free. The sort is written to the URL, which means the chosen
 * order is applied by the search engine over the whole match set before the page
 * is cut — and it survives a refresh and a shared link.
 *
 * `layout="inline"` is the desktop results header: four radios on one line next
 * to the result count. The stacked layout is for the mobile sheet, where there is
 * room to read them.
 */
export default function SortControl({
  className,
  layout = "stack",
}: {
  className?: string
  layout?: "stack" | "inline"
}) {
  const { state, update } = useCatalogueState()
  const legendId = useId()
  const isInline = layout === "inline"

  return (
    <fieldset className={className}>
      <legend
        className={clx(
          "text-xs font-semibold uppercase tracking-wider text-fg-muted",
          isInline ? "sr-only" : "mb-3"
        )}
      >
        {t("catalogue.sort.title")}
      </legend>

      <div
        className={clx(
          isInline
            ? "flex flex-wrap items-center gap-x-4 gap-y-2"
            : "flex flex-col gap-2"
        )}
      >
        {CATALOGUE_SORTS.map((sort) => {
          const id = `${legendId}-${sort}`

          return (
            <label
              key={sort}
              htmlFor={id}
              className={clx(
                "flex cursor-pointer items-center gap-2 text-sm",
                state.sort === sort ? "text-fg-base" : "text-fg-subtle"
              )}
            >
              <input
                id={id}
                type="radio"
                name={`${legendId}-sort`}
                value={sort}
                checked={state.sort === sort}
                onChange={() => update({ sort })}
                className="h-4 w-4 shrink-0 accent-brand-700"
                data-testid={`sort-${sort}`}
              />
              <span>{t(SORT_LABEL_KEYS[sort])}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}