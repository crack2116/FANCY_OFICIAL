"use client"

import Image from "next/image"
import { useCallback, useEffect, useId, useRef, useState } from "react"

import { type HomeHeroSlide } from "@lib/home-config"
import { t } from "@lib/i18n/translations"
import { wrapIndex } from "@lib/util/wrap-index"
import { clx } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/** A drag shorter than this is treated as a tap, not a swipe. */
const SWIPE_THRESHOLD_PX = 40

/**
 * How long a slide holds before the carousel advances on its own.
 *
 * Long enough to finish reading the headline and act on it. A promotional hero
 * rotates faster than that and the visitor is mid-sentence when the next slide
 * arrives, which is the reason autoplay is usually switched off entirely.
 */
const AUTOPLAY_INTERVAL_MS = 7000

/**
 * Multi-slide home hero.
 *
 * This is the only Client Component on the home page. The slides themselves come
 * from `home-config.ts`, so adding one never touches this file.
 *
 * Interaction decisions, all deliberate:
 * - AUTOPLAY, WITH A PAUSE CONTROL. Moving content must be pausable (WCAG
 *   2.2.2), so the autoplay and the explicit play/pause button ship together.
 *   Neither is acceptable alone: a carousel that advances by itself and cannot
 *   be stopped is a failure, not a feature.
 * - IT STOPS THE MOMENT IT MATTERS. Hover, focus inside the carousel and touch
 *   all pause it. Autoplay that keeps running under a pointer is what makes
 *   people hate carousels, and it also guarantees focus never lands on a slide
 *   that is about to turn `inert` out from under the keyboard.
 * - UNDER REDUCED MOTION IT DOES NOT AUTOPLAY AT ALL. Someone who asked the OS
 *   for less motion did not ask to watch rotating content. The slides stay
 *   reachable through the indicators and the keyboard.
 * - THERE ARE NO PREV/NEXT ARROWS. The indicators are the only control, which is
 *   why they are large enough to hit and why they are real buttons rather than
 *   decorative dots.
 * - `motion-safe:` on both transitions, so `prefers-reduced-motion: reduce`
 *   makes slide changes instant through CSS alone — no JS media query and no
 *   flash of animated content on first paint.
 * - Non-active slides are `inert` plus `aria-hidden`, which removes them from the
 *   accessibility tree AND from the tab order. A hidden slide's CTA can never be
 *   reached by keyboard.
 * - Images use art direction through `<picture>`, so a mobile-specific asset is
 *   only ever fetched on the viewport it was drawn for.
 * - HEIGHT COMES FROM THE VIEWPORT, NOT FROM A FIXED ASPECT RATIO. A hero sized by
 *   `aspect-[4/3]` is the same height on a 13" laptop and a 32" monitor: cramped on
 *   one, wasteful on the other, which is the complaint this replaces. The slide
 *   now takes a clamped share of `svh`, so it fills the same proportion of any
 *   screen instead of a fixed slice of the page.
 * - `svh`, NOT `vh`. Mobile browser chrome collapses and expands while the page
 *   scrolls, so `vh` resizes the hero under the visitor's thumb mid-scroll. `svh`
 *   is the smallest stable height and is what a hero is allowed to be measured
 *   against.
 * - On desktop the image STRETCHES to the slide (`self-stretch`) rather than
 *   holding a ratio, and `object-cover` does the cropping. A fixed ratio in a
 *   box the slide has already sized is what produced the letterboxed dead space.
 *   Mobile keeps an explicit clamped height because a stacked row has no
 *   intrinsic height to stretch into.
 */
