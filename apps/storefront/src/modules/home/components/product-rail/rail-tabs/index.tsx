"use client"

import { useCallback, useState } from "react"

import { t } from "@lib/i18n/translations"
import { clx } from "@modules/common/components/ui"

/**
 * "Matches every category". Not a valid Medusa handle, so no real category can
 * ever collide with it and a tab can never filter the rail down to nothing by
 * accident.
 */
const ALL = "*"

export type RailCategory = {
  /** Real handle from the Store API. Never invented here. */
  handle: string
  /** Real name from the Store API, so the tab reads in the shopper's language. */
  name: string
}

/**
 * Category tabs for a rail header.
 *
 * THESE FILTER, THEY DO NOT LINK. Every tab narrows the cards already in the
 * rail, which is what the reference header does; none of them navigates.
 *
 * WHY THE FILTER RUNS OVER THE DOM
 * The cards are Server Components and their payload must stay out of the client
 * bundle. The only thing a tab needs to know about a card is which categories it
 * belongs to, and `ProductRail` already writes that into each item's
 * `data-categories`. So this component receives an id and a handful of category
 * names, finds the list, and toggles `hidden` on its children — the same
 * find-by-id arrangement the dot pagination uses.
 *
 * WHY `aria-pressed` AND NOT A TABLIST
 * A tablist promises a panel per tab. Here every tab acts on the SAME region and
 * only its contents change, so declaring a panel per tab would tell a screen
 * reader something untrue. Toggle buttons in a labelled group describe exactly
 * what happens, and are reachable by Tab with no arrow-key handling to get
 * wrong.
 */
export default function RailTabs({
  listId,
  label,
  categories,
}: {
  /** DOM id of the scroll container rendered by the server component. */
  listId: string
  /** Visible name of the rail, used to label the group. */
  label: string
  /** Real categories found among the rail's products. */
  categories: RailCategory[]
}) {
  const [active, setActive] = useState(ALL)

  const select = useCallback(
    (handle: string) => {
      setActive(handle)

      const list = document.getElementById(listId)

      if (!list) {
        return
      }

      for (const card of Array.from(list.children)) {
        const belongs =
          handle === ALL ||
          (card.getAttribute("data-categories") ?? "").split(" ").includes(handle)

        card.toggleAttribute("hidden", !belongs)
      }

      /*
       * A rail scrolled to its last page has nothing to show once the filter
       * narrows, so the scroll resets WITH the filter rather than leaving the
       * shopper staring at an empty patch of scroller. Instant, not smooth:
       * this is a new set of cards, not a move within the old one.
       */
      list.scrollLeft = 0
    },
    [listId]
  )

  const tabs = [{ handle: ALL, name: t("home.rails.allCategories") }, ...categories]

  return (
    <div
      className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1"
      role="group"
      aria-label={t("home.rails.filterByCategory", { label })}
      data-testid={`product-rail-tabs-${listId}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.handle === active

        return (
          <button
            key={tab.handle}
            type="button"
            onClick={() => select(tab.handle)}
            aria-pressed={isActive}
            className={clx(
              "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition-colors",
              isActive
                ? "border-brand-700 bg-brand-700 text-white shadow-sm"
                : "border-[#e6d8c4] bg-white text-fg-subtle hover:border-brand-300 hover:bg-brand-50 hover:text-fg-base"
            )}
          >
            {tab.name}
          </button>
        )
      })}
    </div>
  )
}
