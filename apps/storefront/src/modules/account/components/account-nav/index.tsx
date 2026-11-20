"use client"

/**
 * Account navigation.
 *
 * One list of sections drives BOTH the desktop sidebar card and the mobile pill
 * bar, so every section stays in sync across breakpoints.
 */

import { useEffect, useSyncExternalStore } from "react"
import { ArrowRightOnRectangle } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { t, type TranslationKey } from "@lib/i18n/translations"
import { signout } from "@lib/data/customer"
import {
  getWishlistServerSnapshot,
  getWishlistSnapshot,
  hydrateWishlist,
  subscribeWishlist,
} from "@lib/wishlist"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { clx } from "@modules/common/components/ui"
import Heart from "@modules/common/icons/heart"
import MapPin from "@modules/common/icons/map-pin"
import Package from "@modules/common/icons/package"
import User from "@modules/common/icons/user"
import { useParams, usePathname } from "next/navigation"

type NavSection = {
  href: string
  labelKey: TranslationKey
  testId: string
  Icon: React.ComponentType<{ size?: string; className?: string }>
  showFavoritesBadge?: boolean
}

const OverviewIcon = ({ size = "18", className }: { size?: string; className?: string }) => (
  <svg
    viewBox="0 0 20 20"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    className={className}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 9.5 10 3.5l7 6V16.5a1 1 0 0 1-1 1h-4v-4.5H8v4.5H4a1 1 0 0 1-1-1V9.5Z"
    />
  </svg>
)

const SECTIONS: readonly NavSection[] = [
  { href: "/account", labelKey: "account.nav.overview", testId: "overview-link", Icon: OverviewIcon },
  { href: "/account/profile", labelKey: "account.nav.profile", testId: "profile-link", Icon: User },
  { href: "/account/orders", labelKey: "account.nav.orders", testId: "orders-link", Icon: Package },
  {
    href: "/account/addresses",
    labelKey: "account.nav.addresses",
    testId: "addresses-link",
    Icon: MapPin,
  },
  {
    href: "/account/favorites",
    labelKey: "account.nav.favorites",
    testId: "favorites-link",
    Icon: Heart,
    showFavoritesBadge: true,
  },
]

function sectionPath(pathname: string, countryCode: string): string {
  const withoutCountry = countryCode
    ? pathname.replace(new RegExp(`^/${countryCode}`), "")
    : pathname

  const normalized = withoutCountry || "/account"

  return normalized.length > 1 ? normalized.replace(/\/+$/, "") : normalized
}

function isCurrent(pathname: string, countryCode: string, href: string): boolean {
  const current = sectionPath(pathname, countryCode)
  return href === "/account" ? current === href : current.startsWith(href)
}

function getInitials(customer: HttpTypes.StoreCustomer | null): string {
  if (!customer) {
    return "F"
  }
  const first = customer.first_name?.trim().charAt(0) ?? ""
  const last = customer.last_name?.trim().charAt(0) ?? ""
  const combined = `${first}${last}`.toUpperCase()
  if (combined) {
    return combined
  }
  return (customer.email?.trim().charAt(0) || "F").toUpperCase()
}

const AccountNav = ({ customer }: { customer: HttpTypes.StoreCustomer | null }) => {
  const pathname = usePathname() ?? ""
  const { countryCode } = useParams() as { countryCode: string }

  const wishlistHandles = useSyncExternalStore(
    subscribeWishlist,
    getWishlistSnapshot,
    getWishlistServerSnapshot
  )

  useEffect(() => {
    hydrateWishlist()
  }, [])

  const favoritesCount = wishlistHandles.length

  const fullName =
    [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
    t("account.dashboard.greeting.anonymous")

  const initials = getInitials(customer)

  const handleLogout = async () => {
    await signout(countryCode)
  }

  return (
    <div>
      {/* Mobile: compact user header + scrollable section pills */}
      <nav
        className="small:hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,53,46,0.04)]"
        aria-label={t("account.nav.label")}
        data-testid="mobile-account-nav"
      >
        <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F36F21] text-xs font-bold text-white">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#0F352E]">{fullName}</p>
              {customer?.email ? (
                <p className="truncate text-xs text-slate-500">{customer.email}</p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            data-testid="logout-button-mobile"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          >
            <ArrowRightOnRectangle className="h-3.5 w-3.5" />
            <span>{t("account.nav.logout")}</span>
          </button>
        </div>

        <ul className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {SECTIONS.map((section) => {
            const current = isCurrent(pathname, countryCode, section.href)
            const label = t(section.labelKey)

            return (
              <li key={section.href} className="shrink-0">
                <LocalizedClientLink
                  href={section.href}
                  aria-current={current ? "page" : undefined}
                  data-testid={`${section.testId}-mobile`}
                  className={clx(
                    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors",
                    current
                      ? "bg-[#FFF5EB] text-[#D85A0E] border border-[#FFE0C4]"
                      : "bg-slate-50 text-slate-700 border border-slate-200/70 hover:bg-slate-100"
                  )}
                >
                  <section.Icon size="15" />
                  <span>{label}</span>
                  {section.showFavoritesBadge && favoritesCount > 0 ? (
                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F36F21] px-1 text-[10px] font-bold text-white">
                      {favoritesCount}
                    </span>
                  ) : null}
                </LocalizedClientLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Desktop sidebar card */}
      <nav
        className="hidden small:block rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,53,46,0.05)]"
        aria-label={t("account.nav.label")}
        data-testid="account-nav"
      >
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F36F21] text-sm font-bold text-white shadow-2xs">
            {initials}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-[#0F352E]">{fullName}</h3>
            {customer?.email ? (
              <p className="truncate text-xs text-slate-500">{customer.email}</p>
            ) : (
              <p className="text-xs text-slate-500">{t("account.title")}</p>
            )}
          </div>
        </div>

        <ul className="flex flex-col gap-1.5">
          {SECTIONS.map((section) => {
            const current = isCurrent(pathname, countryCode, section.href)
            const label = t(section.labelKey)

            return (
              <li key={section.href}>
                <LocalizedClientLink
                  href={section.href}
                  aria-current={current ? "page" : undefined}
                  data-testid={`${section.testId}-desktop`}
                  className={clx(
                    "flex items-center justify-between gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F36F21]",
                    current
                      ? "bg-[#FFF5EB] text-[#D85A0E] font-semibold border border-[#FFE0C4]"
                      : "text-slate-700 font-medium border border-transparent hover:bg-slate-50 hover:text-[#0F352E]"
                  )}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span
                      className={clx(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors",
                        current
                          ? "bg-white text-[#F36F21] shadow-2xs"
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      <section.Icon size="17" />
                    </span>
                    <span className="truncate">{label}</span>
                  </span>
                  {section.showFavoritesBadge && favoritesCount > 0 ? (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FFF0E4] px-1.5 text-[11px] font-bold text-[#D85A0E]">
                      {favoritesCount}
                    </span>
                  ) : null}
                </LocalizedClientLink>
              </li>
            )
          })}
        </ul>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleLogout}
            data-testid="logout-button"
            className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <ArrowRightOnRectangle className="h-4 w-4" />
            </span>
            <span>{t("account.nav.logout")}</span>
          </button>
        </div>
      </nav>
    </div>
  )
}

export default AccountNav
