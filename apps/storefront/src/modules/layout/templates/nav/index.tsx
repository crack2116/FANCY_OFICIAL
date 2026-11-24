import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { listRegions } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"
import { resolveNavLinks } from "@lib/util/nav-links"
import { navIcons, siteConfig } from "@lib/site-config"
import { t } from "@lib/i18n/translations"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { FancyPetsLogo } from "@modules/common/components/fancy-pets-logo"
import Cart from "@modules/common/icons/cart"
import ChevronDown from "@modules/common/icons/chevron-down"
import CartButton from "@modules/layout/components/cart-button"
import NavAccountButton from "@modules/layout/components/nav-account-button"
import NavWishlist from "@modules/layout/components/nav-wishlist"
import Search from "@modules/layout/components/search"
import SideMenu from "@modules/layout/components/side-menu"
import StickyHeader from "@modules/layout/components/sticky-header"
import { Suspense } from "react"

export default async function Nav() {
  const [regions, locales, currentLocale, productCategories, collections, customer] =
    await Promise.all([
      listRegions(),
      listLocales(),
      getLocale(),
      listCategories(),
      listCollections({ fields: "handle" }),
      retrieveCustomer().catch(() => null),
    ])

  const navItems = resolveNavLinks(
    productCategories ?? [],
    collections.collections ?? []
  )

  return (
    <StickyHeader
      logoRow={
        <div className="bg-white">
          <div className="site-container flex h-[84px] items-center justify-between gap-3 xsmall:gap-6">
            {/* Mobile: menu trigger */}
            <div className="flex items-center small:hidden">
              <SideMenu
                regions={regions}
                locales={locales}
                currentLocale={currentLocale}
                categories={productCategories ?? []}
                collections={collections.collections ?? []}
                customer={customer}
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
                className="h-11 w-auto xsmall:h-12 small:h-[56px]"
                title={siteConfig.name}
              />
            </LocalizedClientLink>

            {/* Search: icon on mobile, wide rounded-full pill on desktop */}
            <div className="ml-auto min-w-0 small:mx-auto small:max-w-[44rem] small:flex-1">
              <Search />
            </div>

            {/* Header actions: Account, Wishlist and Cart */}
            <div className="flex shrink-0 items-center gap-0.5 xsmall:gap-2">
              {/* Account Button (with Floating Auth Modal when unauthenticated) */}
              <NavAccountButton customer={customer} />

              {/* Wishlist / Favoritos */}
              <NavWishlist />

              {/* Cart */}
              <Suspense
                fallback={
                  <LocalizedClientLink
                    href="/cart"
                    className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#1A1A1A] transition-colors hover:bg-slate-100"
                  >
                    <Cart size="22" />
                    <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#F36F21] px-1 text-[10px] font-bold leading-none text-white shadow-sm">
                      0
                    </span>
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
          <div className="bg-white/95 backdrop-blur-sm">
            <div className="site-container pb-3 pt-1">
              <nav
                aria-label={t("nav.label")}
                className="flex items-center justify-between rounded-full border border-slate-100 bg-white px-4 py-1.5 shadow-[0_4px_24px_rgba(15,53,46,0.08)]"
              >
                <ul className="flex flex-wrap items-center">
                  {navItems.map((item, idx) => {
                    const Icon = item.icon ? navIcons[item.icon] : null

                    return (
                      <li key={item.labelKey} className="flex items-center">
                        {idx > 0 ? (
                          <span
                            aria-hidden="true"
                            className="mx-1 h-4 w-px bg-slate-200 medium:mx-1.5"
                          />
                        ) : null}
                        <LocalizedClientLink
                          href={item.href}
                          className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold text-[#1E293B] transition-colors hover:bg-[#FFF5EB] hover:text-[#F36F21] medium:px-3"
                        >
                          {Icon ? (
                            <Icon className="shrink-0 text-[#0F352E]" />
                          ) : null}
                          <span>{t(item.labelKey)}</span>
                          {item.children?.length ? (
                            <ChevronDown size="12" className="shrink-0" />
                          ) : null}
                        </LocalizedClientLink>
                      </li>
                    )
                  })}
                </ul>

                <LocalizedClientLink
                  href="/collections/ofertas"
                  className="ml-2 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#F36F21] to-[#FB8C00] px-4 py-2 text-xs font-bold text-white shadow-sm transition-transform hover:scale-[1.02]"
                >
                  {/* Flame icon */}
                  <svg
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  >
                    <path d="M8.5 1.5c.3 2.1-1.3 3.3-1.8 4.9-.3 1 .3 1.9 1.2 1.9.8 0 1.4-.6 1.5-1.5 1.6 1 2.6 2.6 2.6 4.5a4.5 4.5 0 1 1-9 0c0-2.4 1.6-4.4 3.2-5.7.7-.6 1.8-1.9 2.3-4.1Z" />
                  </svg>
                  <span>{t("nav.clearance")}</span>
                  <span aria-hidden="true">&rarr;</span>
                </LocalizedClientLink>
              </nav>
            </div>
          </div>
        ) : null
      }
    />
  )
}
