import { t } from "@lib/i18n/translations"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductPreview from "@modules/products/components/product-preview"

import ProductRailSkeleton from "./skeleton"
import RailArrows from "./rail-arrows"
import RailDots from "./rail-dots"
import RailTabs, { type RailCategory } from "./rail-tabs"

export type ProductRailProps = {
  id: string
  title: string
  subtitle?: string
  products: HttpTypes.StoreProduct[]
  categoryIndex?: Map<string, RailCategory[]>
  href?: string
  viewAllLabel?: string
  region?: HttpTypes.StoreRegion
  isLoading?: boolean
}

const MAX_TAB_CATEGORIES = 5

function splitRailHeading(title: string): { lead: string; accent: string } {
  const trimmed = title.trim()
  if (trimmed.toLowerCase() === "productos del mes") {
    return { lead: "Productos ", accent: "del mes" }
  }
  const parts = trimmed.split(/\s+/)
  if (parts.length <= 1) {
    return { lead: "", accent: trimmed }
  }
  const accent = parts.pop() ?? ""
  return { lead: `${parts.join(" ")} `, accent }
}

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

  const orderedProducts = [...products].sort((a, b) => {
    const rank = (p: HttpTypes.StoreProduct) => {
      const tl = (p.title ?? "").toLowerCase()
      if (tl.includes("pedigree")) return 0
      if (tl.includes("cama para gatos")) return 1
      return 2
    }
    return rank(a) - rank(b)
  })

  const sparse = orderedProducts.length + (href ? 1 : 0) <= 3
  const { lead, accent } = splitRailHeading(title)

  return (
    <section
      id={id}
      className="relative overflow-hidden bg-[var(--surface,#FAF6EF)] py-9 scroll-mt-44 small:py-12"
      aria-labelledby={headingId}
    >
      {/* Decorative soft background paw watermarks matching reference */}
      <svg
        viewBox="0 0 80 80"
        fill="currentColor"
        className="pointer-events-none absolute left-[44%] top-12 hidden h-14 w-14 -rotate-12 text-[#F3E2C9] opacity-75 small:block"
        aria-hidden="true"
      >
        <ellipse cx="40" cy="52" rx="17" ry="13.5" />
        <ellipse cx="19" cy="34" rx="6.8" ry="9" transform="rotate(-18 19 34)" />
        <ellipse cx="32" cy="22" rx="6.2" ry="8.5" transform="rotate(-6 32 22)" />
        <ellipse cx="48" cy="22" rx="6.2" ry="8.5" transform="rotate(6 48 22)" />
        <ellipse cx="61" cy="34" rx="6.8" ry="9" transform="rotate(18 61 34)" />
      </svg>

      <svg
        viewBox="0 0 80 80"
        fill="currentColor"
        className="pointer-events-none absolute right-[18%] top-14 hidden h-12 w-12 rotate-12 text-[#F3E2C9] opacity-75 small:block"
        aria-hidden="true"
      >
        <ellipse cx="40" cy="52" rx="17" ry="13.5" />
        <ellipse cx="19" cy="34" rx="6.8" ry="9" transform="rotate(-18 19 34)" />
        <ellipse cx="32" cy="22" rx="6.2" ry="8.5" transform="rotate(-6 32 22)" />
        <ellipse cx="48" cy="22" rx="6.2" ry="8.5" transform="rotate(6 48 22)" />
        <ellipse cx="61" cy="34" rx="6.8" ry="9" transform="rotate(18 61 34)" />
      </svg>

      <div className="site-container relative z-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#D96B27]">
              <span>{t("home.rails.eyebrow")}</span>
              <span
                aria-hidden="true"
                className="h-[2px] w-6 rounded-full bg-[#D96B27]"
              />
            </div>

            <div className="mt-1.5">
              <h2
                id={headingId}
                className="relative inline-block font-display text-[2.1rem] font-extrabold leading-[1.06] tracking-tight small:text-[2.65rem]"
              >
                {lead ? <span className="text-[#0E352E]">{lead}</span> : null}
                <span className="relative inline-block text-[#F36F21]">
                  {accent}
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
            </div>

            {subtitle ? (
              <p className="mt-1.5 max-w-2xl text-sm font-medium leading-relaxed text-[#3F524E] small:text-[15.5px]">
                {subtitle}
              </p>
            ) : null}
          </div>

          {href ? (
            <LocalizedClientLink
              href={href}
              className="inline-flex items-center gap-2 rounded-full border border-[#0E352E]/55 bg-white px-5 py-2 text-xs font-bold text-[#0E352E] shadow-2xs outline-none transition-all hover:bg-[#FFF9F2] focus-visible:ring-2 focus-visible:ring-[#F36F21] small:text-[13.5px]"
            >
              <span>Ver todos</span>
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-[#F36F21]"
                aria-hidden="true"
              >
                <path d="M4.5 10h11M11 5.5 15.5 10 11 14.5" />
              </svg>
            </LocalizedClientLink>
          ) : null}
        </div>

        {categories.length > 0 ? (
          <div className="mt-5">
            <RailTabs listId={listId} label={title} categories={categories} />
          </div>
        ) : null}

        <div className="relative mt-6">
          <RailArrows listId={listId} hideOnDesktop={sparse} />
          <ul
            id={listId}
            className={
              sparse
                ? "no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 small:gap-5 medium:grid medium:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.95fr)] medium:overflow-visible"
                : "no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 small:gap-5"
            }
            data-testid={`product-rail-${id}`}
          >
            {orderedProducts.map((product) => {
              const firstCategory = index.get(product.id)?.[0]?.name
              return (
                <li
                  key={product.id}
                  className={
                    sparse
                      ? "w-[68vw] max-w-[260px] shrink-0 snap-start xsmall:w-[235px] small:w-[240px] medium:w-auto medium:max-w-none"
                      : "w-[68vw] max-w-[260px] shrink-0 snap-start xsmall:w-[235px] small:w-[240px] medium:w-[248px] large:w-[265px]"
                  }
                  data-categories={categoryHandles(index.get(product.id))}
                >
                  <ProductPreview
                    product={product}
                    region={region}
                    isFeatured
                    categoryLabel={firstCategory}
                  />
                </li>
              )
            })}

            {href ? (
              <li
                data-rail-end-card="true"
                className={
                  sparse
                    ? "w-[82vw] max-w-[360px] shrink-0 snap-start small:w-auto small:max-w-none small:flex-1 medium:w-auto"
                    : "w-[68vw] max-w-[260px] shrink-0 snap-start small:w-[240px] medium:w-[248px] large:w-[265px]"
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
        className="group relative flex h-full min-h-[24rem] flex-col items-center justify-center gap-3 overflow-hidden rounded-[1.75rem] border border-dashed border-[#d8ccba] bg-white/70 p-6 text-center outline-none transition-colors hover:border-[#F36F21] hover:bg-white focus-visible:ring-2 focus-visible:ring-[#F36F21]"
      >
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#FCEAD7] text-[#F36F21] transition-transform group-hover:translate-x-0.5">
          <Arrow className="h-5 w-5" />
        </span>
        <span className="relative font-display text-lg font-bold text-[#0E352E]">
          {label}
        </span>
        <span className="relative text-xs font-medium text-[#3F524E]">
          {title}
        </span>
      </LocalizedClientLink>
    )
  }

  return (
    <LocalizedClientLink
      href={href}
      className="group relative flex h-full min-h-[365px] items-center overflow-hidden rounded-[1.75rem] border border-white/80 bg-[#FEF5E3] p-6 text-left shadow-[0_10px_28px_rgba(15,53,46,0.06)] outline-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,53,46,0.11)] focus-visible:ring-2 focus-visible:ring-[#F36F21] small:p-8"
    >
      {/* Left editorial copy column */}
      <div className="relative z-10 flex max-w-[52%] flex-col items-start">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F5DCBA] px-3.5 py-1 text-xs font-extrabold">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className="h-3.5 w-3.5 shrink-0"
            aria-hidden="true"
          >
            <path
              d="m10 2.2 2.2 4.6 5.05.7-3.66 3.52.88 5.02L10 13.65l-4.47 2.39.88-5.02-3.66-3.52 5.05-.7L10 2.2Z"
              fill="#F59E0B"
              stroke="#0E352E"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <span>
            <span className="text-[#0E352E]">Selección </span>
            <span className="text-[#B85014]">especial</span>
          </span>
        </div>

        <h3 className="mt-3.5 font-display text-2xl font-extrabold leading-[1.06] tracking-tight small:text-3xl medium:text-[2.15rem]">
          <span className="block text-[#0E352E]">Descubre toda</span>
          <span className="block text-[#F36F21]">la selección</span>
        </h3>

        <p className="mt-2.5 max-w-[18.5rem] text-xs font-medium leading-relaxed text-[#2E4742] small:text-[13.5px]">
          {t("home.rails.endCard.body")}
        </p>

        <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#9A4E12] px-5 py-2.5 text-xs font-bold text-white shadow-[0_8px_20px_rgba(154,78,18,0.28)] transition-colors group-hover:bg-[#7F3E0B] small:text-[13.5px]">
          <span>{t("home.rails.endCard.cta")}</span>
          <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>

        <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#2E4742]">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className="h-4 w-4 shrink-0 text-[#154738]"
            aria-hidden="true"
          >
            <path
              d="M10 1.8 3.2 4.6v4.8c0 4.4 2.9 8.3 6.8 9.6 3.9-1.3 6.8-5.2 6.8-9.6V4.6L10 1.8Z"
              fill="currentColor"
            />
            <path
              d="m7.2 10.1 1.9 1.9 3.8-3.8"
              stroke="#FFFFFF"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Productos de calidad</span>
        </div>
      </div>

      {/* Right HD pet artwork */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-2 bottom-0 right-0 w-[64%] overflow-hidden"
      >
        <img
          src="/hero/promo-seleccion-especial.png"
          alt=""
          className="h-full w-full object-contain object-right-bottom transition-transform duration-300 group-hover:scale-[1.02]"
        />
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
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 10h11M11 5l5 5-5 5" />
    </svg>
  )
}

function categoryHandles(membership: RailCategory[] | undefined): string {
  return (membership ?? []).map((category) => category.handle).join(" ")
}

function railCategories(index: Map<string, RailCategory[]>): RailCategory[] {
  const counts = new Map<string, { handle: string; name: string; count: number }>()

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
