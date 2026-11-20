import { Metadata } from "next"
import { Suspense } from "react"

import { getRegion } from "@lib/data/regions"
import { homeSeo } from "@lib/home-config"
import { t } from "@lib/i18n/translations"
import { siteConfig } from "@lib/site-config"
import Hero from "@modules/home/components/hero"
import HomeSections from "@modules/home/components/home-sections"
import HomeSectionsSkeleton from "@modules/home/components/home-sections/skeleton"

export const dynamic = "force-dynamic"

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
