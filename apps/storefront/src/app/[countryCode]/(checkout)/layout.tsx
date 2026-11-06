import { siteConfig } from "@lib/site-config"
import { t } from "@lib/i18n/translations"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative w-full bg-surface small:min-h-screen">
      <div className="h-16 border-b border-[var(--border-subtle)] bg-surface">
        <nav className="site-container flex h-full items-center justify-between">
          <LocalizedClientLink
            href="/cart"
            className="flex flex-1 basis-0 items-center gap-x-2 text-small-semi text-ui-fg-base"
            data-testid="back-to-cart-link"
          >
            <ChevronDown className="rotate-90" size={16} />
            <span className="txt-compact-plus mt-px hidden text-ui-fg-subtle hover:text-ui-fg-base small:block">
              {t("checkout.backToCart")}
            </span>
            <span className="txt-compact-plus mt-px block text-ui-fg-subtle hover:text-ui-fg-base small:hidden">
              {t("checkout.back")}
            </span>
          </LocalizedClientLink>

          <LocalizedClientLink
            href="/"
            className="text-lg font-bold tracking-tight text-fg-base transition-colors hover:text-brand-700"
            data-testid="store-link"
          >
            {siteConfig.name}
          </LocalizedClientLink>

          <div className="flex-1 basis-0" />
        </nav>
      </div>

      <div className="relative" data-testid="checkout-container">
        {children}
      </div>
    </div>
  )
}