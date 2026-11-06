import { t } from "@lib/i18n/translations"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductPreview from "@modules/products/components/product-preview"

import ProductRailSkeleton from "./skeleton"
import RailArrows from "./rail-arrows"
import RailDots from "./rail-dots"
import RailTabs, { type RailCategory } from "./rail-tabs"

export type ProductRailProps = {
  /** Stable id. Required because it namespaces the heading and the scroller. */
  id: string
  title: string
  subtitle?: string
  /** Real products, already priced for the region. */
  products: HttpTypes.StoreProduct[]
  /**
   * Product id to the categories that product belongs to.
   *
   * PASSED IN, NOT READ OFF THE PRODUCT. `/store/products` does not return a
   * product's categories unless the shared `fields` string asks for it, so
   * `CollectionRail` builds this from the category listing instead. Omit it and
   * the rail renders every card with no tab strip.
   */
  categoryIndex?: Map<string, RailCategory[]>
  /** "Ver todo" destination. Omit to render the rail without the link. */
  href?: string
  /** Defaults to the shared "ver todo" copy. */
  viewAllLabel?: string
  region?: HttpTypes.StoreRegion
  /** Renders the skeleton placeholder instead of the list. */
  isLoading?: boolean
}

/**
 * How many categories the header may show.
 *
 * The tab strip sits opposite the title on one line, so it has a width budget
 * like any other. Six plus the "all" tab is what still fits beside a heading at
 * 1280px; a rail with more categories than that shows the busiest ones and the
 * rest stay reachable through the collection page the "ver todo" link points at.
 */
const MAX_TAB_CATEGORIES = 5

/**
 * One horizontal product rail.
 *
 * A single reusable component drives all three home rails (destacados, nuevos,
 * ofertas) — the differences live in `src/lib/home-config.ts`, not in duplicated
 * markup. It is a Server Component: the header tabs and the pagination dots are
 * the only Client Components, and both find the list they act on by id rather
 * than receiving the products. That keeps every variant's calculated price out
 * of the client bundle.
 *
 * Desktop gets dots; every viewport also gets a native snap scroller, so the
 * rail is swipeable on touch without JavaScript.
 *
 * A rail with no products renders nothing at all — no heading, no empty row.
 */
export default function ProductRail({
  id,
  title,
  subtitle,
  products,
  categoryIndex,
  href,
  viewAllLabel,
  region,
  isLoading = false,
}: ProductRailProps) {
  if (isLoading) {
    return <ProductRailSkeleton id={id} title={title} subtitle={subtitle} />
  }

  if (!products.length) {
    return null
  }

  const headingId = `${id}-heading`
  const listId = `${id}-list`
  const index = categoryIndex ?? new Map<string, RailCategory[]>()
  const categories = railCategories(index)

  /*
   * A collection can legitimately hold fewer products than fill a desktop row
   * (the featured collection ships with two). The rail stays a scroller on
   * touch, but from `small` up the end card grows into the remaining width and
   * becomes an editorial panel instead of leaving a dead gap on the right.
   */
  const sparse = products.length + (href ? 1 : 0) <= 3

  return (
    /*
     * `site-section-band`, not `site-section`: the band is the light grey the
     * reference puts behind each rail, and `site-section` is the padding-only
     * rhythm class the whole page shares. The page around the band stays
     * `--surface` white, which is what `body` already paints.
     */
    <section
      id={id}
      className="site-section-band scroll-mt-44"
      aria-labelledby={headingId}
    >
      <div className="site-container">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">
              {t("home.rails.eyebrow")}
            </p>
            <h2
              id={headingId}
              className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg-base small:text-4xl"
            >
              {title}
            </h2>

            {subtitle ? (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-subtle">
                {subtitle}
              </p>
            ) : null}
          </div>

          {href ? (
            <LocalizedClientLink
              href={href}
              className="inline-flex items-center gap-2 rounded-full border border-[#e6d8c4] bg-white px-5 py-2.5 text-sm font-semibold text-fg-base shadow-sm outline-none transition-colors hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              {viewAllLabel ?? t("home.rails.viewAll")}
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
          ) : null}
        </div>

        {/* A rail whose products carry no categories has nothing to filter by,
            so it renders without the strip rather than with a lone "Todos". */}
        {categories.length > 0 ? (
          <div className="mt-5">
            <RailTabs listId={listId} label={title} categories={categories} />
          </div>
        ) : null}

        <div className="relative mt-6">
          <RailArrows listId={listId} />
          <ul
            id={listId}
            className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 small:gap-5"
            data-testid={`product-rail-${id}`}
          >
            {products.map((product) => (
              <li
                key={product.id}
                className="w-[62vw] max-w-[240px] shrink-0 snap-start xsmall:w-[220px] small:w-[220px] medium:w-[230px] large:w-[260px]"
                data-categories={categoryHandles(index.get(product.id))}
              >
                <ProductPreview product={product} region={region} isFeatured />
              </li>
            ))}

            {/*
             * End-of-rail destination. A collection with two products used to
             * leave most of the row empty, which reads as a loading failure. The
             * card is not a product and carries no data: it is the same "Ver
             * todo" destination as the header, placed where the eye already is
             * after scrolling the rail.
             */}
            {href ? (
              <li
                className={
                  sparse
                    ? "w-[62vw] max-w-[240px] shrink-0 snap-start xsmall:w-[220px] xsmall:max-w-[220px] small:w-auto small:max-w-none small:flex-1"
                    : "w-[62vw] max-w-[240px] shrink-0 snap-start small:w-[220px] medium:w-[230px] large:w-[260px]"
                }
              >
                <RailEndCard
                  href={href}
                  label={viewAllLabel ?? t("home.rails.viewAll")}
                  title={title}
                  wide={sparse}
                />
              </li>
            ) : null}
          </ul>
        </div>

        <RailDots listId={listId} label={title} />
      </div>
    </section>
  )
}

