import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCollectionByHandle, listCollections } from "@lib/data/collections"
import { listRegions } from "@lib/data/regions"
import { inspectError } from "@lib/errors/public-error"
import { OFFERS_COLLECTION_HANDLE, siteConfig } from "@lib/site-config"
import { t } from "@lib/i18n/translations"
import { StoreCollection, StoreRegion } from "@medusajs/types"
import CollectionTemplate from "@modules/collections/templates"

type Props = {
  params: Promise<{ handle: string; countryCode: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const PRODUCT_LIMIT = 12

export const dynamic = "force-dynamic"
export const dynamicParams = true

export async function generateStaticParams() {
  if (
    process.env.BUILD_MODE === "container" ||
    process.env.MEDUSA_SKIP_STATIC_PREGEN === "true" ||
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY === "pk_placeholder"
  ) {
    console.info(
      "[SSG Info] Decoupled container build detected. Skipping collection static pre-generation (dynamicParams=true active)."
    )
    return []
  }

  try {
    const { collections } = await listCollections({
      fields: "*products",
    })

    if (!collections) {
      return []
    }

    const countryCodes = await listRegions().then(
      (regions: StoreRegion[]) =>
        regions
          ?.map((r) => r.countries?.map((c) => c.iso_2))
          .flat()
          .filter(Boolean) as string[]
    )

    const collectionHandles = collections.map(
      (collection: StoreCollection) => collection.handle
    )

    return (
      countryCodes
        ?.map((countryCode: string) =>
          collectionHandles.map((handle: string | undefined) => ({
            countryCode,
            handle,
          }))
        )
        .flat() ?? []
    )
  } catch (error) {
    const { code, status } = inspectError(error)
    console.error(
      `[SSG Error] Failed to generate static paths for collection pages (code=${code} status=${status ?? "none"}). Infrastructure error!`
    )
    if (process.env.STRICT_STATIC_BUILD === "true") {
      throw error
    }
    return []
  }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { handle, countryCode } = await props.params
  const collection = await getCollectionByHandle(handle)

  if (!collection) {
    notFound()
  }

  const description =
    handle === OFFERS_COLLECTION_HANDLE
      ? t("catalogue.offers.description")
      : t("home.meta.description")

  return {
    title: collection.title,
    description,
    // The country code is a path segment, so it has to be part of the canonical.
    alternates: { canonical: `/${countryCode}/collections/${handle}` },
    openGraph: {
      title: `${collection.title} | ${siteConfig.name}`,
      description,
    },
  }
}

export default async function CollectionPage(props: Props) {
  const [{ handle, countryCode }, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ])

  const collection = await getCollectionByHandle(handle)

  if (!collection) {
    notFound()
  }

  return (
    <CollectionTemplate
      collection={collection}
      countryCode={countryCode}
      searchParams={searchParams}
    />
  )
}