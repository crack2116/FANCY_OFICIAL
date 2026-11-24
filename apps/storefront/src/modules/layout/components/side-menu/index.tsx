"use client"

import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react"
import { MagnifyingGlass, XMarkMini } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Locale } from "@lib/data/locales"
import useToggleState from "@lib/hooks/use-toggle-state"
import { t } from "@lib/i18n/translations"
import { navIcons, siteConfig } from "@lib/site-config"
import { resolveNavLinks, type ResolvedNavLink } from "@lib/util/nav-links"
import { FancyPetsLogo } from "@modules/common/components/fancy-pets-logo"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Cart from "@modules/common/icons/cart"
import Cat from "@modules/common/icons/cat"
import Heart from "@modules/common/icons/heart"
import Menu from "@modules/common/icons/menu"
import Paw from "@modules/common/icons/paw"
import User from "@modules/common/icons/user"
import { useParams, useRouter } from "next/navigation"
import { Fragment, useState, type FormEvent } from "react"
import CountrySelect from "../country-select"
import LanguageSelect from "../language-select"

type SideMenuProps = {
  regions: HttpTypes.StoreRegion[] | null
  locales: Locale[] | null
  currentLocale: string | null
  categories: HttpTypes.StoreProductCategory[]
  collections: HttpTypes.StoreCollection[]
  customer?: HttpTypes.StoreCustomer | null
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M7.5 5 12.5 10l-5 5" />
    </svg>
  )
}

function ArrowRightIcon({ className }: { className?: string }) {
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
      <path d="M4.5 10h11M11 5.5 15.5 10 11 14.5" />
    </svg>
  )
}

/**
 * Mobile navigation drawer.
 *
 * Uses Headless UI Dialog so the drawer portals into document.body and escapes
 * StickyHeader's CSS transform containing block, filling the full viewport
 * height cleanly with scroll lock and focus trapping.
 */
