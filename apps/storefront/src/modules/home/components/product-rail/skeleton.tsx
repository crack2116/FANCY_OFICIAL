import repeat from "@lib/util/repeat"
import { t } from "@lib/i18n/translations"

/**
 * Rail placeholder.
 *
 * Mirrors `ProductRail`'s current layout — the eyebrow, the display title, the
 * tab strip and the wider 4/5 cards — so swapping the skeleton for the real rail
 * does not move anything on the page. The old version mirrored a narrower card
 * and a heading that no longer exists, which caused a visible jump on a slow
 * connection.
 *
 * Marked `aria-busy` and described by a single "Cargando" line rather than by a
 * heading, because the rail it stands in for has not resolved its title yet.
 */
const SKELETON_CARDS = 6

export default function ProductRailSkeleton({
  id,
  title,
  subtitle,
}: {
  id: string
  title?: string
  subtitle?: string
}) {
  return (
    <section className="site-section-band" aria-busy="true">
      <div className="site-container">
        <span className="sr-only">{title || t("common.loading")}</span>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="w-full max-w-md">
            <div className="h-3 w-28 animate-pulse rounded bg-surface-muted" />
            <div className="mt-3 h-8 w-2/3 animate-pulse rounded bg-surface-muted" />
            {subtitle ? (
              <div className="mt-3 h-4 w-full animate-pulse rounded bg-surface-muted" />
            ) : null}
          </div>
          <div className="h-10 w-28 animate-pulse rounded-full bg-surface-muted" />
        </div>

        <div className="mt-5 flex gap-2" aria-hidden="true">
          {repeat(3).map((index) => (
            <span
              key={index}
              className="h-8 w-20 animate-pulse rounded-full bg-surface-muted"
            />
          ))}
        </div>

        <ul
          className="no-scrollbar mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 small:gap-5"
          aria-hidden="true"
          data-testid={`product-rail-skeleton-${id}`}
        >
          {repeat(SKELETON_CARDS).map((index) => (
            <li
              key={index}
              className="w-[62vw] max-w-[240px] shrink-0 snap-start small:w-[220px] medium:w-[230px] large:w-[260px]"
            >
              <div className="aspect-[4/5] w-full animate-pulse rounded-2xl bg-surface-muted" />
              <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-surface-muted" />
              <div className="mt-2 h-5 w-1/2 animate-pulse rounded bg-surface-muted" />
              <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-surface-muted" />
            </li>
          ))}
        </ul>

        {/* The band the real rail's dot row will occupy. A dot row that appears
            under the cards pushes nothing, because the space is already here. */}
        <div
          className="mt-6 flex items-center justify-center gap-1"
          aria-hidden="true"
        >
          {repeat(2).map((index) => (
            <span
              key={index}
              className="h-2 w-2 rounded-full bg-surface-muted"
            />
          ))}
        </div>
      </div>
    </section>
  )
}
