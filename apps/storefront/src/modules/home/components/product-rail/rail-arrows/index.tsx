"use client"

import { useCallback, useEffect, useState } from "react"
import ChevronDown from "@modules/common/icons/chevron-down"

export default function RailArrows({
  listId,
  hideOnDesktop = false,
}: {
  listId: string
  hideOnDesktop?: boolean
}) {
  const [navState, setNavState] = useState<{
    measured: boolean
    canScrollLeft: boolean
    canScrollRight: boolean
  }>({
    measured: false,
    canScrollLeft: false,
    canScrollRight: true,
  })

  const measure = useCallback(() => {
    const list = document.getElementById(listId)
    if (!list) return

    const maxScroll = Math.max(0, list.scrollWidth - list.clientWidth)
    const hasOverflow = maxScroll > 2
    const canScrollLeft = hasOverflow && list.scrollLeft > 4
    const canScrollRight = hasOverflow && list.scrollLeft < maxScroll - 4

    setNavState((prev) =>
      prev.measured &&
      prev.canScrollLeft === canScrollLeft &&
      prev.canScrollRight === canScrollRight
        ? prev
        : { measured: true, canScrollLeft, canScrollRight }
    )
  }, [listId])

  useEffect(() => {
    const list = document.getElementById(listId)
    if (!list) return

    measure()

    list.addEventListener("scroll", measure, { passive: true })
    window.addEventListener("resize", measure)

    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(list)

    const mutationObserver = new MutationObserver(measure)
    mutationObserver.observe(list, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden"],
    })

    return () => {
      list.removeEventListener("scroll", measure)
      window.removeEventListener("resize", measure)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [listId, measure])

  const scroll = (direction: "left" | "right") => {
    const list = document.getElementById(listId)
    if (!list) return
    const offset =
      direction === "left" ? -list.clientWidth * 0.75 : list.clientWidth * 0.75
    list.scrollBy({ left: offset, behavior: "smooth" })
  }

  const desktopVisibility = hideOnDesktop ? "medium:hidden" : ""
  const showLeft = navState.measured ? navState.canScrollLeft : false
  const showRight = navState.measured ? navState.canScrollRight : true

  return (
    <>
      <button
        type="button"
        onClick={() => scroll("left")}
        aria-label="Anterior"
        className={`absolute -left-2 small:-left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white shadow-md text-fg-muted hover:text-fg-base hover:shadow-lg transition-all focus:outline-none ${desktopVisibility} ${
          showLeft
            ? "flex"
            : navState.measured
              ? "hidden"
              : "hidden small:flex"
        }`}
      >
        <span className="rotate-90">
          <ChevronDown size="16" />
        </span>
      </button>

      <button
        type="button"
        onClick={() => scroll("right")}
        aria-label="Siguiente"
        className={`absolute -right-2 small:-right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white shadow-md text-fg-muted hover:text-fg-base hover:shadow-lg transition-all focus:outline-none ${desktopVisibility} ${
          showRight ? "flex" : "hidden"
        }`}
      >
        <span className="-rotate-90">
          <ChevronDown size="16" />
        </span>
      </button>
    </>
  )
}
