import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCategoryByHandle, listCategories } from "@lib/data/categories"
import { listRegions } from "@lib/data/regions"
import { t } from "@lib/i18n/translations"
import { inspectError } from "@lib/errors/public-error"
import { siteConfig } from "@lib/site-config"
import { HttpTypes, StoreRegion } from "@medusajs/types"
import CategoryTemplate from "@modules/categories/templates"

type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const dynamic = "force-dynamic"
export const dynamicParams = true

export async function generateStaticParams() {
  if (
    process.env.BUILD_MODE === "container" ||
    process.env.MEDUSA_SKIP_STATIC_PREGEN === "true" ||
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY === "pk_placeholder"
  ) {
    console.info(
      "[SSG Info] Decoupled container build detected. Skipping category static pre-generation (dynamicParams=true active)."
    )
    return []
  }

  try {
    const product_categories = await listCategories()

    if (!product_categories) {
      return []
    }

    const countryCodes = await listRegions().then((regions: StoreRegion[]) =>
      regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat()
    )

    const categoryHandles = product_categories.map(
      (category: HttpTypes.StoreProductCategory) => category.handle
    )

    return (
      countryCodes
        ?.map((countryCode: string | undefined) =>
          categoryHandles.map((handle: string) => ({
            countryCode,
            category: [handle],
          }))
        )
        .flat() ?? []
    )
  } catch (error) {
    const { code, status } = inspectError(error)
    console.error(
      `[SSG Error] Failed to generate static paths for category pages (code=${code} status=${status ?? "none"}). Infrastructure error!`
    )
    if (process.env.STRICT_STATIC_BUILD === "true") {
      throw error
    }
    return []
  }
}

/**
 * Category SEO, derived from the category itself.
 *
 * The description falls back to the store's own description rather than to a
 * generated sentence, because a one-line "Alimentos | Pet Store" is not a
 * description and the page already says what a category is above the grid.
 */
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { category, countryCode } = await props.params
  const productCategory = await getCategoryByHandle(category)

  if (!productCategory) {
    notFound()
  }

  const description = productCategory.description?.trim()
    ? productCategory.description.trim()
    : t("home.meta.description")

  return {
    title: productCategory.name,
    description,
    // The country code is a path segment, so it has to be part of the canonical.
    alternates: { canonical: `/${countryCode}/categories/${category.join("/")}` },
    openGraph: {
      title: `${productCategory.name} | ${siteConfig.name}`,
      description,
    },
  }
}

export default async function CategoryPage(props: Props) {
  const [{ category, countryCode }, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ])

  const productCategory = await getCategoryByHandle(category)

  if (!productCategory) {
    notFound()
  }

  return (
    <CategoryTemplate
      category={productCategory}
      countryCode={countryCode}
      searchParams={searchParams}
    />
  )
}