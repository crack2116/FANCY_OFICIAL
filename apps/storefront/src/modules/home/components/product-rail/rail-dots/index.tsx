"use client"

import { useCallback, useEffect, useState } from "react"

import { t } from "@lib/i18n/translations"

/**
 * Dot pagination for a server-rendered horizontal rail.
 *
 * THE DOT COUNT IS MEASURED, NEVER ASSUMED. A rail holds a different number of
 * cards at every viewport, and the category tabs change how many are visible,
 * so any number baked into the markup goes stale the moment the window resizes.
 * The pages below are derived from `scrollWidth` and `clientWidth` — the real
 * geometry of the element this component finds by id.
 *
 * THE RAIL ITEMS STAY ON THE SERVER. This holds offsets and an index, never
 * products: it finds the list the Server Component rendered and scrolls it,
 * which is why the entire card payload stays out of the RSC response and the
 * client bundle.
 *
 * WHY THE LAST PAGE IS CLAMPED
 * Page boundaries are a viewport apart, but the furthest the rail can scroll is
 * `scrollWidth - clientWidth`, which is usually a fraction of a viewport. A rail
 * whose tail is half a page long gets ONE dot for that tail: clamping each
 * boundary to the maximum reachable offset is what keeps the dot count equal to
 * the number of places the rail can actually rest.
 */
export default function RailDots({
  listId,
  label,
}: {
  /** DOM id of the scroll container rendered by the server component. */
  listId: string
  /** Visible name of the rail, used to label the control group. */
  label: string
}) {
  const [pages, setPages] = useState<{ offsets: number[]; active: number }>({
    offsets: [0],
    active: 0,
  })

  /*
   * Scroll fires far faster than React can usefully re-render, so the previous
   * state is handed back untouched when nothing moved. React then bails out of
   * the update entirely instead of walking the rail again on every frame.
   */
  const measure = useCallback(() => {
    const list = document.getElementById(listId)

    if (!list) {
      return
    }

    const offsets = pageOffsets(list.clientWidth, list.scrollWidth)

    if (offsets.length < 2) {
      setPages((previous) =>
        previous.offsets.length === 1 ? previous : { offsets: [0], active: 0 }
      )

      return
    }

    /* The active dot is the page the rail is NEAREST to, not the one that
       contains the current offset. Nearest is what makes a drag past the
       halfway point light the next dot, which is what the reference does. */
    let active = 0
    let closest = Math.abs(offsets[0] - list.scrollLeft)

    for (let index = 1; index < offsets.length; index++) {
      const distance = Math.abs(offsets[index] - list.scrollLeft)

      if (distance < closest) {
        active = index
        closest = distance
      }
    }

    setPages((previous) =>
      previous.active === active &&
      previous.offsets.length === offsets.length &&
      previous.offsets.every((offset, index) => offset === offsets[index])
        ? previous
        : { offsets, active }
    )
  }, [listId])

  useEffect(() => {
    const list = document.getElementById(listId)

    if (!list) {
      return
    }

    measure()

    list.addEventListener("scroll", measure, { passive: true })
    window.addEventListener("resize", measure)

    /*
     * Both observers exist because the rail's geometry changes in two ways that
     * a scroll event cannot see: the viewport resizes it (ResizeObserver on the
     * list) and the category tabs hide or show cards, which changes
     * `scrollWidth` without necessarily changing the list's own box
     * (MutationObserver on the children).
     */
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

  const goTo = (index: number) => {
    const list = document.getElementById(listId)
    const offset = pages.offsets[index]

    if (!list || offset === undefined) {
      return
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    list.scrollTo({ left: offset, behavior: reduceMotion ? "auto" : "smooth" })
  }

  /* A rail that fits has nothing to paginate through, and a row of one dead dot
     is decoration claiming a control that does nothing. */
  if (pages.offsets.length < 2) {
    return null
  }

  return (
    <div
      className="mt-6 flex items-center justify-center gap-1"
      role="group"
      aria-label={t("home.rails.pagination", { label })}
      data-testid={`product-rail-dots-${listId}`}
    >
      {pages.offsets.map((offset, index) => {
        const isActive = index === pages.active

        return (
          /*
           * The 24px button is the target; the 8px dot is the picture. An 8px
           * button is under the WCAG 2.2 target minimum, so the padding lives on
           * the button rather than on a wrapper that could be missed.
           */
          <button
            key={index}
            type="button"
            onClick={() => goTo(index)}
            aria-current={isActive ? "true" : undefined}
            aria-label={t("home.rails.goToPage", {
              label,
              page: index + 1,
            })}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full"
          >
            <span
              className={
                isActive
                  ? "h-2 w-2 rounded-full bg-fg-base"
                  : "h-2 w-2 rounded-full border border-fg-muted bg-transparent"
              }
            />
          </button>
        )
      })}
    </div>
  )
}

/**
 * The scroll offsets a rail can rest at, in order.
 *
 * Derived from the element's own measurements and nothing else, so the same
 * function produces the dot count, the scroll targets and the active index from
 * one source and they can never disagree with each other.
 */
function pageOffsets(clientWidth: number, scrollWidth: number): number[] {
  const maxScroll = Math.max(0, scrollWidth - clientWidth)

  if (clientWidth < 1 || maxScroll <= 1) {
    return [0]
  }

  const step = clientWidth
  const count = Math.ceil(maxScroll / step) + 1

  return Array.from({ length: count }, (_, index) =>
    Math.min(index * step, maxScroll)
  )
}
