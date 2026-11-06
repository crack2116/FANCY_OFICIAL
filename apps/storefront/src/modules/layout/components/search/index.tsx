"use client"

import { MagnifyingGlass } from "@medusajs/icons"
import type { SearchClient } from "instantsearch.js"
import { usePathname, useRouter } from "next/navigation"
import {
  Configure,
  InstantSearch,
  useHits,
  useInstantSearch,
  useSearchBox,
} from "react-instantsearch"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { MIN_SEARCH_LENGTH, normaliseQuery } from "@lib/catalogue/state"
import useSearchSettled from "@lib/hooks/use-search-settled"
import useToggleState from "@lib/hooks/use-toggle-state"
import { t } from "@lib/i18n/translations"
import { PRODUCT_INDEX_NAME, searchClient } from "@lib/search-client"
import { Text } from "@modules/common/components/ui"

import SearchDrawer from "./drawer"
import SearchHit, { type ProductHit } from "./hit"

const HITS_PER_PAGE = 8

/**
 * Debounce for the typeahead.
 *
 * A request per keystroke would hit the search endpoint once per character and
 * spend most of its time discarding answers. 250ms is below the threshold where a
 * person notices lag while typing, and above the cost of a single request.
 */
const DEBOUNCE_MS = 250

const SearchInput = ({
  value,
  onChange,
  onSubmit,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
}) => (
  <div className="flex items-center gap-x-3 border-b border-[var(--border-subtle)] px-4">
    <MagnifyingGlass className="shrink-0 text-fg-muted" />
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        // Enter always lands on the results page. Without this, a query that
        // matches no suggestion would be a dead end, because there is nothing
        // left to click.
        if (event.key === "Enter") {
          event.preventDefault()
          onSubmit(value)
        }
      }}
      placeholder={t("header.searchPlaceholder")}
      aria-label={t("header.searchLabel")}
      autoFocus
      className="txt-medium w-full bg-transparent py-4 text-fg-base outline-none placeholder:text-fg-muted"
      data-testid="search-input"
    />
  </div>
)

const SearchPanel = ({ onNavigate }: { onNavigate: () => void }) => {
  const router = useRouter()
  const pathname = usePathname()
  const timer = useRef<number | undefined>(undefined)

  const queryHook = useCallback(
    (nextQuery: string, search: (value: string) => void) => {
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => search(nextQuery), DEBOUNCE_MS)
    },
    []
  )

  const { query, refine } = useSearchBox({ queryHook })
  const { items } = useHits<ProductHit>()
  const { status } = useInstantSearch()
  const { isSettled } = useSearchSettled()

  const [inputValue, setInputValue] = useState(query)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  /**
   * The live search query, sanitised the same way the results page reads `?q=`.
   * Below `MIN_SEARCH_LENGTH` this is "", which is what stops one letter from
   * dumping the catalogue into the panel.
   */
  const effectiveQuery = useMemo(() => normaliseQuery(query), [query])
  const isSearchable = effectiveQuery.length > 0
  const isPending = inputValue.trim() !== effectiveQuery

  const handleChange = useCallback(
    (next: string) => {
      setInputValue(next)

      const normalised = normaliseQuery(next)

      window.clearTimeout(timer.current)

      if (normalised) {
        refine(normalised)
        return
      }

      // Too short to search: drop back to an empty query instead of sending one.
      // The adapter treats an empty query as a placeholder search, so this costs
      // at most one request when the shopper deletes back to a single character —
      // far cheaper than a request per keystroke.
      refine("")
    },
    [refine]
  )

  const goToResults = useCallback(
    (raw: string) => {
      const next = normaliseQuery(raw)

      onNavigate()

      router.push(
        next
          ? `${pathname}/store?q=${encodeURIComponent(next)}`
          : `${pathname}/store`
      )
    },
    [onNavigate, pathname, router]
  )

  const renderBody = () => {
    if (!inputValue.trim()) {
      return (
        <Text
          className="px-4 py-6 text-center text-fg-muted"
          data-testid="search-empty"
        >
          {t("search.startTyping")}
        </Text>
      )
    }

    if (!isSearchable) {
      return (
        <Text
          className="px-4 py-6 text-center text-fg-muted"
          data-testid="search-too-short"
        >
          {t("search.minLength", { count: MIN_SEARCH_LENGTH })}
        </Text>
      )
    }

    if (status === "error") {
      // No error detail is rendered: the message can carry a Medusa payload or a
      // stack trace, neither of which a shopper can act on.
      return (
        <Text
          className="px-4 py-6 text-center text-danger-700"
          data-testid="search-error"
        >
          {t("search.error")}
        </Text>
      )
    }

    if (!isSettled || isPending) {
      return (
        <Text
          className="px-4 py-6 text-center text-fg-muted"
          data-testid="search-loading"
        >
          {t("search.searching")}
        </Text>
      )
    }

    if (!items.length) {
      return (
        <Text
          className="px-4 py-6 text-center text-fg-subtle"
          data-testid="search-no-results"
        >
          {t("search.noResults", { query: effectiveQuery })}
        </Text>
      )
    }

    return (
      <>
        <ul className="py-2" aria-label={t("search.suggestionsLabel")}>
          {items.map((hit) => (
            <SearchHit key={hit.objectID} hit={hit} onNavigate={onNavigate} />
          ))}
        </ul>

        <div className="border-t border-[var(--border-subtle)] p-3">
          <button
            type="button"
            onClick={() => goToResults(inputValue)}
            className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-brand-700 transition-colors hover:bg-surface-subtle"
            data-testid="search-view-all"
          >
            {t("search.viewAll")}
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <SearchInput
        value={inputValue}
        onChange={handleChange}
        onSubmit={goToResults}
      />

      <div className="flex-1 overflow-y-auto">{renderBody()}</div>
    </>
  )
}

