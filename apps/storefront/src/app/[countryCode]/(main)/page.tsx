import { Metadata } from "next"
import { Suspense } from "react"

import { getRegion } from "@lib/data/regions"
import { homeSeo } from "@lib/home-config"
import { t } from "@lib/i18n/translations"
import { siteConfig } from "@lib/site-config"
import Hero from "@modules/home/components/hero"
import HomeSections from "@modules/home/components/home-sections"
import HomeSectionsSkeleton from "@modules/home/components/home-sections/skeleton"

/**
 * Title and description come from `home-config.ts`, so SEO copy is merchandised
 * next to the rest of the page instead of being hardcoded here. The root layout
 * appends the brand, and the file-based `opengraph-image` still supplies the
 * social preview because `openGraph.images` is deliberately left unset.
 */
export const metadata: Metadata = {
  title: t(homeSeo.titleKey),
  description: t(homeSeo.descriptionKey),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale.replace("-", "_"),
    siteName: siteConfig.name,
    title: t(homeSeo.titleKey),
    description: t(homeSeo.descriptionKey),
    url: "/",
  },
}

/**
 * Home.
 *
 * Server Component. The hero needs only the branding document, which the root
 * layout has already fetched for the CSS variables, so it resolves from cache
 * without its own suspense boundary; everything that needs the catalogue streams
 * in behind a skeleton. Only the hero carousel inside `<Hero />` is a Client
 * Component.
 *
 * `<Hero />` is a SIBLING of `<HomeSections />`, not a child: the hero has to
 * paint without waiting for the taxonomy, so it cannot live behind the same
 * Suspense boundary.
 */
export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const { countryCode } = params

  const region = await getRegion(countryCode)

  return (
    <>
      <Hero />

      <Suspense fallback={<HomeSectionsSkeleton />}>
        <HomeSections region={region} />
      </Suspense>
    </>
  )
}
