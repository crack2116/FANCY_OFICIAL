import type { Metadata } from "next"

import { listBrands } from "@lib/data/brands"
import { inspectError } from "@lib/errors/public-error"
import { t } from "@lib/i18n/translations"
import { siteConfig } from "@lib/site-config"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * `/pe/marcas` — the brand index.
 *
 * WHY THIS PAGE EARNS ITS PLACE
 * -----------------------------
 * A product card CANNOT link to its brand: the whole card is already an anchor,
 * and an anchor inside an anchor is invalid HTML that both screen readers and
 * middle-click get wrong. So the brand's page is reachable from exactly two
 * places — this index and the product detail — and without this index the brand
 * pages would be nearly unreachable, with the "Todas las marcas" back-link on
 * each of them pointing at nothing. Four brands over 13 of 18 products is a real
 * dimension of this catalogue, not a one-off demo, so the page is a hub rather
 * than a novelty.
 *
 * ONLY BRANDS WITH PRODUCTS APPEAR
 * --------------------------------
 * `listBrands` returns one entry per brand the index actually matched, each with
 * the engine's own count, and drops any count of zero. A brand created in the
 * Admin but not yet assigned to a product is therefore absent here — which is
 * correct: a shopper has nothing to see. Deactivating a brand removes it from the
 * listing as soon as the index no longer reports it, with no separate rule to
 * keep in step.
 */
export const metadata: Metadata = {
  title: t("brand.index.metaTitle"),
  description: t("brand.index.metaDescription"),
  alternates: { canonical: "/pe/marcas" },
  openGraph: {
    title: `${t("brand.index.metaTitle")} | ${siteConfig.name}`,
    description: t("brand.index.metaDescription"),
  },
}

/**
 * The page takes no props on purpose.
 *
 * It lives under `[countryCode]` so its links resolve to `/pe/marcas/...`, but it
 * renders the same for every region: a brand list has no prices in it. The
 * canonical lives in the static `metadata` above, which cannot see route params,
 * so it is pinned to the project's default country segment rather than
 * pretending to be region-aware.
 */
export default async function BrandIndexPage() {
  let brands: Awaited<ReturnType<typeof listBrands>> = []

  try {
    brands = await listBrands()
  } catch (error) {
    /*
     * A brand index that throws would take the page down with a Medusa message in
     * the error. Logging the classification and rendering the empty state keeps
     * the failure invisible to the shopper and recoverable on the next render.
     */
    const { code, status } = inspectError(error)

    console.error(
      `Failed to list brands (code=${code} status=${status ?? "none"})`
    )
  }

  return (
    <div className="site-container py-8" data-testid="brand-index-container">
      <header className="mb-8 flex flex-col gap-y-2">
        <h1
          className="text-3xl font-semibold tracking-tight text-fg-base"
          data-testid="brand-index-title"
        >
          {t("brand.index.heading")}
        </h1>

        <p className="max-w-2xl text-sm leading-relaxed text-fg-subtle">
          {t("brand.index.subtitle")}
        </p>
      </header>

      {brands.length === 0 ? (
        <p className="text-sm text-fg-subtle" data-testid="brand-index-empty">
          {t("brand.index.empty")}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-x-6 gap-y-6 small:grid-cols-2 medium:grid-cols-3">
          {brands.map((brand) => (
            <li key={brand.handle}>
              <LocalizedClientLink
                href={`/marcas/${brand.handle}`}
                className="group flex h-full flex-col gap-y-1 rounded-lg border border-[var(--border-subtle)] bg-surface p-5 transition-colors hover:border-brand-500"
                data-testid="brand-index-item"
              >
                <span className="text-sm font-medium text-fg-base transition-colors group-hover:text-brand-700">
                  {brand.name}
                </span>

                <span className="text-xs text-fg-muted">
                  {brand.count === 1
                    ? t("brand.index.productCountOne")
                    : t("brand.index.productCount", { count: brand.count })}
                </span>
              </LocalizedClientLink>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10">
        <LocalizedClientLink
          href="/store"
          className="text-sm font-medium text-brand-700 underline underline-offset-4 transition-colors hover:text-brand-800"
        >
          {t("brand.index.allBrands")}
        </LocalizedClientLink>
      </div>
    </div>
  )
}