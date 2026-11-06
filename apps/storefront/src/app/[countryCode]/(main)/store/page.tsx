import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getRegion } from "@lib/data/regions"
import { t } from "@lib/i18n/translations"
import StoreTemplate from "@modules/store/templates"

type Props = {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const [{ countryCode }, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ])
  const query = searchParams.q

  if (typeof query === "string" && query.trim().length > 0) {
    return {
      title: t("catalogue.results.searchHeading", { query: query.trim() }),
      description: t("home.meta.description"),
      // A search result page is a view of the same catalogue, never a separate
      // document to index.
      robots: { index: false, follow: true },
    }
  }

  return {
    title: t("nav.allProducts"),
    description: t("home.meta.description"),
    alternates: { canonical: `/${countryCode}/store` },
  }
}

export default async function StorePage(props: Props) {
  const [{ countryCode }, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ])
  const region = await getRegion(countryCode)

  if (!region) {
    notFound()
  }

  return <StoreTemplate countryCode={countryCode} searchParams={searchParams} />
}