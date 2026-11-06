"use client"

import { useCallback, useEffect, useId, useMemo, useState } from "react"

import { MAX_PRICE, readCatalogueState } from "@lib/catalogue/state"
import type { PetFacets } from "@lib/catalogue/search"
import useCatalogueState from "@lib/hooks/use-catalogue-state"
import { t } from "@lib/i18n/translations"
import { convertToLocale } from "@lib/util/money"
import { clx } from "@modules/common/components/ui"

/** A real category, as the Store API reports it. Handles are the URL value. */
export type FilterCategory = { handle: string; name: string }

export type FilterPanelProps = {
  categories: FilterCategory[]
  /**
   * Lowest and highest price the index holds for the current query, from the
   * engine's own `stats` facet. Used to bound the inputs and to describe the
   * range; never used to invent a value.
   */
  priceBounds: { min: number; max: number } | null
  /**
   * Brand / species / life-stage options, each already carrying the engine's own
   * count. Values with no matches are absent rather than shown as "(0)".
   */
  petFacets: PetFacets
  currencyCode: string
  className?: string
}

/**
 * The species currently in the URL, read at call time.
 *
 * Only ever called from an event handler, never during render, so touching
 * `window` here is safe. It parses through `readCatalogueState` rather than
 * re-implementing the split, so there is still exactly one parser for the
 * catalogue's URL contract.
 */
function readLiveSpecies(): string[] {
  if (typeof window === "undefined") {
    return []
  }

  const params = new URLSearchParams(window.location.search)

  return readCatalogueState(params).species
}

/** Only digits and one dot, capped at the two decimals PEN amounts need. */
function sanitisePriceInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "")

  const [whole, ...rest] = cleaned.split(".")

  if (rest.length === 0) {
    return whole.slice(0, 7)
  }

  return `${whole.slice(0, 7)}.${rest.join("").slice(0, 2)}`
}

function priceOrNull(raw: string): number | null {
  if (raw.trim() === "") {
    return null
  }

  const amount = Number(raw)

  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_PRICE) {
    return null
  }

  return amount
}

/**
 * How long the price inputs wait before writing to the URL.
 *
 * Committing on every keystroke would re-run the listing search for each
 * character ("2" then "20"), which is the same mistake a search box makes when it
 * fires per keystroke. Anything half a second after the last keystroke feels
 * immediate to a shopper typing a two-digit amount.
 */
const PRICE_DEBOUNCE_MS = 500

/**
 * The filter body: category, price and availability.
 *
 * Rendered twice — once in the desktop sidebar and once inside the mobile sheet
 * — from the SAME URL state, so the two can never disagree. `useId` keeps the
 * generated input ids unique per instance.
 *
 * Everything is a real `fieldset`/`legend` with real `radio`/`checkbox`/`input`
 * controls and real labels. No div-with-onClick: a shopper using a keyboard or a
 * screen reader gets the same filters as everyone else.
 *
 * The price filter is two numeric inputs rather than a slider on purpose. A
 * slider cannot be typed into, cannot round-trip through a URL and cannot say
 * "S/ 20" exactly; correctness and shareability win here.
 */
