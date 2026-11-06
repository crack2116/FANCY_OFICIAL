"use client"

import { Popover, PopoverPanel, Transition } from "@headlessui/react"
import useToggleState from "@lib/hooks/use-toggle-state"
import { Locale } from "@lib/data/locales"
import { siteConfig } from "@lib/site-config"
import { resolveNavLinks } from "@lib/util/nav-links"
import { t, type TranslationKey } from "@lib/i18n/translations"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Menu from "@modules/common/icons/menu"
import { XMarkMini } from "@medusajs/icons"
import { Fragment } from "react"
import CountrySelect from "../country-select"
import LanguageSelect from "../language-select"

type SideMenuProps = {
  regions: HttpTypes.StoreRegion[] | null
  locales: Locale[] | null
  currentLocale: string | null
  categories: HttpTypes.StoreProductCategory[]
  collections: HttpTypes.StoreCollection[]
}

type SecondaryLink = { labelKey: TranslationKey; href: string }

const secondaryLinks: SecondaryLink[] = [
  { labelKey: "nav.home", href: "/" },
  { labelKey: "nav.allProducts", href: "/store" },
  { labelKey: "header.account", href: "/account" },
  { labelKey: "header.cart", href: "/cart" },
]

/**
 * Mobile navigation drawer.
 *
 * Reachable with one thumb: it slides in from the left, fills the viewport
 * height, keeps every target comfortably tappable and closes on navigation.
 * Headless UI's Popover provides the focus trap, Escape handling and
 * aria-expanded wiring.
 *
 * The category links are the SAME resolver the desktop header uses, so the two
 * menus cannot offer different destinations.
 */
const SideMenu = ({
  regions,
  locales,
  currentLocale,
  categories,
  collections,
}: SideMenuProps) => {
  const countryToggleState = useToggleState()
  const languageToggleState = useToggleState()

  const categoryLinks = resolveNavLinks(categories, collections)

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <Popover.Button
            data-testid="nav-menu-button"
            aria-label={t("header.openMenu")}
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-md text-fg-base transition-colors hover:bg-surface-subtle"
          >
            <Menu />
          </Popover.Button>

          <Transition
            show={open}
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <PopoverPanel
              data-testid="nav-menu-popup"
              className="fixed inset-0 z-[60] flex"
            >
              {/* Scrim */}
              <div
                data-testid="side-menu-backdrop"
                className="absolute inset-0 bg-brand-900/40"
                aria-hidden="true"
              />

              {/* Panel */}
              <div className="relative flex h-full w-[86%] max-w-sm flex-col bg-surface shadow-[var(--elevation-modal)]">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4">
                  <span className="text-base font-bold tracking-tight text-fg-base">
                    {siteConfig.name}
                  </span>
                  <button
                    type="button"
                    data-testid="close-menu-button"
                    onClick={close}
                    aria-label={t("header.closeMenu")}
                    className="-mr-2 flex h-11 w-11 items-center justify-center rounded-md text-fg-subtle transition-colors hover:bg-surface-subtle hover:text-fg-base"
                  >
                    <XMarkMini />
                  </button>
                </div>

                <nav
                  aria-label={t("nav.label")}
                  className="flex-1 overflow-y-auto overscroll-contain px-4 py-4"
                >
                  {categoryLinks.length > 0 ? (
                    <>
                      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
                        {t("nav.categories")}
                      </p>
                      <ul className="flex flex-col">
                        {categoryLinks.map((item) => (
                          <li key={item.labelKey}>
                            <LocalizedClientLink
                              href={item.href}
                              onClick={close}
                              className="flex min-h-[44px] items-center rounded-md px-2 text-[15px] text-fg-base transition-colors hover:bg-surface-subtle"
                            >
                              {t(item.labelKey)}
                            </LocalizedClientLink>
                          </li>
                        ))}
                      </ul>
                      <div className="my-4 h-px bg-[var(--border-subtle)]" />
                    </>
                  ) : null}

                  <ul className="flex flex-col">
                    {secondaryLinks.map((link) => (
                      <li key={link.href}>
                        <LocalizedClientLink
                          href={link.href}
                          onClick={close}
                          className="flex min-h-[44px] items-center rounded-md px-2 text-[15px] text-fg-subtle transition-colors hover:bg-surface-subtle hover:text-fg-base"
                        >
                          {t(link.labelKey)}
                        </LocalizedClientLink>
                      </li>
                    ))}
                  </ul>
                </nav>

                <div className="border-t border-[var(--border-subtle)] px-4 py-3">
                  {!!locales?.length ? (
                    <div
                      className="flex min-h-[44px] items-center justify-between"
                      onMouseEnter={languageToggleState.open}
                      onMouseLeave={languageToggleState.close}
                    >
                      <LanguageSelect
                        toggleState={languageToggleState}
                        locales={locales}
                        currentLocale={currentLocale}
                      />
                    </div>
                  ) : null}
                  {regions?.length ? (
                    <div
                      className="flex min-h-[44px] items-center justify-between"
                      onMouseEnter={countryToggleState.open}
                      onMouseLeave={countryToggleState.close}
                    >
                      <CountrySelect
                        toggleState={countryToggleState}
                        regions={regions}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  )
}

export default SideMenu