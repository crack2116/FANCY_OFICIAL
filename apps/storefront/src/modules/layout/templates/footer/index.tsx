import {
  OFFERS_COLLECTION_HANDLE,
  footerColumns,
  siteConfig,
} from "@lib/site-config"
import { listCollections } from "@lib/data/collections"
import { t } from "@lib/i18n/translations"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { FancyPetsLogo } from "@modules/common/components/fancy-pets-logo"

/**
 * Storefront footer.
 *
 * Link groups come from `src/lib/site-config.ts`. Entries with a null href are
 * sections that are not built yet: they render as plain labels rather than broken
 * links. "Ofertas" is the exception — it is resolved here against the collections
 * the API really returned, so it becomes a link only when the offers collection
 * exists.
 *
 * The top band is an editorial close to the page, not a newsletter form: there is
 * no subscription endpoint in this build, and a field that silently discards an
 * address would be worse than no field at all.
 *
 * No legal or contact data is invented here. RUC, corporate name, address,
 * phone and email are intentionally absent until they are real, and the
 * payment/social slots are declared as pending rather than faked.
 */
export default async function Footer() {
  const year = new Date().getFullYear()

  const collections = await listCollections({ fields: "handle" })
    .then(({ collections: found }) => found)
    .catch(() => [])

  const offersExist = collections.some(
    (collection) => collection.handle === OFFERS_COLLECTION_HANDLE
  )

  const links = footerColumns.map((column) => ({
    ...column,
    links: column.links.map((link) =>
      link.labelKey === "footer.ofertas" && offersExist
        ? { ...link, href: `/collections/${OFFERS_COLLECTION_HANDLE}` }
        : link
    ),
  }))

  return (
    <footer className="w-full">
      {/* Closing band. The CTA points at the real catalogue, not a campaign. */}
      <div className="relative overflow-hidden bg-[#0e3b3a] text-[#fff8ea]">
        <div className="paw-layer pointer-events-none absolute inset-0 opacity-[0.07]" />
        <div className="site-container relative flex flex-col gap-6 py-10 small:flex-row small:items-center small:justify-between small:py-12">
          <div>
            <h2 className="max-w-xl font-display text-2xl font-semibold tracking-tight small:text-3xl">
              {t("footer.cta.title")}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
              {t("footer.cta.subtitle")}
            </p>
          </div>

          <LocalizedClientLink
            href="/store"
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-brand-400 px-7 text-sm font-semibold text-[#1f1b16] shadow-[0_14px_28px_-18px_rgba(0,0,0,0.7)] transition-colors hover:bg-brand-300"
          >
            {t("footer.cta.action")}
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
        </div>
      </div>

      <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-cream)]">
        <div className="site-container w-full py-12 medium:py-16">
          <div className="flex flex-col gap-10 xsmall:flex-row xsmall:justify-between">
            <div className="max-w-sm">
              <LocalizedClientLink
                href="/"
                className="inline-flex items-center transition-opacity hover:opacity-90"
                aria-label={t("nav.home")}
              >
                <FancyPetsLogo
                  className="h-12 w-auto"
                  title={siteConfig.name}
                />
              </LocalizedClientLink>
              <p className="mt-3 text-sm leading-relaxed text-fg-subtle">
                {t("footer.tagline")}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-fg-muted">
                {t("footer.placeholderNote")}
              </p>
            </div>

            <nav
              aria-label={t("footer.comprar")}
              className="grid grid-cols-2 gap-x-10 gap-y-8 xsmall:grid-cols-4 medium:gap-x-16"
            >
              {links.map((column) => (
                <div key={column.titleKey}>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-base">
                    {t(column.titleKey)}
                  </h2>
                  <ul className="mt-4 flex flex-col gap-y-3">
                    {column.links.map((link) => (
                      <li key={link.labelKey}>
                        {link.href ? (
                          <LocalizedClientLink
                            href={link.href}
                            className="text-sm text-fg-subtle transition-colors hover:text-brand-700"
                          >
                            {t(link.labelKey)}
                          </LocalizedClientLink>
                        ) : (
                          <span className="text-sm text-fg-muted">
                            {t(link.labelKey)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          <div className="mt-12 flex flex-col gap-4 border-t border-[var(--border-subtle)] pt-6 xsmall:flex-row xsmall:items-center xsmall:justify-between">
            <p className="text-xs text-fg-muted">
              {t("footer.rights", { year, name: siteConfig.name })}
            </p>
            <p className="text-xs text-fg-muted">
              {t("footer.paymentMethods")}: {t("footer.paymentPending")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
