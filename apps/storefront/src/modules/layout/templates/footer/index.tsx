import {
  OFFERS_COLLECTION_HANDLE,
  footerColumns,
  siteConfig,
} from "@lib/site-config"
import { listCollections } from "@lib/data/collections"
import { t } from "@lib/i18n/translations"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * Storefront footer.
 *
 * Link groups come from `src/lib/site-config.ts`. Entries with a null href are
 * sections that are not built yet: they render as plain labels rather than broken
 * links. "Ofertas" is the exception — it is resolved here against the collections
 * the API really returned, so it becomes a link only when the offers collection
 * exists.
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
    <footer className="w-full border-t border-[var(--border-subtle)] bg-surface">
        <div className="site-container w-full py-12 medium:py-16">
          <div className="flex flex-col gap-10 xsmall:flex-row xsmall:justify-between">
            <div className="max-w-sm">
              <LocalizedClientLink
                href="/"
                className="text-lg font-bold tracking-tight text-fg-base transition-colors hover:text-brand-700"
              >
                {siteConfig.name}
              </LocalizedClientLink>
              <p className="mt-3 text-sm leading-relaxed text-fg-subtle">
                {t("footer.tagline")}
              </p>
            </div>

            <nav
              aria-label={t("footer.comprar")}
              className="grid grid-cols-2 gap-x-10 gap-y-8 xsmall:grid-cols-4 medium:gap-x-16"
            >
              {links.map((column) => (
                <div key={column.titleKey}>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    {t(column.titleKey)}
                  </h2>
                  <ul className="mt-4 flex flex-col gap-y-3">
                    {column.links.map((link) => (
                      <li key={link.labelKey}>
                        {link.href ? (
                          <LocalizedClientLink
                            href={link.href}
                            className="text-sm text-fg-subtle transition-colors hover:text-fg-base"
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
              {t("footer.paymentMethods")}: {t("footer.placeholderNote")}
            </p>
          </div>
        </div>
      </footer>
  )
}