export default function FilterPanel({
  categories,
  priceBounds,
  petFacets,
  currencyCode,
  className,
}: FilterPanelProps) {
  const { state, update, clear, revision } = useCatalogueState()
  const baseId = useId()

  const [minInput, setMinInput] = useState(
    state.minPrice === null ? "" : String(state.minPrice)
  )
  const [maxInput, setMaxInput] = useState(
    state.maxPrice === null ? "" : String(state.maxPrice)
  )

  // Follow the URL when it changes from elsewhere: "Limpiar filtros", a shared
  // link loaded in the same tab, or the back button. `revision` is a dependency so
  // the drafts re-seed even when the URL lands a render late and the values
  // themselves compare equal to what is already typed.
  useEffect(() => {
    setMinInput(state.minPrice === null ? "" : String(state.minPrice))
    setMaxInput(state.maxPrice === null ? "" : String(state.maxPrice))
  }, [revision, state.maxPrice, state.minPrice])

  const pendingPrice = useMemo(
    () => ({
      minPrice: priceOrNull(minInput),
      maxPrice: priceOrNull(maxInput),
    }),
    [maxInput, minInput]
  )

  const hasPendingPrice =
    pendingPrice.minPrice !== state.minPrice ||
    pendingPrice.maxPrice !== state.maxPrice

  const commitPrice = useCallback(
    () => update(pendingPrice),
    [pendingPrice, update]
  )

  // Commit after the shopper stops typing. The effect re-runs harmlessly once
  // the URL catches up: `hasPendingPrice` goes false and the timer is cleared.
  useEffect(() => {
    if (!hasPendingPrice) {
      return
    }

    const timer = window.setTimeout(commitPrice, PRICE_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [commitPrice, hasPendingPrice])

  const formatAmount = (amount: number) =>
    convertToLocale({ amount, currency_code: currencyCode })

  /**
   * Add or remove one species, then write the whole selection.
   *
   * The next list is computed from the LIVE query string rather than from the
   * `state` this render closed over. `useSearchParams()` can lag a `router.push`
   * by a render or two, so ticking two boxes quickly would otherwise make the
   * second tick compute its list from the selection BEFORE the first one landed
   * and silently drop it. `update` already re-reads the live URL for everything
   * else, so reading it here too is consistent rather than a second mechanism.
   */
  const toggleSpecies = useCallback(
    (code: string) => {
      const live = readLiveSpecies()

      update({
        species: live.includes(code)
          ? live.filter((value) => value !== code)
          : [...live, code],
      })
    },
    [update]
  )

  const priceHint = priceBounds
    ? t("catalogue.filters.priceHint", {
        min: formatAmount(priceBounds.min),
        max: formatAmount(priceBounds.max),
      })
    : null

  return (
    <div className={clx("flex flex-col gap-8", className)}>
      {/* ------------------------------------------------------ category --- */}
      <fieldset>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-muted">
          {t("catalogue.filters.category")}
        </legend>

        <div className="flex flex-col gap-2">
          <label
            htmlFor={`${baseId}-category-all`}
            className="flex cursor-pointer items-center gap-2 text-sm text-fg-subtle"
          >
            <input
              id={`${baseId}-category-all`}
              type="radio"
              name={`${baseId}-category`}
              checked={state.category === null}
              onChange={() => update({ category: null })}
              className="h-4 w-4 shrink-0 accent-brand-700"
              data-testid="filter-category-all"
            />
            <span>{t("catalogue.filters.categoryAll")}</span>
          </label>

          {categories.map((category) => {
            const id = `${baseId}-category-${category.handle}`

            return (
              <label
                key={category.handle}
                htmlFor={id}
                className={clx(
                  "flex cursor-pointer items-center gap-2 text-sm",
                  state.category === category.handle
                    ? "text-fg-base"
                    : "text-fg-subtle"
                )}
              >
                <input
                  id={id}
                  type="radio"
                  name={`${baseId}-category`}
                  value={category.handle}
                  checked={state.category === category.handle}
                  onChange={() => update({ category: category.handle })}
                  className="h-4 w-4 shrink-0 accent-brand-700"
                  data-testid="filter-category"
                />
                <span>{category.name}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {/* --------------------------------------------------------- price --- */}
      <fieldset>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-muted">
          {t("catalogue.filters.price")}
        </legend>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <label htmlFor={`${baseId}-min-price`} className="sr-only">
              {t("catalogue.filters.priceFrom")}
            </label>
            <input
              id={`${baseId}-min-price`}
              name="min_price"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder={t("catalogue.filters.priceFrom")}
              value={minInput}
              onChange={(event) =>
                setMinInput(sanitisePriceInput(event.target.value))
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  commitPrice()
                }
              }}
              aria-describedby={priceHint ? `${baseId}-price-hint` : undefined}
              className="h-10 w-full rounded-md border border-[var(--border-subtle)] bg-surface px-3 text-sm text-fg-base outline-none transition-colors focus:border-brand-500"
              data-testid="filter-min-price"
            />

            <label htmlFor={`${baseId}-max-price`} className="sr-only">
              {t("catalogue.filters.priceTo")}
            </label>
            <input
              id={`${baseId}-max-price`}
              name="max_price"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder={t("catalogue.filters.priceTo")}
              value={maxInput}
              onChange={(event) =>
                setMaxInput(sanitisePriceInput(event.target.value))
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  commitPrice()
                }
              }}
              aria-describedby={priceHint ? `${baseId}-price-hint` : undefined}
              className="h-10 w-full rounded-md border border-[var(--border-subtle)] bg-surface px-3 text-sm text-fg-base outline-none transition-colors focus:border-brand-500"
              data-testid="filter-max-price"
            />
          </div>

          {priceHint ? (
            <p id={`${baseId}-price-hint`} className="text-xs text-fg-muted">
              {priceHint}
            </p>
          ) : null}
        </div>
      </fieldset>

      {/* --------------------------------------------------------- brand --- */}
      {/* Omitted entirely when the engine matched no brands. A group with nothing
          in it is noise, and a "(0)" option is a dead end a shopper cannot act on. */}
      {petFacets.brands.length > 0 ? (
        <fieldset>
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-muted">
            {t("catalogue.filters.brand")}
          </legend>

          <div className="flex flex-col gap-2">
            <label
              htmlFor={`${baseId}-brand-all`}
              className="flex cursor-pointer items-center gap-2 text-sm text-fg-subtle"
            >
              <input
                id={`${baseId}-brand-all`}
                type="radio"
                name={`${baseId}-brand`}
                checked={state.brand === null}
                onChange={() => update({ brand: null })}
                className="h-4 w-4 shrink-0 accent-brand-700"
                data-testid="filter-brand-all"
              />
              <span>{t("catalogue.filters.brandAll")}</span>
            </label>

            {petFacets.brands.map((brand) => {
              const id = `${baseId}-brand-${brand.value}`

              return (
                <label
                  key={brand.value}
                  htmlFor={id}
                  className={clx(
                    "flex cursor-pointer items-center gap-2 text-sm",
                    state.brand === brand.value ? "text-fg-base" : "text-fg-subtle"
                  )}
                >
                  <input
                    id={id}
                    type="radio"
                    name={`${baseId}-brand`}
                    value={brand.value}
                    checked={state.brand === brand.value}
                    onChange={() => update({ brand: brand.value })}
                    className="h-4 w-4 shrink-0 accent-brand-700"
                    data-testid="filter-brand"
                  />
                  <span>
                    {brand.label}
                    <span className="ml-1 text-xs text-fg-muted">
                      ({brand.count})
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
      ) : null}

      {/* ------------------------------------------------------- species --- */}
      {/* Checkboxes, not radios: a product is valid for several species at once,
          so this is the one multi-select. Six demo products are sold for both
          Perro and Gato and must be findable by either. */}
      {petFacets.species.length > 0 ? (
        <fieldset>
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-muted">
            {t("catalogue.filters.species")}
          </legend>

          <div className="flex flex-col gap-2">
            {petFacets.species.map((species) => {
              const id = `${baseId}-species-${species.value}`

              return (
                <label
                  key={species.value}
                  htmlFor={id}
                  className={clx(
                    "flex cursor-pointer items-center gap-2 text-sm",
                    state.species.includes(species.value)
                      ? "text-fg-base"
                      : "text-fg-subtle"
                  )}
                >
                  <input
                    id={id}
                    type="checkbox"
                    checked={state.species.includes(species.value)}
                    onChange={() => toggleSpecies(species.value)}
                    className="h-4 w-4 shrink-0 accent-brand-700"
                    data-testid="filter-species"
                  />
                  <span>
                    {species.label}
                    <span className="ml-1 text-xs text-fg-muted">
                      ({species.count})
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
      ) : null}

      {/* ---------------------------------------------------- life stage --- */}
      {petFacets.lifeStages.length > 0 ? (
        <fieldset>
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-muted">
            {t("catalogue.filters.lifeStage")}
          </legend>

          <div className="flex flex-col gap-2">
            <label
              htmlFor={`${baseId}-life-stage-all`}
              className="flex cursor-pointer items-center gap-2 text-sm text-fg-subtle"
            >
              <input
                id={`${baseId}-life-stage-all`}
                type="radio"
                name={`${baseId}-life-stage`}
                checked={state.lifeStage === null}
                onChange={() => update({ lifeStage: null })}
                className="h-4 w-4 shrink-0 accent-brand-700"
                data-testid="filter-life-stage-all"
              />
              <span>{t("catalogue.filters.lifeStageAll")}</span>
            </label>

            {petFacets.lifeStages.map((stage) => {
              const id = `${baseId}-life-stage-${stage.value}`

              return (
                <label
                  key={stage.value}
                  htmlFor={id}
                  className={clx(
                    "flex cursor-pointer items-center gap-2 text-sm",
                    state.lifeStage === stage.value
                      ? "text-fg-base"
                      : "text-fg-subtle"
                  )}
                >
                  <input
                    id={id}
                    type="radio"
                    name={`${baseId}-life-stage`}
                    value={stage.value}
                    checked={state.lifeStage === stage.value}
                    onChange={() => update({ lifeStage: stage.value })}
                    className="h-4 w-4 shrink-0 accent-brand-700"
                    data-testid="filter-life-stage"
                  />
                  <span>
                    {stage.label}
                    <span className="ml-1 text-xs text-fg-muted">
                      ({stage.count})
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
      ) : null}

      {/* ------------------------------------------------------- stock --- */}
      <fieldset>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-muted">
          {t("catalogue.filters.stock")}
        </legend>

        <label
          htmlFor={`${baseId}-in-stock`}
          className="flex cursor-pointer items-center gap-2 text-sm text-fg-subtle"
        >
          <input
            id={`${baseId}-in-stock`}
            type="checkbox"
            checked={state.inStock}
            onChange={(event) => update({ inStock: event.target.checked })}
            className="h-4 w-4 shrink-0 accent-brand-700"
            data-testid="filter-in-stock"
          />
          <span>{t("catalogue.filters.inStock")}</span>
        </label>
      </fieldset>

      <button
        type="button"
        onClick={clear}
        className="self-start text-sm font-medium text-brand-700 underline underline-offset-4 transition-colors hover:text-brand-800"
        data-testid="clear-filters"
      >
        {t("catalogue.filters.clear")}
      </button>
    </div>
  )
}