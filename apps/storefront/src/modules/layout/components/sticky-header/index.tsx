"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Sticky shell that smoothly hides the top yellow row on scroll down
 * and restores it on scroll up.
 *
 * ARCHITECTURAL DECISION: GPU TRANSFORM VS HEIGHT COLLAPSE
 * ---------------------------------------------------------
 * We use `transform: translateY(...)` rather than animating `height` with `overflow: hidden`.
 *
 * 1. ZERO SLICING: Animating `height` with `overflow: hidden` clips children from the bottom up,
 *    slicing icons, search input, and logos in half during transitions.
 * 2. ZERO LAYOUT JITTER: Height changes cause the browser to adjust document scroll height,
 *    triggering reciprocal scroll events that cause jitter/oscillation loops.
 * 3. 60/120 FPS PERFORMANCE: `transform` is executed on the compositor thread without layout reflows.
 */
type StickyHeaderProps = {
  /** The yellow wordmark row (95px tall) */
  logoRow: React.ReactNode
  /** The white category bar (44px tall) */
  navRow: React.ReactNode
}

/**
 * Scroll distance required before compact mode can activate.
 */
const COLLAPSE_AFTER_PX = 100

/**
 * Scroll position below which the full header is unconditionally restored.
 */
const RESTORE_BELOW_PX = 50

/**
 * Minimum scroll delta to trigger a state change (filters out trackpad/momentum jitter).
 */
const MIN_DELTA_PX = 8

export default function StickyHeader({ logoRow, navRow }: StickyHeaderProps) {
  const [compact, setCompact] = useState(false)
  const compactRef = useRef(false)

  useEffect(() => {
    let lastY = window.scrollY
    let rafId: number | null = null

    const handleScroll = () => {
      const y = Math.max(0, window.scrollY)
      const delta = y - lastY
      lastY = y

      // Near the very top of the page -> always show full header
      if (y <= RESTORE_BELOW_PX) {
        if (compactRef.current) {
          compactRef.current = false
          setCompact(false)
        }
        return
      }

      // Inside deadband -> keep current state
      if (y <= COLLAPSE_AFTER_PX) {
        return
      }

      // Ignore micro jitter
      if (Math.abs(delta) < MIN_DELTA_PX) {
        return
      }

      // delta > 0 is scrolling down (hide yellow bar), delta < 0 is scrolling up (reveal yellow bar)
      const next = delta > 0
      if (next !== compactRef.current) {
        compactRef.current = next
        setCompact(next)
      }
    }

    const onScroll = () => {
      if (rafId !== null) return
      rafId = window.requestAnimationFrame(() => {
        handleScroll()
        rafId = null
      })
    }

    // Sync state on deep load
    if (window.scrollY > COLLAPSE_AFTER_PX) {
      compactRef.current = true
      setCompact(true)
    }

    window.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", onScroll)
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }
    }
  }, [])

  return (
    <div
      className="header-shell sticky top-0 z-50 w-full"
      data-compact={compact}
      data-has-nav={Boolean(navRow)}
      data-testid="sticky-header"
    >
      <div className="header-logo-row">{logoRow}</div>
      {navRow ? (
        <div className="header-nav-row hidden small:block">{navRow}</div>
      ) : null}
    </div>
  )
}
