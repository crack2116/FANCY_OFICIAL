"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

import {
  clearCommercialFilters,
  readCatalogueState,
  writeCatalogueState,
  type CatalogueState,
} from "@lib/catalogue/state"

/** The query string as a plain record, which is what the catalogue parser takes. */
function toRecord(search: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(search))
}

/**
 * The live query string.
 *
 * Read from `window.location` rather than from the `useSearchParams()` value
 * captured at render time. Two controls can each apply a change before React
 * re-renders — typing a price and then changing the sort, say — and a stale
 * closure would make the second change overwrite the first, silently dropping a
 * filter the shopper had already set. Reading the live URL makes consecutive
 * changes compose.
 *
 * Only ever called from an event handler or an effect, never during render, so
 * the `window` guard is enough.
 */
function liveSearch(fallback: string): string {
  if (typeof window === "undefined") {
    return fallback
  }

  return window.location.search.replace(/^\?/, "")
}

/**
 * The catalogue's URL state, as a hook.
 *
 * The query string IS the state. Nothing about the listing lives in React state,
 * which is what makes refresh, copy-paste and back/forward behave: there is a
 * single source of truth and it is the URL.
 *
 * `useSearchParams()` returns a new object identity on every render, so this
 * parses the serialised string instead. That also means a filter input can never
 * be re-seeded by an unrelated render, which would fight the shopper's cursor.
 */
export function useCatalogueState() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentSearch = searchParams.toString()

  const state = useMemo(
    () => readCatalogueState(toRecord(currentSearch)),
    [currentSearch]
  )

  const navigate = useCallback(
    (queryString: string, options?: { scroll?: boolean }) => {
      const href = queryString ? `${pathname}?${queryString}` : pathname

      router.push(href, { scroll: options?.scroll ?? false })
    },
    [pathname, router]
  )

  /**
   * Apply a partial change. Paging resets to 1 unless the change sets it, so a
   * narrowed filter can never leave the shopper on a page that no longer exists.
   */
  const update = useCallback(
    (change: Partial<CatalogueState>, options?: { scroll?: boolean }) => {
      const current = liveSearch(currentSearch)

      navigate(
        writeCatalogueState(new URLSearchParams(current), change),
        options
      )
    },
    [currentSearch, navigate]
  )

  const clear = useCallback(() => {
    navigate(
      clearCommercialFilters(new URLSearchParams(liveSearch(currentSearch))),
      { scroll: true }
    )
  }, [currentSearch, navigate])

  /**
   * Bumped on every change this hook makes.
   *
   * `useSearchParams()` can lag a `router.push` by a render or two, and the price
   * inputs seed their draft from the URL. Without this signal, clearing the price
   * filter would leave `20` sitting in the inputs even though the listing had
   * already dropped it — the control would claim a filter that is not applied.
   */
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    setRevision((previous) => previous + 1)
  }, [currentSearch])

  return { state, update, clear, revision }
}

export default useCatalogueState