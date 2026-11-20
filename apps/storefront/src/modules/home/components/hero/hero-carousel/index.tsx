"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"

import { type HomeHeroSlide } from "@lib/home-config"
import { t } from "@lib/i18n/translations"
import { wrapIndex } from "@lib/util/wrap-index"
import { clx } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const SWIPE_THRESHOLD_PX = 40
const AUTOPLAY_INTERVAL_MS = 7000

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

  const shouldAutoplay = count > 1 && !isPaused && !prefersReducedMotion

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setPrefersReducedMotion(query.matches)
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
    return () => window.clearInterval(timer)
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
      className="w-full overflow-x-clip bg-[#FCEBD7]"
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsPaused(false)
        }
      }}
    >
      <div
        id={viewportId}
        role="group"
        aria-roledescription="carousel"
        aria-label={t("home.hero.label")}
        tabIndex={0}
        className="relative w-full overflow-hidden bg-[#FCEBD7] focus-visible:outline-none"
        style={{ touchAction: "pan-y" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={cancelSwipe}
        data-testid="hero-carousel"
      >
          {/* Decorative bottom-left orange wave matching reference */}
          <svg
            viewBox="0 0 260 140"
            fill="none"
            className="pointer-events-none absolute bottom-0 left-0 z-[2] h-24 w-44 small:h-32 small:w-60"
            aria-hidden="true"
            preserveAspectRatio="none"
          >
            <path
              d="M0 32C42 36 68 78 118 92C168 106 212 118 260 140H0V32Z"
              fill="#F6B256"
              fillOpacity="0.85"
            />
            <path
              d="M0 68C36 74 68 104 122 114C166 122 204 128 238 140H0V68Z"
              fill="#F38424"
            />
          </svg>

          <ul
            className="flex motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
          >
            {slides.map((slide, slideIndex) => {
              const isActive = slideIndex === index

              const eyebrowText =
                slide.eyebrow ??
                (slide.eyebrowKey ? t(slide.eyebrowKey) : "Cuidado de tu mascota")

              const rawTitle =
                slide.title ??
                (slide.titleKey ? t(slide.titleKey) : "Bienestar todos los")

              const highlightText = slide.titleHighlight ?? ""

              const rawSubtitle =
                slide.subtitle ??
                (slide.subtitleKey ? t(slide.subtitleKey) : "")

              const subtitleText = rawSubtitle.replace(
                /(?:a|en)\s+todo\s+el\s+Per[uú]/gi,
                "en Piura"
              )

              const ctaText =
                slide.ctaLabel ??
                (slide.ctaKey ? t(slide.ctaKey) : "Explorar productos")

              const secondaryCtaText =
                slide.secondaryCtaLabel ??
                (slide.secondaryCtaKey
                  ? t(slide.secondaryCtaKey)
                  : t("home.hero.secondaryCta"))

              const secondaryHref =
                slide.secondaryCtaHref ?? "/categories/salud"

              const altText =
                slide.imageAlt ??
                (slide.imageAltKey ? t(slide.imageAltKey) : rawTitle)

              return (
                <li
                  key={slide.id}
                  id={`${viewportId}-slide-${slide.id}`}
                  aria-hidden={isActive ? undefined : true}
                  inert={!isActive}
                  className="relative w-full shrink-0"
                >
                  <div
                    role="group"
                    aria-roledescription="slide"
                    aria-label={t("home.hero.status", {
                      current: slideIndex + 1,
                      total: count,
                    })}
                    className="relative min-h-[23rem] small:min-h-[24.5rem] medium:min-h-[25.5rem] large:min-h-[27rem]"
                  >
                    {/* Desktop & laptop full-bleed background artwork aligned to the right */}
                    <div className="pointer-events-none absolute inset-0 hidden overflow-hidden small:block">
                      <div className="relative ml-auto h-full w-fit">
                        <img
                          src={slide.imageDesktop}
                          alt={altText}
                          className="relative -top-[10%] h-[112%] w-auto max-w-none select-none object-contain object-right medium:-top-[19%] medium:h-[124%]"
                          loading={slideIndex === 0 ? "eager" : "lazy"}
                        />
                        <div className="absolute inset-y-0 left-0 w-44 bg-gradient-to-r from-[#FCEBD7] via-[#FCEBD7]/90 to-transparent medium:w-48 medium:via-[#FCEBD7]/85" />
                        <div className="absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-[#FCEBD7] to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[#FCEBD7] via-[#FCEBD7]/75 to-transparent" />
                      </div>
                    </div>

                    {/* Content column */}
                    <div className="site-container relative z-10 grid items-center gap-6 pb-2 pt-7 small:grid-cols-[1.06fr_0.94fr] small:pt-9 medium:pb-3 medium:pt-10">
                      <div className="flex flex-col items-start gap-4">
                        {eyebrowText ? (
                          <div className="inline-flex items-center gap-2 rounded-full bg-[#FFF8F0] px-4 py-1.5 text-xs font-bold text-[#D97706] shadow-xs">
                            {/* Orange paw icon */}
                            <svg
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="h-3.5 w-3.5 shrink-0 text-[#F36F21]"
                              aria-hidden="true"
                            >
                              <ellipse cx="10" cy="13.2" rx="4.2" ry="3.3" />
                              <circle cx="4.8" cy="8.5" r="1.7" />
                              <circle cx="8.1" cy="6.2" r="1.8" />
                              <circle cx="11.9" cy="6.2" r="1.8" />
                              <circle cx="15.2" cy="8.5" r="1.7" />
                            </svg>
                            <span>{eyebrowText}</span>
                          </div>
                        ) : null}

                        <h1 className="font-display text-[2.15rem] font-extrabold leading-[1.06] tracking-tight text-[#0E352E] xsmall:text-[2.65rem] medium:text-[3.2rem] large:text-[3.5rem]">
                          <span className="relative inline-block">
                            {rawTitle}
                            {/* 3 Orange Sparkle Rays at top-right of headline */}
                            <svg
                              viewBox="0 0 28 26"
                              fill="none"
                              className="pointer-events-none absolute -right-6 -top-3.5 h-6 w-6 text-[#F36F21]"
                              aria-hidden="true"
                            >
                              <path
                                d="M4 18V5M11 20L19 7M14 23L25 17"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                              />
                            </svg>
                          </span>
                          {highlightText ? (
                            <>
                              <br />
                              <span className="relative mt-0.5 inline-block text-[#F36F21]">
                                {highlightText}
                                {/* Curved golden-amber smile underline */}
                                <svg
                                  viewBox="0 0 210 28"
                                  fill="none"
                                  className="pointer-events-none -mt-1 h-4 w-[135%] max-w-[14rem] text-[#F5A623]"
                                  aria-hidden="true"
                                  preserveAspectRatio="none"
                                >
                                  <path
                                    d="M4 16C58 26 146 24 204 4"
                                    stroke="currentColor"
                                    strokeWidth="5"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              </span>
                            </>
                          ) : null}
                        </h1>

                        {subtitleText ? (
                          <p className="max-w-md text-[15px] font-medium leading-relaxed text-[#334E48] medium:text-[16.5px]">
                            {subtitleText}
                          </p>
                        ) : null}

                        <div className="mt-1 flex flex-wrap items-center gap-3.5">
                          <LocalizedClientLink
                            href={slide.ctaHref}
                            className="inline-flex items-center justify-center gap-2.5 rounded-full bg-[#F36F21] px-6 py-3 text-sm font-bold text-white shadow-[0_6px_20px_rgba(243,111,33,0.35)] transition-all hover:-translate-y-0.5 hover:bg-[#E05E10]"
                          >
                            {/* Shopping cart icon */}
                            <svg
                              viewBox="0 0 20 20"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4 shrink-0"
                              aria-hidden="true"
                            >
                              <circle cx="8" cy="16.5" r="1.2" fill="currentColor" />
                              <circle cx="14.5" cy="16.5" r="1.2" fill="currentColor" />
                              <path d="M2.5 3.5h2.2l1.9 9.2a1.2 1.2 0 0 0 1.2 1h7.3a1.2 1.2 0 0 0 1.2-.9l1.4-6.3H5.4" />
                            </svg>
                            <span>{ctaText}</span>
                            <span aria-hidden="true">&rarr;</span>
                          </LocalizedClientLink>

                          {secondaryCtaText ? (
                            <LocalizedClientLink
                              href={secondaryHref}
                              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#0E352E] shadow-[0_4px_14px_rgba(14,53,46,0.08)] transition-colors hover:bg-[#FFF9F2]"
                            >
                              {/* Green shield-check icon */}
                              <svg
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="h-4 w-4 shrink-0 text-[#15803D]"
                                aria-hidden="true"
                              >
                                <path d="M10 2.2 3.8 4.9v4.6c0 4.2 2.6 7.9 6.2 9.1 3.6-1.2 6.2-4.9 6.2-9.1V4.9L10 2.2Zm-1.1 10.6-2.4-2.4 1.1-1.1 1.3 1.3 3.2-3.2 1.1 1.1-4.3 4.3Z" />
                              </svg>
                              <span>{secondaryCtaText}</span>
                            </LocalizedClientLink>
                          ) : null}
                        </div>
                      </div>

                      {/* Mobile seamless artwork preview */}
                      <div className="relative mx-auto w-full max-w-md overflow-hidden small:hidden">
                        <img
                          src={slide.imageMobile || slide.imageDesktop}
                          alt={altText}
                          className="aspect-[16/10] w-full select-none object-cover object-right"
                          loading={slideIndex === 0 ? "eager" : "lazy"}
                        />
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-[#FCEBD7] to-transparent"
                        />
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[#FCEBD7] to-transparent"
                        />
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#FCEBD7] to-transparent"
                        />
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[#FCEBD7] to-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          {/* Full-bleed Edge-to-Edge Bottom White Trust Strip */}
          <div className="relative z-10 w-full bg-white shadow-[0_-2px_14px_rgba(15,53,46,0.04)]">
            {/* Mobile slide indicator dots floating right above the trust strip */}
            {count > 1 ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-xs px-2.5 py-1 shadow-xs large:hidden"
              >
                {slides.map((slide, dotIndex) => {
                  const isActive = dotIndex === index
                  return (
                    <span
                      key={slide.id}
                      className={clx(
                        "block h-1.5 rounded-full transition-all duration-300",
                        isActive
                          ? "w-4 bg-[#F36F21]"
                          : "w-1.5 bg-[#D9B99B]/80"
                      )}
                    />
                  )
                })}
              </div>
            ) : null}

            <div className="site-container flex flex-col gap-3 py-2.5 xsmall:py-3.5 small:py-4 large:flex-row large:items-center large:justify-between">
              <ul className="grid grid-cols-2 gap-x-2 gap-y-2.5 xsmall:gap-3 medium:flex medium:flex-1 medium:items-center medium:justify-between medium:gap-2 large:justify-between large:gap-4 xl:gap-8">
                {/* 1. Envíos rápidos en Piura */}
                <li className="flex items-center gap-2.5 xsmall:gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#FED7AA]/70 bg-gradient-to-br from-[#FFF7ED] to-[#FFEDD5] p-1 shadow-2xs xsmall:h-11 xsmall:w-11 xsmall:p-1.5">
                    <img
                      src="/icons/ticker/shipping.png"
                      alt=""
                      width={44}
                      height={44}
                      loading="eager"
                      decoding="sync"
                      className="h-full w-full select-none object-contain drop-shadow-[0_2px_4px_rgba(243,111,33,0.18)]"
                      aria-hidden="true"
                    />
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-[11px] font-bold text-[#0E352E] xsmall:text-xs">
                      Envíos rápidos
                    </p>
                    <p className="truncate text-[10px] font-medium text-slate-500 xsmall:text-[11px]">
                      en Piura
                    </p>
                  </div>
                </li>

                <li
                  aria-hidden="true"
                  className="hidden h-7 w-px bg-slate-200 medium:block"
                />

                {/* 2. Compra segura y confiable */}
                <li className="flex items-center gap-2.5 xsmall:gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#BBF7D0]/70 bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7] p-1 shadow-2xs xsmall:h-11 xsmall:w-11 xsmall:p-1.5">
                    <img
                      src="/icons/ticker/health.png"
                      alt=""
                      width={44}
                      height={44}
                      loading="eager"
                      decoding="sync"
                      className="h-full w-full select-none object-contain drop-shadow-[0_2px_4px_rgba(21,128,61,0.18)]"
                      aria-hidden="true"
                    />
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-[11px] font-bold text-[#0E352E] xsmall:text-xs">
                      Compra segura
                    </p>
                    <p className="truncate text-[10px] font-medium text-slate-500 xsmall:text-[11px]">
                      y confiable
                    </p>
                  </div>
                </li>

                <li
                  aria-hidden="true"
                  className="hidden h-7 w-px bg-slate-200 medium:block"
                />

                {/* 3. Atención personalizada */}
                <li className="flex items-center gap-2.5 xsmall:gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#FDE68A]/70 bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] p-1 shadow-2xs xsmall:h-11 xsmall:w-11 xsmall:p-1.5">
                    <img
                      src="/icons/ticker/support.png"
                      alt=""
                      width={44}
                      height={44}
                      loading="eager"
                      decoding="sync"
                      className="h-full w-full select-none object-contain drop-shadow-[0_2px_4px_rgba(217,119,6,0.18)]"
                      aria-hidden="true"
                    />
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="text-[11px] font-bold text-[#0E352E] xsmall:text-xs">
                      Atención personalizada
                    </p>
                  </div>
                </li>

                <li
                  aria-hidden="true"
                  className="hidden h-7 w-px bg-slate-200 medium:block"
                />

                {/* 4. Productos de calidad */}
                <li className="flex items-center gap-2.5 xsmall:gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#FDE68A]/70 bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] p-1 shadow-2xs xsmall:h-11 xsmall:w-11 xsmall:p-1.5">
                    <img
                      src="/icons/ticker/custom.png"
                      alt=""
                      width={44}
                      height={44}
                      loading="eager"
                      decoding="sync"
                      className="h-full w-full select-none object-contain drop-shadow-[0_2px_4px_rgba(245,158,11,0.18)]"
                      aria-hidden="true"
                    />
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="text-[11px] font-bold text-[#0E352E] xsmall:text-xs">
                      Productos de calidad
                    </p>
                  </div>
                </li>
              </ul>

              {/* Slide Navigation Controls */}
              {count > 1 ? (
                <div className="hidden large:flex items-center gap-1.5 shrink-0 pl-6 border-l border-slate-200">
                  <button
                    type="button"
                    onClick={showPrevious}
                    aria-label={t("home.hero.previous")}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[#0E352E] shadow-2xs transition-colors hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-[#F36F21]"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    >
                      <path d="M10 3.5 5.5 8l4.5 4.5" />
                    </svg>
                  </button>

                  <div className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1.5 shadow-2xs">
                    {slides.map((slide, dotIndex) => {
                      const isActive = dotIndex === index
                      return (
                        <button
                          key={slide.id}
                          type="button"
                          onClick={() => goTo(dotIndex)}
                          aria-label={t("home.hero.goTo", { number: dotIndex + 1 })}
                          aria-current={isActive ? "true" : undefined}
                          className="flex items-center justify-center p-0.5"
                          data-testid={`hero-dot-${slide.id}`}
                        >
                          <span
                            className={clx(
                              "block h-2 rounded-full transition-all duration-300",
                              isActive
                                ? "w-5 bg-[#F36F21]"
                                : "w-2 bg-[#D9B99B] hover:bg-[#F36F21]/60"
                            )}
                          />
                        </button>
                      )
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={showNext}
                    aria-label={t("home.hero.next")}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[#0E352E] shadow-2xs transition-colors hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-[#F36F21]"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    >
                      <path d="M6 3.5 10.5 8 6 12.5" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPaused((paused) => !paused)}
                    aria-label={
                      isPaused ? t("home.hero.play") : t("home.hero.pause")
                    }
                    aria-controls={viewportId}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[#0E352E] shadow-2xs transition-colors hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-[#F36F21]"
                    data-testid="hero-play-toggle"
                  >
                    {isPaused ? (
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      >
                        <path d="M8 5.5v13a1 1 0 0 0 1.53.85l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5Z" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      >
                        <rect x="6" y="5" width="4" height="14" rx="1" />
                        <rect x="14" y="5" width="4" height="14" rx="1" />
                      </svg>
                    )}
                  </button>

                  <p aria-live="polite" className="sr-only">
                    {t("home.hero.status", { current: index + 1, total: count })}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
      </div>
    </section>
  )
}