const SideMenu = ({
  regions,
  locales,
  currentLocale,
  categories,
  collections,
  customer,
}: SideMenuProps) => {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const countryToggleState = useToggleState()
  const languageToggleState = useToggleState()
  const router = useRouter()
  const params = useParams()

  const close = () => setOpen(false)

  const allNavLinks = resolveNavLinks(categories, collections)
  const dogsLink = allNavLinks.find((item) => item.labelKey === "nav.perros")
  const catsLink = allNavLinks.find((item) => item.labelKey === "nav.gatos")
  const offersLink = allNavLinks.find((item) => item.labelKey === "nav.ofertas")
  const departmentLinks: ResolvedNavLink[] = allNavLinks.filter(
    (item) =>
      item.labelKey !== "nav.perros" &&
      item.labelKey !== "nav.gatos" &&
      item.labelKey !== "nav.ofertas"
  )

  const countryCode =
    typeof params?.countryCode === "string" && params.countryCode
      ? params.countryCode
      : siteConfig.defaultCountryCode

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = searchQuery.trim()
    close()
    if (trimmed) {
      router.push(`/${countryCode}/store?q=${encodeURIComponent(trimmed)}`)
    } else {
      router.push(`/${countryCode}/store`)
    }
  }

  const accountLabel = customer?.first_name
    ? customer.first_name
    : t("header.account")

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="nav-menu-button"
        aria-label={t("header.openMenu")}
        aria-expanded={open}
        className="-ml-1 flex h-11 w-11 items-center justify-center rounded-xl bg-[#FAF6EF] text-[#0E352E] transition-colors hover:bg-[#F1E8DA]"
      >
        <Menu />
      </button>

      <Transition show={open} as={Fragment}>
        <Dialog onClose={close} className="relative z-[80]">
          {/* Backdrop */}
          <TransitionChild
            as={Fragment}
            enter="transition-opacity ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div
              data-testid="side-menu-backdrop"
              className="fixed inset-0 bg-[#0E352E]/50 backdrop-blur-[2px]"
              aria-hidden="true"
            />
          </TransitionChild>

          {/* Drawer container */}
          <div className="fixed inset-0 flex">
            <TransitionChild
              as={Fragment}
              enter="transform transition ease-out duration-250"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transform transition ease-in duration-200"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <DialogPanel
                data-testid="nav-menu-popup"
                className="relative flex h-dvh w-[88vw] max-w-[360px] flex-col bg-[#FFFDFA] shadow-[0_24px_60px_rgba(14,53,46,0.28)]"
              >
                {/* Branded header */}
                <div className="flex items-center justify-between border-b border-[#EFE6D8] bg-white px-5 py-3.5">
                  <LocalizedClientLink
                    href="/"
                    onClick={close}
                    className="flex items-center"
                    aria-label={t("nav.home")}
                  >
                    <FancyPetsLogo
                      className="h-9 w-auto"
                      title={siteConfig.name}
                    />
                  </LocalizedClientLink>

                  <button
                    type="button"
                    data-testid="close-menu-button"
                    onClick={close}
                    aria-label={t("header.closeMenu")}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F6F1E9] text-[#0E352E] transition-colors hover:bg-[#EAE0D0]"
                  >
                    <XMarkMini />
                  </button>
                </div>

                {/* Quick search bar */}
                <div className="border-b border-[#F3ECE1] bg-white px-5 pb-4 pt-3">
                  <form
                    onSubmit={handleSearchSubmit}
                    role="search"
                    className="flex items-center gap-2.5 rounded-full border border-[#E5DAC9] bg-[#FAF7F2] px-3.5 py-2 transition-colors focus-within:border-[#0E352E] focus-within:bg-white"
                  >
                    <MagnifyingGlass className="h-4 w-4 shrink-0 text-[#6F807B]" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder={t("header.searchPlaceholder")}
                      aria-label={t("header.searchLabel")}
                      className="w-full bg-transparent text-sm text-[#0E352E] outline-none placeholder:text-[#7D8C87]"
                    />
                  </form>
                </div>

                {/* Scrollable navigation content */}
                <nav
                  aria-label={t("nav.label")}
                  className="flex-1 overflow-y-auto overscroll-contain px-5 py-5"
                >
                  {/* Quick Pet Switcher: Perros & Gatos */}
                  {dogsLink || catsLink ? (
                    <div>
                      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7A8B86]">
                        Comprar por mascota
                      </p>
                      <div className="grid grid-cols-2 gap-2.5">
                        {dogsLink ? (
                          <LocalizedClientLink
                            href={dogsLink.href}
                            onClick={close}
                            className="flex items-center gap-2.5 rounded-xl border border-[#EFE2D0] bg-[#FDF7EE] px-3.5 py-3 transition-colors hover:border-[#D96B27]"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FCE6CA] text-[#C85A17]">
                              <Paw size="16" />
                            </span>
                            <span className="text-sm font-bold text-[#0E352E]">
                              {t(dogsLink.labelKey)}
                            </span>
                          </LocalizedClientLink>
                        ) : null}

                        {catsLink ? (
                          <LocalizedClientLink
                            href={catsLink.href}
                            onClick={close}
                            className="flex items-center gap-2.5 rounded-xl border border-[#DCEAE2] bg-[#F3F9F5] px-3.5 py-3 transition-colors hover:border-[#0E352E]"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DFF0E7] text-[#0E352E]">
                              <Cat size="16" />
                            </span>
                            <span className="text-sm font-bold text-[#0E352E]">
                              {t(catsLink.labelKey)}
                            </span>
                          </LocalizedClientLink>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {/* Department list */}
                  {departmentLinks.length > 0 ? (
                    <div className="mt-6">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7A8B86]">
                        {t("nav.categories")}
                      </p>
                      <ul className="divide-y divide-[#F0E9DE] border-y border-[#F0E9DE]">
                        {departmentLinks.map((item) => {
                          const Icon = item.icon ? navIcons[item.icon] : null
                          return (
                            <li key={item.labelKey}>
                              <LocalizedClientLink
                                href={item.href}
                                onClick={close}
                                className="group flex min-h-[48px] items-center justify-between gap-3 py-2 text-[15px] font-medium text-[#0E352E] transition-colors hover:text-[#C85A17]"
                              >
                                <span className="flex items-center gap-3">
                                  {Icon ? (
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center text-[#0E352E]/80 group-hover:text-[#C85A17]">
                                      <Icon size="18" />
                                    </span>
                                  ) : null}
                                  <span>{t(item.labelKey)}</span>
                                </span>
                                <ChevronRightIcon className="h-4 w-4 shrink-0 text-[#0E352E]/35 transition-transform group-hover:translate-x-0.5 group-hover:text-[#C85A17]" />
                              </LocalizedClientLink>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ) : null}

                  {/* Clearance / Offers highlight + full catalog link */}
                  <div className="mt-5 space-y-2.5">
                    <LocalizedClientLink
                      href={offersLink?.href ?? "/collections/ofertas"}
                      onClick={close}
                      className="flex items-center justify-between rounded-xl bg-[#0E352E] px-4 py-3.5 text-white transition-colors hover:bg-[#164A40]"
                    >
                      <span className="flex items-center gap-2.5">
                        <svg
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          className="h-4 w-4 shrink-0 text-[#FF8A3D]"
                          aria-hidden="true"
                        >
                          <path d="M8.5 1.5c.3 2.1-1.3 3.3-1.8 4.9-.3 1 .3 1.9 1.2 1.9.8 0 1.4-.6 1.5-1.5 1.6 1 2.6 2.6 2.6 4.5a4.5 4.5 0 1 1-9 0c0-2.4 1.6-4.4 3.2-5.7.7-.6 1.8-1.9 2.3-4.1Z" />
                        </svg>
                        <span className="text-sm font-bold">
                          {t("nav.clearance")} y ofertas
                        </span>
                      </span>
                      <ArrowRightIcon className="h-4 w-4 shrink-0 text-[#FF8A3D]" />
                    </LocalizedClientLink>

                    <LocalizedClientLink
                      href="/store"
                      onClick={close}
                      className="flex items-center justify-between px-1 py-1.5 text-sm font-semibold text-[#0E352E] underline decoration-[#0E352E]/30 underline-offset-4 transition-colors hover:text-[#C85A17] hover:decoration-[#C85A17]"
                    >
                      <span>{t("nav.allProducts")}</span>
                      <ArrowRightIcon className="h-4 w-4" />
                    </LocalizedClientLink>
                  </div>

                  {/* Account, Favorites, and Cart quick bar */}
                  <div className="mt-6 border-t border-[#EFE6D8] pt-5">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7A8B86]">
                      Tu cuenta
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <LocalizedClientLink
                        href="/account"
                        onClick={close}
                        className="flex flex-col items-center gap-1.5 rounded-xl border border-[#EFE6D8] bg-white px-2 py-3 text-center text-xs font-semibold text-[#0E352E] transition-colors hover:border-[#0E352E]/30"
                      >
                        <User size="18" />
                        <span className="max-w-full truncate">
                          {accountLabel}
                        </span>
                      </LocalizedClientLink>

                      <LocalizedClientLink
                        href="/favoritos"
                        onClick={close}
                        className="flex flex-col items-center gap-1.5 rounded-xl border border-[#EFE6D8] bg-white px-2 py-3 text-center text-xs font-semibold text-[#0E352E] transition-colors hover:border-[#0E352E]/30"
                      >
                        <Heart size="18" />
                        <span>{t("nav.wishlist")}</span>
                      </LocalizedClientLink>

                      <LocalizedClientLink
                        href="/cart"
                        onClick={close}
                        className="flex flex-col items-center gap-1.5 rounded-xl border border-[#EFE6D8] bg-white px-2 py-3 text-center text-xs font-semibold text-[#0E352E] transition-colors hover:border-[#0E352E]/30"
                      >
                        <Cart size="18" />
                        <span>{t("header.cart")}</span>
                      </LocalizedClientLink>
                    </div>
                  </div>
                </nav>

                {/* Footer: Region & Language selectors */}
                <div className="border-t border-[#EFE6D8] bg-[#FAF6EF] px-5 py-3">
                  {!!locales?.length ? (
                    <div
                      className="flex min-h-[40px] items-center justify-between"
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
                      className="flex min-h-[40px] items-center justify-between"
                      onMouseEnter={countryToggleState.open}
                      onMouseLeave={countryToggleState.close}
                    >
                      <CountrySelect
                        toggleState={countryToggleState}
                        regions={regions}
                      />
                    </div>
                  ) : null}

                  <p className="mt-1 text-[11px] font-medium text-[#6C7D78]">
                    Envíos en Piura · {siteConfig.name}
                  </p>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

export default SideMenu