/**
 * The end-of-rail destination.
 *
 * `wide` is used when the rail cannot fill a desktop row on its own. The panel
 * then grows into the leftover width, so the row reads as a composed block
 * instead of a row of cards with an empty half. On touch widths the same
 * component keeps the compact card shape and stays inside the scroller.
 */
function RailEndCard({
  href,
  label,
  title,
  wide,
}: {
  href: string
  label: string
  title: string
  wide: boolean
}) {
  if (!wide) {
    return (
      <LocalizedClientLink
        href={href}
        className="group relative flex h-full min-h-[27rem] flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-dashed border-[#d8ccba] bg-white/50 p-6 text-center outline-none transition-colors hover:border-brand-400 hover:bg-white focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      >
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700 transition-transform group-hover:translate-x-0.5">
          <Arrow className="h-5 w-5" />
        </span>
        <span className="relative font-display text-lg font-semibold text-fg-base">
          {label}
        </span>
        <span className="relative text-xs text-fg-muted">{title}</span>
      </LocalizedClientLink>
    )
  }

  return (
    <LocalizedClientLink
      href={href}
      className="group relative flex h-full min-h-[27rem] flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#e6d8c4] bg-[linear-gradient(135deg,#fffaf2_0%,#fdf1df_100%)] p-6 text-center outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[var(--shadow-card)] focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 small:block small:p-8 small:text-left"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-100 opacity-70 blur-2xl"
      />

      {/* Below `small` the panel keeps the compact card shape: a wide editorial
          block in a 220px column would wrap into a wall of text. */}
      <div className="relative z-10 flex w-full flex-col items-center justify-center gap-3 small:hidden">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700 transition-transform group-hover:translate-x-0.5">
          <Arrow className="h-5 w-5" />
        </span>
        <span className="font-display text-lg font-semibold text-fg-base">
          {label}
        </span>
        <span className="text-xs text-fg-muted">{title}</span>
      </div>

      <div className="relative z-10 hidden w-full flex-col justify-center gap-6 small:flex medium:flex-row medium:items-center medium:justify-between">
        <div className="min-w-0 max-w-[22rem]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">
            {t("home.rails.eyebrow")}
          </p>
          <p className="mt-2 font-display text-2xl font-semibold leading-tight text-fg-base">
            {t("home.rails.endCard.title")}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-fg-subtle">
            {t("home.rails.endCard.body")}
          </p>

          <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-16px_rgba(163,81,15,0.9)] transition-colors group-hover:bg-brand-800">
            {t("home.rails.endCard.cta")}
            <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>

          <span className="mt-3 block text-xs text-fg-muted">{title}</span>
        </div>

        <span
          aria-hidden="true"
          className="hidden h-28 w-28 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/60 text-brand-700 opacity-60 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] medium:flex"
        >
          <Paw className="h-14 w-14 -rotate-6" />
        </span>
      </div>
    </LocalizedClientLink>
  )
}

function Arrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 10h11M11 5l5 5-5 5" />
    </svg>
  )
}

/** Decorative paw used as the wide end-card seal. */
function Paw({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 60" fill="currentColor" className={className} aria-hidden="true">
      <ellipse cx="32" cy="41" rx="14" ry="11" />
      <ellipse cx="14" cy="27" rx="5.5" ry="7.5" />
      <ellipse cx="50" cy="27" rx="5.5" ry="7.5" />
      <ellipse cx="23" cy="14" rx="5" ry="6.5" />
      <ellipse cx="41" cy="14" rx="5" ry="6.5" />
    </svg>
  )
}

/**
 * The category handles of one card, space separated.
 *
 * A space is the separator because `data-categories` is read back with a single
 * `split(" ")` in the tab component: the tabs must not have to know the shape of
 * the product, only a membership test they can do against a string. A card in
 * no category gets an empty value, which means it shows under "Todos" and under
 * no category tab — which is the honest reading.
 */
function categoryHandles(membership: RailCategory[] | undefined): string {
  return (membership ?? []).map((category) => category.handle).join(" ")
}

/**
 * The categories this rail's own cards belong to, busiest first.
 *
 * READ FROM THE CARDS, NOT FROM A LIST. Every category here has at least one
 * card on screen, so a tab can never narrow the rail down to an empty row, and a
 * category added to the catalogue appears without a config edit. Ranking by how
 * many of the rail's cards each category covers keeps the busiest first — which
 * is also the order the reference shows them in — and the name breaks ties so
 * the strip is stable between renders.
 */
function railCategories(index: Map<string, RailCategory[]>): RailCategory[] {
  const counts = new Map<string, { handle: string; name: string; count: number }>()

  /* `Array.from`, not `for..of`: tsconfig targets es5 without
     `downlevelIteration`, so iterating a Map directly does not compile. */
  for (const membership of Array.from(index.values())) {
    for (const category of membership) {
      const existing = counts.get(category.handle)

      if (existing) {
        existing.count += 1
      } else {
        counts.set(category.handle, {
          handle: category.handle,
          name: category.name,
          count: 1,
        })
      }
    }
  }

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, MAX_TAB_CATEGORIES)
    .map(({ handle, name }) => ({ handle, name }))
}
