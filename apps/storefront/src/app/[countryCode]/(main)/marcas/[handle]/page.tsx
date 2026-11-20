import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { retrieveBrand } from "@lib/data/brands"
import { inspectError } from "@lib/errors/public-error"
import { t } from "@lib/i18n/translations"
import { siteConfig } from "@lib/site-config"
import BrandTemplate from "@modules/brands/templates"

import type { CatalogueSearchParams } from "@modules/store/templates/catalogue-results"

type Props = {
  params: Promise<{ handle: string; countryCode: string }>
  searchParams: Promise<CatalogueSearchParams>
}

/**
 * `/pe/marcas/<handle>`.
 *
 * A handle that resolves to nothing is a 404, not an empty page. That is the
 * honest answer for a brand that was never published, was just created and has
 * no products, or has been deactivated: none of them is a page a shopper should
 * land on and have to interpret.
 *
 * Deliberately NOT statically generated. `generateStaticParams` would need the
 * full brand directory at build time, which would freeze a brand list that
 * merchandising changes daily — and the brand page itself re-runs a catalogue
 * search that must never be cached (see `@lib/catalogue/cache-policy`). The route
 * is rendered per request instead, which is the same trade the category and
 * collection pages already make.
 */
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { handle, countryCode } = await props.params

  const brand = await safeRetrieveBrand(handle)

  if (!brand) {
    return { title: t("brand.index.metaTitle") }
  }

  return {
    title: brand.name,
    description: t("brand.page.metaDescription", { brand: brand.name }),
    // The country code is a path segment, so it belongs in the canonical.
    alternates: { canonical: `/${countryCode}/marcas/${brand.handle}` },
    openGraph: {
      title: `${brand.name} | ${siteConfig.name}`,
      description: t("brand.page.metaDescription", { brand: brand.name }),
    },
  }
}

/**
 * A failed brand read must not become a 500 with a Medusa message in it.
 *
 * `inspectError` returns a code and a status only, so nothing internal is logged
 * or rendered, and a `null` here degrades to "no such brand" — the same answer a
 * genuinely unknown handle gets.
 */
async function safeRetrieveBrand(handle: string) {
  try {
    return await retrieveBrand(handle)
  } catch (error) {
    const { code, status } = inspectError(error)

    console.error(
      `Failed to resolve brand page (code=${code} status=${status ?? "none"})`
    )

    return null
  }
}

export default async function BrandPage(props: Props) {
  const [{ handle, countryCode }, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ])

  const brand = await safeRetrieveBrand(handle)

  if (!brand) {
    notFound()
  }

  return (
    <BrandTemplate
      brand={brand}
      countryCode={countryCode}
      searchParams={searchParams}
    />
  )
}