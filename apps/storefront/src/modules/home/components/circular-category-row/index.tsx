import { t } from "@lib/i18n/translations"
import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import type { ResolvedCategoryCard } from "@lib/util/home-merchandising"

/**
 * "Por tipo de mascota": a horizontal row of circular category images.
 *
 * WHY IT EXISTS BESIDE `CategoryShowcase`
 * ----------------------------------------
 * The home page had one category block, a tall three-column card grid that
 * fills a whole screen. The live store leads with a compact circular row instead
 * and keeps the taller block further down, so the shopper gets a fast visual
 * route into a species and then the detailed grid below.
 *
 * This is that first, quick route. It renders the SAME resolved cards, so it can
 * never offer a category the rest of the page does not have, and a handle that
 * is not seeded is simply absent here rather than broken.
 *
 * THE CIRCLE
 * ----------
 * `aspect-square` plus `rounded-full` gives the circle without a fixed pixel
 * size, so the row reflows from five across to two without the artwork
 * stretching or the labels colliding.
 */
export default function CircularCategoryRow({
  cards,
  title,
  subtitle,
}: {
  cards: ResolvedCategoryCard[]
  title: string
  subtitle?: string
}) {
  if (!cards.length) {
    return null
  }

  return (
    <section className="site-section pt-0" aria-label={title}>
      <div className="site-container">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-fg-base">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-2 text-sm leading-relaxed text-fg-subtle">
              {subtitle}
            </p>
          ) : null}
        </div>

        {/* The grid is sized to the six categories this store actually has, so the
            row stays full instead of orphaning the last card on its own line.
            It still reflows down to two across on a phone. */}
        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 xsmall:grid-cols-3 medium:grid-cols-6">
          {cards.map((card) => (
            <li key={card.id}>
              <LocalizedClientLink
                href={card.href}
                className="group flex flex-col items-center gap-3 text-center"
                data-testid={`circular-category-${card.handle}`}
              >
                <span className="relative block aspect-square w-full max-w-[150px] overflow-hidden rounded-full bg-surface-subtle ring-1 ring-[var(--border-subtle)] transition-all duration-200 group-hover:ring-2 group-hover:ring-brand-400">
                  <Image
                    src={card.image}
                    alt={t(card.imageAltKey)}
                    fill
                    sizes="(min-width: 1280px) 150px, (min-width: 512px) 25vw, 33vw"
                    className="object-cover"
                  />
                </span>
                <span className="text-sm font-semibold uppercase tracking-wide text-fg-base transition-colors group-hover:text-brand-700">
                  {card.name}
                </span>
              </LocalizedClientLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}