import { HttpTypes } from "@medusajs/types"
import { t } from "@lib/i18n/translations"
import { siteConfig } from "@lib/site-config"
import { FancyPetsLogo } from "@modules/common/components/fancy-pets-logo"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import AccountNav from "../components/account-nav"

/**
 * Shell for the account area.
 *
 * When customer is null (unauthenticated):
 * Renders a centered, elevated auth card with warm brand styling so the login
 * view feels complete and intentional rather than an empty grid snippet.
 *
 * When customer is authenticated:
 * Displays the full dashboard navigation on the left with account pages on the right.
 */
const AccountLayout = ({
  customer,
  children,
}: {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}) => {
  if (!customer) {
    return (
      <div
        className="flex-1 w-full bg-gradient-to-b from-[#FFFDF8] via-[#FFF8F0] to-[#FFF3E4] pt-10 sm:pt-14 pb-16 px-4 flex flex-col items-center justify-center min-h-[calc(100vh-220px)]"
        data-testid="account-page"
      >
        <div className="w-full max-w-[480px] bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(243,111,33,0.14)] border border-[#FFE8D6] p-6 sm:p-10 relative overflow-hidden">
          {/* Subtle decorative paw prints watermark in the corner */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-6 -bottom-6 w-32 h-32 opacity-[0.035] text-[#F36F21]"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 13.5c-2.4 0-4.5 1.8-4.5 4.5 0 1.9 1.4 3 3 3 1.2 0 1.5-.6 1.5-.6s.3.6 1.5.6c1.6 0 3-1.1 3-3 0-2.7-2.1-4.5-4.5-4.5zm-5.5-3c-1.4 0-2.5 1.6-2.5 3s1.1 2.5 2.5 2.5 2.5-1.1 2.5-2.5-1.1-3-2.5-3zm11 0c-1.4 0-2.5 1.6-2.5 3s1.1 2.5 2.5 2.5 2.5-1.1 2.5-2.5-1.1-3-2.5-3zm-8-5c-1.4 0-2.5 1.6-2.5 3s1.1 2.5 2.5 2.5 2.5-1.1 2.5-2.5-1.1-3-2.5-3zm5 0c-1.4 0-2.5 1.6-2.5 3s1.1 2.5 2.5 2.5 2.5-1.1 2.5-2.5-1.1-3-2.5-3z" />
            </svg>
          </div>

          {/* Branded card header */}
          <div className="flex flex-col items-center text-center mb-6">
            <FancyPetsLogo className="h-10 w-auto mb-2" title={siteConfig.name} />
          </div>

          {children}
        </div>

        {/* Helpful Trust & Support note below card */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-xs text-slate-500 text-center">
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            Compra 100% segura y garantizada
          </span>
          <span className="hidden sm:inline text-slate-300">·</span>
          <span>¿Dudas con tu cuenta? Contáctanos a nuestro soporte</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex-1 bg-gradient-to-b from-[#FFFDF8] via-[#FFFFFF] to-[#FFFDF9] py-6 small:py-10"
      data-testid="account-page"
    >
      <div className="site-container flex flex-col">
        <div className="grid grid-cols-1 small:grid-cols-[270px_1fr] gap-6 medium:gap-8 items-start">
          <div className="small:sticky small:top-28">
            <AccountNav customer={customer} />
          </div>
          <div className="flex-1 min-w-0">{children}</div>
        </div>

        <div className="mt-10 rounded-3xl border border-[#FFE4CC] bg-[#FFF8F1] p-6 sm:p-7 flex flex-col small:flex-row items-start small:items-center justify-between gap-5">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#0F352E]">
              {t("account.help.title")}
            </h3>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              {t("account.help.body")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <LocalizedClientLink
              href="/account/orders"
              className="inline-flex items-center justify-center rounded-full border border-[#F36F21]/30 bg-white px-4 py-2 text-sm font-semibold text-[#D85A0E] transition-colors hover:bg-[#FFF5EB]"
            >
              {t("account.dashboard.help.cta")}
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/store"
              className="inline-flex items-center justify-center rounded-full bg-[#F36F21] px-4 py-2 text-sm font-semibold text-white shadow-2xs transition-colors hover:bg-[#E05E10]"
            >
              {t("account.menu.viewStore")}
            </LocalizedClientLink>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountLayout
