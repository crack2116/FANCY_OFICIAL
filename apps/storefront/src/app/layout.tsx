import { getBaseURL } from "@lib/util/env"
import { siteConfig } from "@lib/site-config"
import { getBranding, brandingStyle } from "@lib/branding"
import { t } from "@lib/i18n/translations"
import { Fredoka, Inter } from "next/font/google"
import { Metadata } from "next"
import "styles/globals.css"

/**
 * One typeface, self-hosted by next/font at build time (no runtime request to
 * a font CDN). Exposed as a CSS variable so Tailwind's `font-sans` resolves to
 * the real webfont instead of falling back to the system stack.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
})

/**
 * Display face for editorial headings only.
 *
 * A rounded geometric sans gives the storefront a warmer, more distinctive voice
 * than the body face without touching the official wordmark. It is loaded from
 * the same self-hosted pipeline as Inter, so there is no runtime request to a
 * third-party font CDN.
 */
const fredoka = Fredoka({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["500", "600", "700"],
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
}

/**
 * Root layout.
 *
 * Branding is fetched on the SERVER and applied as inline CSS custom properties
 * on `<body>`. Doing it here rather than in a client provider is deliberate: the
 * variables are present in the first HTML response, so there is no flash of the
 * default palette and no hydration mismatch. Components keep reading
 * `--brand-500` and friends and need no change when a colour is edited in the
 * Admin.
 */
export default async function RootLayout(props: {
  children: React.ReactNode
}) {
  const branding = await getBranding()

  return (
    <html
      lang={siteConfig.locale}
      data-mode="light"
      className={`${inter.variable} ${fredoka.variable}`}
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