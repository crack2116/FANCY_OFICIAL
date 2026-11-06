import { t } from "@lib/i18n/translations"
import type { ResolvedCategoryCard } from "@lib/util/home-merchandising"
import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { clx } from "@modules/common/components/ui"

/**
 * "Compra por categoría".
 *
 * Server Component. The cards come from `homeCategoryCards` matched against the
 * categories the API actually returned, so the visible name and the target URL
 * are both real: a handle that is not seeded simply does not produce a card.
 *
 * The tint palette is presentation only. It is assigned by position so the grid
 * reads as a curated set of shelves rather than six identical white boxes, and it
 * never encodes meaning (a colour is not a category state).
 */
const TINTS = [
  "bg-[#fde7d6]",
  "bg-[#e8f1e6]",
  "bg-[#e6f0f7]",
  "bg-[#f4ede4]",
  "bg-[#f9e8ef]",
  "bg-[#eeeaf7]",
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
      className="site-section scroll-mt-44"
      aria-labelledby="category-showcase-heading"
    >
      <div className="site-container">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">
              {t("home.categories.eyebrow")}
            </p>
            <h2
              id="category-showcase-heading"
              className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg-base small:text-4xl"
            >
              {t("home.categories.title")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-fg-subtle small:text-base">
              {t("home.categories.subtitle")}
            </p>
          </div>

          <LocalizedClientLink
            href="/store"
            className="inline-flex items-center gap-2 rounded-full border border-[#e6d8c4] bg-white px-5 py-2.5 text-sm font-semibold text-fg-base shadow-sm outline-none transition-colors hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            {t("home.categories.viewAll")}
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-brand-700"
              aria-hidden="true"
            >
              <path d="M4 10h11M11 5l5 5-5 5" />
            </svg>
          </LocalizedClientLink>
        </div>

        <ul className="mt-8 grid grid-cols-1 gap-4 xsmall:grid-cols-2 medium:grid-cols-3">
          {cards.map((card, index) => (
            <li key={card.id}>
              <LocalizedClientLink
                href={card.href}
                className={clx(
                  "group relative flex h-full items-center justify-between gap-4 overflow-hidden rounded-[1.6rem] border border-white/80 p-5 shadow-[var(--shadow-card)] outline-none transition-all duration-200 hover:-translate-y-1 hover:border-white hover:shadow-[var(--shadow-lift)] focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 small:p-6",
                  TINTS[index % TINTS.length]
                )}
                data-testid={`category-card-${card.handle}`}
              >
                <div className="relative z-10 flex min-w-0 flex-col">
                  <span
                    aria-hidden="true"
                    className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-muted"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-1.5 font-display text-[1.3rem] font-semibold leading-snug text-fg-base transition-colors group-hover:text-brand-800 small:text-[1.45rem]">
                    {card.name}
                  </h3>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-700">
                    {t(card.ctaKey)}
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1"
                      aria-hidden="true"
                    >
                      <path d="M4 10h11M11 5l5 5-5 5" />
                    </svg>
                  </span>
                </div>

                <div className="relative h-[6.25rem] w-[6.25rem] shrink-0 overflow-hidden rounded-2xl border border-white/80 bg-white/60 p-1.5 shadow-[0_8px_18px_-14px_rgba(61,46,28,0.6)] transition-transform duration-300 group-hover:scale-[1.04] xsmall:h-28 xsmall:w-28">
                  <div className="relative h-full w-full overflow-hidden rounded-[0.85rem]">
                    <Image
                      src={card.image}
                      alt={t(card.imageAltKey)}
                      fill
                      sizes="112px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                </div>

                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/40 blur-2xl"
                />
              </LocalizedClientLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
