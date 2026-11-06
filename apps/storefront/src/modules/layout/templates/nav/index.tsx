import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { listRegions } from "@lib/data/regions"
import { resolveNavLinks } from "@lib/util/nav-links"
import { navIcons, siteConfig } from "@lib/site-config"
import { t } from "@lib/i18n/translations"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { FancyPetsLogo } from "@modules/common/components/fancy-pets-logo"
import Cart from "@modules/common/icons/cart"
import ChevronDown from "@modules/common/icons/chevron-down"
import User from "@modules/common/icons/user"
import CartButton from "@modules/layout/components/cart-button"
import NavWishlist from "@modules/layout/components/nav-wishlist"
import Search from "@modules/layout/components/search"
import SideMenu from "@modules/layout/components/side-menu"
import StickyHeader from "@modules/layout/components/sticky-header"
import { Suspense } from "react"

/**
 * Storefront header.
 *
 * Desktop: wordmark, a prominent search entry point, account and cart, plus a
 * category bar underneath. Mobile: menu trigger, wordmark and icon actions,
 * with navigation living in the side menu drawer.
 *
 * The links come from `resolveNavLinks`, shared with the side menu, and only
 * contain destinations that exist in the backend: a category handle that is in
 * the taxonomy, or the offers collection. An entry that names nothing real is
 * dropped rather than rendered as a link to somewhere else.
 */
export default async function Nav() {
  const [regions, locales, currentLocale, productCategories, collections] =
    await Promise.all([
      listRegions(),
      listLocales(),
      getLocale(),
      listCategories(),
      listCollections({ fields: "handle" }),
    ])

  const navItems = resolveNavLinks(
    productCategories ?? [],
    collections.collections ?? []
  )

  return (
    <StickyHeader
      logoRow={
        <div className="border-b border-[var(--border-subtle)]/80 bg-[var(--chrome-header)]">
          <div className="site-container flex h-[95px] items-center gap-2 xsmall:gap-6">
            {/* Mobile: menu trigger */}
            <div className="flex items-center small:hidden">
              <SideMenu
                regions={regions}
                locales={locales}
                currentLocale={currentLocale}
                categories={productCategories ?? []}
                collections={collections.collections ?? []}
              />
            </div>

            {/* Wordmark */}
            <LocalizedClientLink
              href="/"
              className="flex shrink-0 items-center transition-opacity hover:opacity-90"
              aria-label={t("nav.home")}
            >
              <span className="sr-only">{siteConfig.name}</span>
              <FancyPetsLogo
                className="h-10 w-auto xsmall:h-12 small:h-14"
                title={siteConfig.name}
              />
            </LocalizedClientLink>

            {/* Search: icon on mobile, prominent field on desktop. */}
            <div className="ml-auto min-w-0 small:ml-0 small:max-w-[59.125rem] small:flex-1">
              <Search />
            </div>

            {/* Header actions: Account, Wishlist and Cart */}
            <div className="flex items-center gap-0.5 xsmall:gap-1.5">
              <LocalizedClientLink
                href="/account"
                className="hidden h-10 items-center gap-2 rounded-full px-3 text-sm text-[var(--chrome-header-ink)] transition-colors hover:bg-[var(--chrome-header-hover)] xsmall:flex"
                data-testid="nav-account-link"
              >
                <User />
                <span className="hidden font-medium medium:inline">
                  {t("header.account")}
                </span>
              </LocalizedClientLink>

              {/* Wishlist / Favoritos */}
              <NavWishlist />

              {/* Cart */}
              <Suspense
                fallback={
                  <LocalizedClientLink
                    href="/cart"
                    className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--chrome-header-ink)] transition-colors hover:bg-[var(--chrome-header-hover)]"
                  >
                    <Cart size="22" />
                    <span className="sr-only">{t("header.cart")}</span>
                  </LocalizedClientLink>
                }
              >
                <CartButton />
              </Suspense>
            </div>
          </div>
        </div>
      }
      navRow={
        navItems.length > 0 ? (
          <nav
            aria-label={t("nav.label")}
            className="h-full border-t border-[var(--border-subtle)]/70 bg-[var(--chrome-nav)]"
          >
            <ul className="site-container flex h-12 items-center gap-x-1 medium:gap-x-1.5">
              {navItems.map((item) => {
                const Icon = item.icon ? navIcons[item.icon] : null

                return (
                  <li key={item.labelKey}>
                    <LocalizedClientLink
                      href={item.href}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-fg-subtle transition-colors hover:bg-brand-100 hover:text-fg-base medium:px-3.5"
                    >
                      {Icon ? <Icon className="shrink-0" /> : null}
                      <span>{t(item.labelKey)}</span>
                      {item.children?.length ? (
                        <ChevronDown size="12" className="shrink-0" />
                      ) : null}
                    </LocalizedClientLink>
                  </li>
                )
              })}

              <li className="ml-auto">
                <LocalizedClientLink
                  href="/collections/ofertas"
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand-400 px-4 text-[11px] font-bold uppercase tracking-wide text-[#1f1b16] shadow-sm transition-colors hover:bg-brand-300"
                >
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-accent-600"
                  />
                  {t("nav.clearance")}
                </LocalizedClientLink>
              </li>
            </ul>
          </nav>
        ) : null
      }
    />
  )
}