import { copy } from "../../lib/admin-copy"
import { BrandingForm } from "../../lib/branding-form"
import { PageHeader, Section } from "../../lib/admin-ui"

/**
 * Brand settings: logo, tagline and the five storefront colours.
 *
 * WHY THIS ROUTE HAS NO `config` EXPORT
 * -------------------------------------
 * Medusa builds the sidebar from the `config` exported by each admin route.
 * A route without that export still exists and still renders at its file-based
 * URL (`/app/marca`), but it contributes no menu item, icon or gap. The page is
 * kept on purpose: the form is still reachable by direct URL, and no backend
 * model, table or API was removed. Only the sidebar entry is gone.
 *
 * WHY IDENTITY ONLY
 * -----------------
 * Landing copy and layout still live in the storefront's own config. That text
 * is translation-keyed, so exposing it as free-text admin fields would bypass
 * the i18n layer. This page changes how the shop LOOKS, not what it says.
 */
const BrandingPage = () => {
  return (
    <div className="flex flex-col" data-testid="admin-branding-page">
      <PageHeader
        title={copy("brandingHeading")}
        description={copy("brandingSubtitle")}
      />

      <Section className="border-t border-ui-border-base">
        <BrandingForm />
      </Section>
    </div>
  )
}

export default BrandingPage