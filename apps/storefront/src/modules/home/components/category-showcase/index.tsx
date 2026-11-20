import { t } from "@lib/i18n/translations"
import type { ResolvedCategoryCard } from "@lib/util/home-merchandising"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { clx } from "@modules/common/components/ui"
import type { ReactNode } from "react"

type CardTheme = {
  bg: string
  accentText: string
  icon: ReactNode
}

const CARD_THEMES: Record<string, CardTheme> = {
  alimentos: {
    bg: "#FBE7CF",
    accentText: "text-[#D95B16]",
    icon: (
      <svg
        viewBox="0 0 32 32"
        fill="none"
        className="h-8 w-8 text-[#183B34]"
        aria-hidden="true"
      >
        {/* Kibble mounds peeking above the bowl */}
        <circle cx="11" cy="11.5" r="1.8" fill="currentColor" />
        <circle cx="14.5" cy="10.2" r="2" fill="currentColor" />
        <circle cx="18.2" cy="10.5" r="1.9" fill="currentColor" />
        <circle cx="21.2" cy="11.8" r="1.7" fill="currentColor" />
        <circle cx="13" cy="12.8" r="1.7" fill="currentColor" />
        <circle cx="16.5" cy="12.5" r="1.8" fill="currentColor" />
        <circle cx="19.6" cy="12.9" r="1.6" fill="currentColor" />
        {/* Filled slanted pet bowl */}
        <path
          d="M6.8 13.8h18.4l2.3 8.6a2 2 0 0 1-1.93 2.52H6.43A2 2 0 0 1 4.5 22.4l2.3-8.6Z"
          fill="currentColor"
        />
        {/* White paw print on bowl front */}
        <ellipse cx="16" cy="21" rx="2.3" ry="1.8" fill="#FFFFFF" />
        <circle cx="13.2" cy="18.5" r="1" fill="#FFFFFF" />
        <circle cx="15" cy="17.5" r="1" fill="#FFFFFF" />
        <circle cx="17" cy="17.5" r="1" fill="#FFFFFF" />
        <circle cx="18.8" cy="18.5" r="1" fill="#FFFFFF" />
      </svg>
    ),
  },
  salud: {
    bg: "#E3F3D8",
    accentText: "text-[#2B6E3F]",
    icon: (
      <svg
        viewBox="0 0 32 32"
        fill="none"
        className="h-8 w-8 text-[#183B34]"
        aria-hidden="true"
      >
        {/* Heart outline */}
        <path
          d="M16 25.5 6.8 16.6a5.8 5.8 0 0 1 8.2-8.2l1 1 1-1a5.8 5.8 0 0 1 8.2 8.2l-1.4 1.4"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Medical cross at bottom-right of heart */}
        <path
          d="M18.2 16.5h3.2v3h3v3.2h-3v3h-3.2v-3h-3v-3.2h3v-3Z"
          fill="#FFFFFF"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  higiene: {
    bg: "#D3E8FD",
    accentText: "text-[#1D639E]",
    icon: (
      <svg
        viewBox="0 0 32 32"
        fill="none"
        className="h-8 w-8 text-[#183B34]"
        aria-hidden="true"
      >
        <path
          d="M16 5.2c4.8 5.4 7.8 9.4 7.8 13.4a7.8 7.8 0 0 1-15.6 0c0-4 3-8 7.8-13.4Z"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  accesorios: {
    bg: "#ECE3F8",
    accentText: "text-[#5B3E96]",
    icon: (
      <svg
        viewBox="0 0 32 32"
        fill="none"
        className="h-8 w-8 text-[#183B34]"
        aria-hidden="true"
      >
        {/* Pet collar ring */}
        <ellipse
          cx="16"
          cy="11.2"
          rx="9.5"
          ry="4.2"
          stroke="currentColor"
          strokeWidth="2.2"
        />
        <path
          d="M6.5 11.2v2.4c0 2.3 4.3 4.2 9.5 4.2s9.5-1.9 9.5-4.2v-2.4"
          stroke="currentColor"
          strokeWidth="2.2"
        />
        <circle cx="10.2" cy="14.5" r="0.9" fill="currentColor" />
        <circle cx="21.8" cy="14.5" r="0.9" fill="currentColor" />
        {/* Hanging round paw medal */}
        <path d="M16 16.5v2" stroke="currentColor" strokeWidth="2.2" />
        <circle cx="16" cy="22.8" r="4.2" fill="currentColor" />
        <circle cx="16" cy="23.6" r="1.3" fill="#FFFFFF" />
        <circle cx="14.3" cy="21.7" r="0.7" fill="#FFFFFF" />
        <circle cx="16" cy="21.2" r="0.7" fill="#FFFFFF" />
        <circle cx="17.7" cy="21.7" r="0.7" fill="#FFFFFF" />
      </svg>
    ),
  },
  juguetes: {
    bg: "#FFE2E9",
    accentText: "text-[#B83B6A]",
    icon: (
      <svg
        viewBox="0 0 32 32"
        fill="none"
        className="h-8 w-8 text-[#183B34]"
        aria-hidden="true"
      >
        <circle
          cx="16"
          cy="16"
          r="9.8"
          stroke="currentColor"
          strokeWidth="2.2"
        />
        <path
          d="M8.5 10.2c4.5 1.8 8.8 5.8 11.2 13.8"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M12.2 6.8c4.2 2.2 7.8 5.8 10.4 12"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  farmacia: {
    bg: "#E6E4FD",
    accentText: "text-[#4C3585]",
    icon: (
      <svg
        viewBox="0 0 32 32"
        fill="none"
        className="h-8 w-8 text-[#183B34]"
        aria-hidden="true"
      >
        <path
          d="M13.2 6.5h5.6v6.7h6.7v5.6h-6.7v6.7h-5.6v-6.7H6.5v-5.6h6.7V6.5Z"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
}

const FALLBACK_THEME_KEYS = [
  "alimentos",
  "salud",
  "higiene",
  "accesorios",
  "juguetes",
  "farmacia",
] as const

export default function CategoryShowcase({
  cards,
}: {
  cards: ResolvedCategoryCard[]
}) {
  if (!cards.length) {
    return null
  }

  return (
    <section
      id="categorias"
      className="relative overflow-hidden bg-[#FDF8F2] py-8 scroll-mt-44 small:py-11"
      aria-labelledby="category-showcase-heading"
    >
      {/* Decorative soft background paw watermarks matching reference */}
      <svg
        viewBox="0 0 80 80"
        fill="currentColor"
        className="pointer-events-none absolute right-[30%] top-4 hidden h-20 w-20 rotate-12 text-[#F5DEC2]/55 medium:block"
        aria-hidden="true"
      >
        <ellipse cx="40" cy="52" rx="17" ry="13.5" />
        <circle cx="19" cy="34" r="6.8" />
        <circle cx="32" cy="24" r="7.2" />
        <circle cx="48" cy="24" r="7.2" />
        <circle cx="61" cy="34" r="6.8" />
      </svg>

      <div className="site-container relative z-10">
        {/* Section Header */}
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#F5D6B3] bg-[#FDEBD5] px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#C25E00]">
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5 shrink-0 text-[#E06810]"
                aria-hidden="true"
              >
                <ellipse cx="10" cy="13.2" rx="4.2" ry="3.3" />
                <circle cx="4.8" cy="8.5" r="1.7" />
                <circle cx="8.1" cy="6.2" r="1.8" />
                <circle cx="11.9" cy="6.2" r="1.8" />
                <circle cx="15.2" cy="8.5" r="1.7" />
              </svg>
              <span>{t("home.categories.eyebrow")}</span>
            </div>

            <h2
              id="category-showcase-heading"
              className="mt-2.5 font-display text-3xl font-extrabold leading-[1.08] tracking-tight text-[#0E352E] small:text-4xl medium:text-[2.65rem]"
            >
              <span>Compra por </span>
              <span className="relative inline-block text-[#D95B16]">
                categoría
                {/* 3 Orange Sparkle Rays at top-right */}
                <svg
                  viewBox="0 0 28 26"
                  fill="none"
                  className="pointer-events-none absolute -right-7 -top-3.5 h-6 w-6 text-[#F36F21]"
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
            </h2>

            <p className="mt-2 text-sm font-medium leading-relaxed text-[#3F524E] small:text-[15.5px]">
              {t("home.categories.subtitle")}
            </p>
          </div>

          <LocalizedClientLink
            href="/store"
            className="inline-flex items-center gap-3 rounded-full border border-[#0E352E]/50 bg-white py-1.5 pl-5 pr-2 text-xs font-bold text-[#0E352E] shadow-2xs outline-none transition-all hover:bg-[#FFF9F2] focus-visible:ring-2 focus-visible:ring-[#F36F21] small:text-[13.5px]"
          >
            <span>{t("home.categories.viewAll")}</span>
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0E352E] text-white"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <path d="M4.5 10h11M11 5.5 15.5 10 11 14.5" />
              </svg>
            </span>
          </LocalizedClientLink>
        </div>

        {/* 6 Category Cards Grid */}
        <ul className="mt-7 grid grid-cols-1 gap-5 xsmall:grid-cols-2 medium:grid-cols-3">
          {cards.map((card, index) => {
            const fallbackKey =
              FALLBACK_THEME_KEYS[index % FALLBACK_THEME_KEYS.length]
            const theme =
              CARD_THEMES[card.handle] ?? CARD_THEMES[fallbackKey]

            return (
              <li key={card.id}>
                <LocalizedClientLink
                  href={card.href}
                  style={{ backgroundColor: theme.bg }}
                  className="group relative flex min-h-[192px] flex-col justify-between overflow-hidden rounded-[1.75rem] border border-white/85 p-5 shadow-[0_10px_28px_rgba(15,53,46,0.06)] outline-none transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(15,53,46,0.11)] focus-visible:ring-2 focus-visible:ring-[#F36F21] small:min-h-[206px] small:p-6"
                  data-testid={`category-card-${card.handle}`}
                >
                  {/* Right-aligned full-bleed pet & product artwork */}
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-[63%] overflow-hidden">
                    <img
                      src={card.image}
                      alt={t(card.imageAltKey)}
                      className="h-full w-full select-none object-cover object-right transition-transform duration-500 group-hover:scale-[1.03]"
                      loading={index < 3 ? "eager" : "lazy"}
                    />
                    <div
                      className="
                        absolute inset-y-0 left-0 w-10
                      "
                      style={{
                        background: `linear-gradient(to right, ${theme.bg} 0%, ${theme.bg}BF 45%, transparent 100%)`,
                      }}
                    />
                  </div>

                  {/* Left content column */}
                  <div className="relative z-10 flex h-full max-w-[54%] flex-col justify-between">
                    <div>
                      <span
                        aria-hidden="true"
                        className={clx(
                          "block font-display text-sm font-extrabold leading-none small:text-[15px]",
                          theme.accentText
                        )}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <h3 className="mt-1 font-display text-[1.35rem] font-extrabold leading-tight text-[#0E352E] small:text-[1.5rem]">
                        {card.name}
                      </h3>

                      <span
                        className={clx(
                          "mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold small:text-[13px]",
                          theme.accentText
                        )}
                      >
                        <span>{t(card.ctaKey)}</span>
                        <span
                          aria-hidden="true"
                          className="transition-transform duration-200 group-hover:translate-x-1"
                        >
                          &rarr;
                        </span>
                      </span>
                    </div>

                    {/* White rounded-2xl category icon badge */}
                    <div className="mt-4 flex h-13 w-13 items-center justify-center rounded-2xl bg-white shadow-[0_6px_16px_rgba(15,53,46,0.08)] small:h-14 small:w-14">
                      {theme.icon}
                    </div>
                  </div>
                </LocalizedClientLink>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
