import { getBaseURL } from "@lib/util/env"
import { siteConfig } from "@lib/site-config"
import { getBranding, brandingStyle } from "@lib/branding"
import { t } from "@lib/i18n/translations"
import { Plus_Jakarta_Sans } from "next/font/google"
import { Metadata } from "next"
import "styles/globals.css"

/**
 * Plus Jakarta Sans, self-hosted by next/font at build time (no runtime request
 * to a third-party font CDN). Exposed as `--font-sans` and `--font-display` so
 * both body copy and display headings share one cohesive geometric sans-serif
 * with native weights from 400 to 800 (eliminating synthetic faux-bold).
 */
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
}

export default async function RootLayout(props: {
  children: React.ReactNode
}) {
  const branding = await getBranding()

  return (
    <html
      lang={siteConfig.locale}
      data-mode="light"
      className={plusJakartaSans.variable}
    >
      <body className="font-sans antialiased" style={brandingStyle(branding)}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          {t("header.skipToContent")}
        </a>
        <main id="main-content" className="relative">
          {props.children}
        </main>
      </body>
    </html>
  )
}
