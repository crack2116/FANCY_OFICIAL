"use client"

/**
 * Account navigation.
 *
 * One list of sections drives BOTH the desktop sidebar and the mobile list, so
 * a section can never exist on one breakpoint and be missing on the other.
 *
 * CURRENT SECTION
 * The active entry gets `aria-current="page"`, which is what tells a screen
 * reader "you are here" and gives sighted users the bold treatment. Detection
 * compares the pathname AFTER the country segment, because `/pe/account/orders`
 * would otherwise look like a prefix match for `/pe/account`.
 *
 * There are four sections and no nesting: an account does not need a hierarchy,
 * and a deeper tree would mean a mobile drawer that hides half the options.
 */

import { ArrowRightOnRectangle } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { t, type TranslationKey } from "@lib/i18n/translations"
import { signout } from "@lib/data/customer"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { clx } from "@modules/common/components/ui"
import ChevronDown from "@modules/common/icons/chevron-down"
import MapPin from "@modules/common/icons/map-pin"
import Package from "@modules/common/icons/package"
import User from "@modules/common/icons/user"
import { useParams, usePathname } from "next/navigation"

type NavSection = {
  href: string
  labelKey: TranslationKey
  testId: string
  Icon?: React.ComponentType<{ size?: string }>
}

const SECTIONS: readonly NavSection[] = [
  { href: "/account", labelKey: "account.nav.overview", testId: "overview-link" },
  { href: "/account/profile", labelKey: "account.nav.profile", testId: "profile-link", Icon: User },
  {
    href: "/account/addresses",
    labelKey: "account.nav.addresses",
    testId: "addresses-link",
    Icon: MapPin,
  },
  { href: "/account/orders", labelKey: "account.nav.orders", testId: "orders-link", Icon: Package },
]

/**
 * Strip the `/<countryCode>` prefix and the trailing slash so comparisons are
 * exact. `/pe/account/` and `/pe/account` are the same section.
 */
function sectionPath(pathname: string, countryCode: string): string {
  const withoutCountry = countryCode
    ? pathname.replace(new RegExp(`^/${countryCode}`), "")
    : pathname

  const normalized = withoutCountry || "/account"

  return normalized.length > 1 ? normalized.replace(/\/+$/, "") : normalized
}

function isCurrent(pathname: string, countryCode: string, href: string): boolean {
  const current = sectionPath(pathname, countryCode)

  // `/account` is the dashboard: only an exact match counts, otherwise every
  // child route would light it up.
  return href === "/account" ? current === href : current.startsWith(href)
}

const AccountNav = ({ customer }: { customer: HttpTypes.StoreCustomer | null }) => {
  const pathname = usePathname() ?? ""
  const { countryCode } = useParams() as { countryCode: string }

  const greeting = customer?.first_name
    ? t("account.dashboard.greeting", { name: customer.first_name })
    : t("account.dashboard.greeting.anonymous")

  const handleLogout = async () => {
    await signout(countryCode)
  }

  const renderLink = (section: NavSection, mobile: boolean) => {
    const current = isCurrent(pathname, countryCode, section.href)
    const label = t(section.labelKey)

    return (
      <LocalizedClientLink
        key={section.href}
        href={section.href}
        // The authoritative "you are here" signal for assistive technology.
        aria-current={current ? "page" : undefined}
        className={clx(
          "flex items-center justify-between py-4 border-b border-gray-200",
          mobile ? "px-8" : "",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-sm"
        )}
        data-testid={`${section.testId}-${mobile ? "mobile" : "desktop"}`}
      >
        <span className="flex items-center gap-x-2">
          {section.Icon ? <section.Icon size="20" /> : null}
          <span className={clx("text-small-regular", current && "font-semibold text-fg-base")}>
            {label}
          </span>
        </span>
        {mobile ? <ChevronDown className="transform -rotate-90" /> : null}
      </LocalizedClientLink>
    )
  }

  return (
    <div>
      {/* Mobile: a flat, always-expanded list. `small` is the 1024px
          breakpoint, so below it there is no sidebar to scroll for. */}
      <nav
        className="small:hidden"
        aria-label={t("account.nav.label")}
        data-testid="mobile-account-nav"
      >
        <LocalizedClientLink
          href="/account"
          className="flex items-center gap-x-2 text-small-regular py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-sm"
          data-testid="account-main-link"
        >
          <ChevronDown className="transform rotate-90" />
          <span>{t("account.nav.overview")}</span>
        </LocalizedClientLink>
        <div className="text-xl-semi mb-4 px-8 pt-2">{greeting}</div>
        <div className="text-base-regular">
          <ul className="flex flex-col">
            {SECTIONS.filter((section) => section.href !== "/account").map((section) => (
              <li key={section.href}>{renderLink(section, true)}</li>
            ))}
            <li>
              <button
                type="button"
                className="flex items-center justify-between py-4 border-b border-gray-200 w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-sm"
                onClick={handleLogout}
                data-testid="logout-button-mobile"
              >
                <span className="flex items-center gap-x-2">
                  <ArrowRightOnRectangle />
                  <span className="text-small-regular">{t("account.nav.logout")}</span>
                </span>
                <ChevronDown className="transform -rotate-90" />
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Desktop sidebar. */}
      <nav
        className="hidden small:block"
        aria-label={t("account.nav.label")}
        data-testid="account-nav"
      >
        <div className="pb-4">
          <h3 className="text-base-semi">{t("account.title")}</h3>
        </div>
        <div className="text-base-regular">
          <ul className="flex flex-col gap-y-4">
            {SECTIONS.map((section) => (
              <li key={section.href}>{renderLink(section, false)}</li>
            ))}
            <li>
              <button
                type="button"
                className="text-small-regular text-ui-fg-subtle hover:text-ui-fg-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-sm"
                onClick={handleLogout}
                data-testid="logout-button"
              >
                {t("account.nav.logout")}
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </div>
  )
}

export default AccountNav