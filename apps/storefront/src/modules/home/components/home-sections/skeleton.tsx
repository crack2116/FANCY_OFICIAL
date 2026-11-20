import repeat from "@lib/util/repeat"
import ProductRailSkeleton from "@modules/home/components/product-rail/skeleton"

/**
 * Placeholder for the whole below-the-hero block.
 *
 * Matches the real section rhythm (a category card grid, then rail-shaped rows)
 * so the swap from skeleton to content does not move the footer.
 */
const CATEGORY_PLACEHOLDERS = 3
const RAIL_PLACEHOLDERS = 2

export default function HomeSectionsSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="site-section">
        <div className="site-container">
          <div className="h-7 w-56 animate-pulse rounded bg-surface-muted" />
          <div className="mt-2 h-4 w-full max-w-xl animate-pulse rounded bg-surface-muted" />

          <div className="mt-8 grid grid-cols-1 gap-6 xsmall:grid-cols-2 medium:grid-cols-3">
            {repeat(CATEGORY_PLACEHOLDERS).map((index) => (
              <div
                key={index}
                className="overflow-hidden rounded-large border border-[var(--border-subtle)]"
              >
                <div className="aspect-[4/3] w-full animate-pulse bg-surface-muted" />
                <div className="space-y-2 px-5 py-5">
                  <div className="h-5 w-2/3 animate-pulse rounded bg-surface-muted" />
                  <div className="h-4 w-1/3 animate-pulse rounded bg-surface-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {repeat(RAIL_PLACEHOLDERS).map((index) => (
        <ProductRailSkeleton key={index} id={`home-rail-${index}`} />
      ))}
    </div>
  )
}