const Search = () => {
  const { state: isOpen, open, close } = useToggleState()

  return (
    <>
      {/* Mobile: compact icon */}
      <button
        type="button"
        onClick={open}
        aria-label={t("header.openSearch")}
        className="-mr-2 flex h-11 w-11 items-center justify-center rounded-md text-fg-subtle transition-colors hover:bg-surface-subtle hover:text-fg-base small:hidden"
        data-testid="nav-search-button-mobile"
      >
        <MagnifyingGlass />
      </button>

      {/* Desktop: prominent field that opens the same search panel.

          42px and fully rounded are both measured from the live store, which
          sets `--wd-form-height: 42px` and `--wd-form-brd-radius: 30px`. On a
          42px-tall box a 30px radius IS a pill, so `rounded-full` is the same
          shape expressed in the token this codebase already uses. `bg-surface`
          is white, matching the field on the reference rather than the greyed
          fill this used to carry — a grey field on a yellow band read as a
          disabled control.

          Width is NOT set here. The wrapper in `templates/nav` owns the
          max-width, so the field grows into the space between the logo and the
          action icons and stops at the measured ceiling. */}
      <button
        type="button"
        onClick={open}
        aria-label={t("header.openSearch")}
        className="hidden h-11 w-full items-center gap-3 rounded-full border border-[var(--border-subtle)] bg-white px-5 text-left text-sm text-fg-muted shadow-[0_1px_0_rgba(61,46,28,0.04)] transition-all hover:border-brand-300 hover:bg-white hover:shadow-[0_6px_18px_-14px_rgba(61,46,28,0.35)] small:flex"
        data-testid="nav-search-button"
      >
        <MagnifyingGlass />
        <span className="flex-1">{t("header.searchPlaceholder")}</span>
      </button>

      <SearchDrawer isOpen={isOpen} close={close}>
        <InstantSearch
          indexName={PRODUCT_INDEX_NAME}
          searchClient={searchClient as unknown as SearchClient}
          future={{ preserveSharedStateOnUnmount: true }}
        >
          <Configure hitsPerPage={HITS_PER_PAGE} />
          <SearchPanel onNavigate={close} />
        </InstantSearch>
      </SearchDrawer>
    </>
  )
}

export default Search