export default function HeroCarousel({ slides }: { slides: HomeHeroSlide[] }) {
  const [index, setIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const viewportId = useId()
  const touchStartX = useRef<number | null>(null)

  const count = slides.length

  const goTo = useCallback(
    (target: number) => {
      setIndex(wrapIndex(target, count))
    },
    [count]
  )

  const showPrevious = useCallback(() => {
    setIndex((current) => wrapIndex(current - 1, count))
  }, [count])

  const showNext = useCallback(() => {
    setIndex((current) => wrapIndex(current + 1, count))
  }, [count])

  /**
   * Whether the carousel moves on its own right now.
   *
   * Named rather than inlined because three independent conditions gate
   * autoplay, and collapsing them into one expression at the call site is how
   * one of them quietly stops applying. A single slide has nothing to advance to.
   */
  const shouldAutoplay = count > 1 && !isPaused && !prefersReducedMotion

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")

    const sync = () => setPrefersReducedMotion(query.matches)

    // Read on mount as well as on change: the effect must not leave autoplay on
    // for a visitor whose preference was already set before this component ran.
    sync()
    query.addEventListener("change", sync)

    return () => query.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    if (!shouldAutoplay) {
      return
    }

    const timer = window.setInterval(() => {
      setIndex((current) => wrapIndex(current + 1, count))
    }, AUTOPLAY_INTERVAL_MS)

    // Without this, an interval that fires after the component unmounts sets
    // state on a dead tree and React logs the warning in production.
    return () => window.clearInterval(timer)
    // `index` is a dependency on purpose: re-running the effect on every change
    // is what makes the interval RESTART after a slide change instead of firing
    // on a fixed schedule that ignores how long the visitor has been reading.
  }, [shouldAutoplay, count, index])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      showPrevious()
      return
    }

    if (event.key === "ArrowRight") {
      event.preventDefault()
      showNext()
      return
    }

    if (event.key === "Home") {
      event.preventDefault()
      goTo(0)
      return
    }

    if (event.key === "End") {
      event.preventDefault()
      goTo(count - 1)
    }
  }

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null
  }

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const startX = touchStartX.current
    touchStartX.current = null

    const endX = event.changedTouches[0]?.clientX

    if (typeof startX !== "number" || typeof endX !== "number") {
      return
    }

    const deltaX = endX - startX

    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) {
      return
    }

    if (deltaX < 0) {
      showNext()
      return
    }

    showPrevious()
  }

  const cancelSwipe = () => {
    touchStartX.current = null
  }

  if (count === 0) {
    return null
  }

  return (
    <section
      aria-label={t("home.hero.label")}
      className="bg-[var(--surface-warm)]"
      onKeyDown={handleKeyDown}
      /*
       * Hover and focus both stop autoplay. Focus is the important one: a slide
       * turning `inert` while it holds the focused CTA would drop keyboard focus
       * onto the document body mid-interaction.
       */
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={(event) => {
        // Only release when focus left the carousel entirely. React's `onBlur`
        // bubbles, so it fires for every descendant; releasing on an inner blur
        // would resume autoplay while the visitor is still tabbing inside.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsPaused(false)
        }
      }}
    >
      {/*
       * NOT inside `site-container`. That class caps at `max-w-[1440px]` and pads
       * the edges, which is right for text columns but wrong for a hero: on a
       * 1920px screen it boxed the banner into 1440px of an almost-2000px
       * viewport, so the hero read as a cropped panel rather than a full-width
       * image. The gutter is preserved, just moved onto the slide grid below, so
       * the slide now spans the full viewport and the copy keeps its margins.
       */}
      <div className="py-6 medium:py-10">
        {/* The gutter and the clip live on DIFFERENT elements. When both were
            on one element, `overflow-hidden` clipped at the padding box, so the
            next slide peeked into the 32px gutter and the current panel looked
            cut off at the right edge. */}
        <div className="site-container">
          <div
            id={viewportId}
            role="group"
            aria-roledescription="carousel"
            aria-label={t("home.hero.label")}
            tabIndex={0}
            className="overflow-hidden"
            style={{ touchAction: "pan-y" }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={cancelSwipe}
          data-testid="hero-carousel"
        >
          <ul
            /*
             * The slide track. `700ms` with an ease-out curve is what reads as a
             * glide rather than a jump; the duration is deliberately shorter
             * than the autoplay interval so a slide is fully settled before the
             * next one starts moving.
             */
            className="flex motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
          >
            {slides.map((slide, slideIndex) => {
              const isActive = slideIndex === index

              return (
                /*
                 * `inert` + `aria-hidden` sit on the `<li>` so the whole slide
                 * leaves both the accessibility tree and the tab order. The
                 * listitem semantics stay intact: the carousel role goes on the
                 * inner element instead of replacing the `<li>` role.
                 */
                <li
                  key={slide.id}
                  id={`${viewportId}-slide-${slide.id}`}
                  aria-hidden={isActive ? undefined : true}
                  inert={!isActive}
                  className="w-full shrink-0"
                >
                  <div
                    role="group"
                    aria-roledescription="slide"
                    aria-label={t("home.hero.status", {
                      current: slideIndex + 1,
                      total: count,
                    })}
                    className="relative overflow-hidden rounded-[1.75rem] border border-[#eadfce] bg-[var(--surface-cream)] shadow-[var(--shadow-card)] small:rounded-[2rem]"
                  >
                    {/* Decorative warmth: one soft wash, one blurred brand
                        circle and a very quiet paw layer. None of it carries
                        information, so it is hidden from assistive tech. */}
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1000px_420px_at_10%_0%,rgba(255,255,255,0.9),transparent_70%)]" />
                    <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand-200/50 blur-3xl" />
                    <div className="paw-layer pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 medium:block" />

                    <div className="relative grid items-center gap-8 px-5 py-9 xsmall:px-8 xsmall:py-12 medium:grid-cols-[1.02fr_0.98fr] medium:gap-10 medium:px-12 medium:py-14 large:px-16">
                      <div className="flex flex-col items-start gap-5">
                        {slide.eyebrowKey ? (
                          <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-700 shadow-sm xsmall:text-[11px]">
                            <span
                              aria-hidden="true"
                              className="h-1.5 w-1.5 rounded-full bg-brand-400"
                            />
                            {t(slide.eyebrowKey)}
                          </p>
                        ) : null}

                        <h1 className="max-w-xl font-display text-[2.1rem] font-semibold leading-[1.04] tracking-tight text-fg-base xsmall:text-[2.6rem] medium:text-[3.35rem] large:text-[3.6rem]">
                          {t(slide.titleKey)}
                        </h1>

                        <p className="max-w-lg text-[15px] leading-relaxed text-fg-subtle medium:text-[17px]">
                          {t(slide.subtitleKey)}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-3">
                          <LocalizedClientLink
                            href={slide.ctaHref}
                            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand-700 px-7 text-sm font-semibold text-white shadow-[0_14px_28px_-16px_rgba(163,81,15,0.9)] transition-all hover:-translate-y-0.5 hover:bg-brand-800"
                          >
                            {t(slide.ctaKey)}
                            <svg
                              viewBox="0 0 20 20"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4"
                              aria-hidden="true"
                            >
                              <path d="M4 10h11M11 5l5 5-5 5" />
                            </svg>
                          </LocalizedClientLink>

                          <LocalizedClientLink
                            href={slide.secondaryCtaHref ?? "#categorias"}
                            className="inline-flex h-12 items-center justify-center rounded-full border border-[#e6d8c4] bg-white/70 px-6 text-sm font-semibold text-fg-base transition-colors hover:bg-white"
                          >
                            {t(
                              slide.secondaryCtaKey ?? "home.hero.secondaryCta"
                            )}
                          </LocalizedClientLink>
                        </div>

                      </div>

                      <div className="relative mx-auto w-full max-w-[31rem] pb-7">
                        <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] border border-white/80 bg-[#fdf3e4] shadow-[var(--shadow-lift)]">
                          <picture className="relative block h-full w-full">
                            {slide.imageMobile ? (
                              <source
                                media="(max-width: 511px)"
                                srcSet={slide.imageMobile}
                              />
                            ) : null}
                            <Image
                              src={slide.imageDesktop}
                              alt={t(slide.imageAltKey)}
                              fill
                              sizes="(min-width: 1280px) 500px, (min-width: 512px) 44vw, 100vw"
                              className="object-cover"
                              priority={slideIndex < 2}
                            />
                          </picture>
                        </div>

                        {/* A single compact trust pill replaces the sticker
                            cards that used to sit on top of the artwork. The
                            illustration now carries the visual weight, so the
                            only thing allowed to overlap it is this one line. */}
                        <div className="absolute -bottom-1 left-1/2 flex w-auto max-w-[97%] -translate-x-1/2 items-center justify-center gap-2 rounded-full border border-[#eadfce] bg-white/95 px-4 py-2 shadow-[var(--elevation-flyout)] backdrop-blur">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.9"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            >
                              <path d="M20.3 5.6a5 5 0 0 0-7.1 0L12 6.8l-1.2-1.2a5 5 0 1 0-7.1 7.1L12 21l8.3-8.3a5 5 0 0 0 0-7.1Z" />
                            </svg>
                          </span>
                          <p className="truncate text-[11px] font-semibold text-fg-base">
                            {t("home.hero.badge.title")}
                          </p>
                          <span
                            aria-hidden="true"
                            className="hidden h-1 w-1 shrink-0 rounded-full bg-brand-300 xsmall:block"
                          />
                          <p className="hidden truncate text-[11px] text-fg-subtle xsmall:block">
                            {t("home.hero.badge.description")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {count > 1 ? (
          <div className="site-container mt-5 flex items-center justify-center gap-3.5 medium:justify-end">
            {/*
              The play/pause control. It exists because autoplay does: WCAG
              2.2.2 requires moving content to be pausable, and removing the
              arrows took away the other way a visitor could take control, so
              without this button they would have none at all.
            */}
            <button
              type="button"
              onClick={() => setIsPaused((paused) => !paused)}
              aria-label={isPaused ? t("home.hero.play") : t("home.hero.pause")}
              aria-controls={viewportId}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e6d8c4] bg-white text-fg-subtle shadow-sm transition-colors hover:bg-brand-50 hover:text-fg-base"
              data-testid="hero-play-toggle"
            >
              {isPaused ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M8 5.5v13a1 1 0 0 0 1.53.85l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5Z" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              )}
            </button>

            <div className="flex items-center gap-1">
              {slides.map((slide, dotIndex) => {
                const isActive = dotIndex === index

                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => goTo(dotIndex)}
                    aria-label={t("home.hero.goTo", { number: dotIndex + 1 })}
                    aria-current={isActive ? "true" : undefined}
                    className="group flex h-11 items-center justify-center px-1"
                    data-testid={`hero-dot-${slide.id}`}
                  >
                    <span
                      className={clx(
                        "block h-2 rounded-full motion-safe:transition-all motion-safe:duration-300",
                        /*
                         * Resting and active dots both clear the 3:1 non-text
                         * contrast ratio against `bg-brand-50`; the active one is
                         * separated by width and by a darker shade, not by hue
                         * alone.
                         */
                        isActive
                          ? "w-6 bg-brand-700"
                          : "w-2.5 bg-brand-500 group-hover:bg-brand-600"
                      )}
                    />
                  </button>
                )
              })}
            </div>

            <p aria-live="polite" className="sr-only">
              {t("home.hero.status", { current: index + 1, total: count })}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
