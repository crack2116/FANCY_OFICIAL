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
        className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-slate-100 hover:text-fg-base small:hidden"
        data-testid="nav-search-button-mobile"
      >
        <MagnifyingGlass />
      </button>

      {/* Desktop: wide rounded-full pill search bar with right solid orange circular button */}
      <button
        type="button"
        onClick={open}
        aria-label={t("header.openSearch")}
        className="group hidden h-12 w-full items-center gap-3 rounded-full border border-slate-200/80 bg-[#F3F5F8] pl-5 pr-1.5 text-left text-sm text-slate-500 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:border-slate-300 hover:bg-[#EDF0F5] small:flex"
        data-testid="nav-search-button"
      >
        <MagnifyingGlass className="h-4 w-4 shrink-0 text-slate-500" />
        <span className="flex-1 truncate text-[13.5px] text-slate-500">
          {t("header.searchPlaceholder")}
        </span>
        <span
          aria-hidden="true"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F36F21] text-white shadow-sm transition-transform group-hover:scale-105 group-hover:bg-[#E05E10]"
        >
          <MagnifyingGlass className="h-4 w-4" />
        </span>
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
