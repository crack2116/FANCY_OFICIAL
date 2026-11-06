"use client"

import { t } from "@lib/i18n/translations"
import ChevronDown from "@modules/common/icons/chevron-down"
import { useCallback, useEffect, useState } from "react"

/**
 * Rail scroll controls.
 *
 * The arrows are only rendered while there is something to scroll to. A rail
 * with three cards on a wide screen does not overflow, and an arrow that does
 * nothing when clicked is worse than no arrow: it tells the visitor there is
 * more content and then ignores them.
 *
 * The state is measured on mount, on scroll and on resize. That also covers the
 * tab strip: filtering cards changes `scrollWidth` without changing the
 * viewport, and the next scroll or resize reconciles the arrows.
 */
export default function RailArrows({ listId }: { listId: string }) {
  const [edges, setEdges] = useState({ left: false, right: false })

  const measure = useCallback(() => {
    const list = document.getElementById(listId)
    if (!list) {
      return
    }

    setEdges({
      left: list.scrollLeft > 4,
      right: list.scrollLeft + list.clientWidth < list.scrollWidth - 4,
    })
  }, [listId])

  useEffect(() => {
    const list = document.getElementById(listId)
    if (!list) {
      return
    }

    measure()
    list.addEventListener("scroll", measure, { passive: true })
    window.addEventListener("resize", measure)

    return () => {
      list.removeEventListener("scroll", measure)
      window.removeEventListener("resize", measure)
    }
  }, [listId, measure])

  const scroll = (direction: "left" | "right") => {
    const list = document.getElementById(listId)
    if (!list) return
    const offset =
      direction === "left"
        ? -list.clientWidth * 0.75
        : list.clientWidth * 0.75
    list.scrollBy({ left: offset, behavior: "smooth" })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => scroll("left")}
        aria-label={t("home.rails.previous")}
        tabIndex={edges.left ? undefined : -1}
        aria-hidden={edges.left ? undefined : true}
        className={`${
          edges.left ? "hidden small:flex" : "hidden"
        } absolute -left-3 top-1/2 z-10 h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#eadfce] bg-white text-fg-muted shadow-md transition-all hover:text-fg-base hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500`}
      >
        <span className="rotate-90">
          <ChevronDown size="16" />
        </span>
      </button>

      <button
        type="button"
        onClick={() => scroll("right")}
        aria-label={t("home.rails.next")}
        tabIndex={edges.right ? undefined : -1}
        aria-hidden={edges.right ? undefined : true}
        className={`${
          edges.right ? "flex" : "hidden"
        } absolute -right-3 top-1/2 z-10 h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#eadfce] bg-white text-fg-muted shadow-md transition-all hover:text-fg-base hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500`}
      >
        <span className="-rotate-90">
          <ChevronDown size="16" />
        </span>
      </button>
    </>
  )
}
