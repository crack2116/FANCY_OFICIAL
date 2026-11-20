import { siteConfig } from "@lib/site-config"
import { t } from "@lib/i18n/translations"
import { LockClosedSolid } from "@medusajs/icons"
import { FancyPetsLogo } from "@modules/common/components/fancy-pets-logo"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative w-full min-h-screen bg-[#FAF8F4]">
      <div className="h-[72px] border-b border-[#E7E5DF] bg-white/95 backdrop-blur sticky top-0 z-30">
        <nav className="site-container flex h-full items-center justify-between gap-3">
          <LocalizedClientLink
            href="/cart"
            className="flex flex-1 basis-0 items-center gap-x-1.5 text-sm font-medium text-[#0F352E] hover:text-[#F36F21] transition-colors"
            data-testid="back-to-cart-link"
          >
            <ChevronDown className="rotate-90 shrink-0" size={16} />
            <span className="hidden small:block">{t("checkout.backToCart")}</span>
            <span className="block small:hidden">{t("checkout.back")}</span>
          </LocalizedClientLink>

          <LocalizedClientLink
            href="/"
            className="flex shrink-0 items-center transition-opacity hover:opacity-90"
            data-testid="store-link"
            aria-label={t("nav.home")}
          >
            <span className="sr-only">{siteConfig.name}</span>
            <FancyPetsLogo />
          </LocalizedClientLink>

          <div className="flex flex-1 basis-0 items-center justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF8F4] border border-[#E7E5DF] px-3 py-1 text-xs font-medium text-[#0F352E]">
              <LockClosedSolid className="h-3.5 w-3.5 text-[#0F352E] shrink-0" />
              <span className="hidden xsmall:inline">{t("checkout.secureBadge")}</span>
            </span>
          </div>
        </nav>
      </div>

      <div className="relative" data-testid="checkout-container">
        {children}
      </div>
    </div>
  )
}