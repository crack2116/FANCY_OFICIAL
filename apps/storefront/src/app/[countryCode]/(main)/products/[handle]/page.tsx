import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { listProducts } from "@lib/data/products"
import { getRegion, listRegions } from "@lib/data/regions"
import { inspectError } from "@lib/errors/public-error"
import { siteConfig } from "@lib/site-config"
import { HttpTypes } from "@medusajs/types"
import ProductTemplate from "@modules/products/templates"

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
  searchParams: Promise<{ v_id?: string }>
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
      "[SSG Info] Decoupled container build detected. Skipping product static pre-generation (dynamicParams=true active)."
    )
    return []
  }

  try {
    const countryCodes = await listRegions().then((regions) =>
      regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat()
    )

    if (!countryCodes) {
      return []
    }

    const promises = countryCodes.map(async (country) => {
      const { response } = await listProducts({
        countryCode: country,
        queryParams: { limit: 100, fields: "handle" },
      })

      return {
        country,
        products: response.products,
      }
    })

    const countryProducts = await Promise.all(promises)

    return countryProducts
      .flatMap((countryData) =>
        countryData.products.map((product) => ({
          countryCode: countryData.country,
          handle: product.handle,
        }))
      )
      .filter((param) => param.handle)
  } catch (error) {
    const { code, status } = inspectError(error)
    console.error(
      `[SSG Error] Failed to generate static paths for product pages (code=${code} status=${status ?? "none"}). Infrastructure error!`
    )
    if (process.env.STRICT_STATIC_BUILD === "true") {
      throw error
    }
    return []
  }
}

function getImagesForVariant(
  product: HttpTypes.StoreProduct,
  selectedVariantId?: string
) {
  if (!selectedVariantId || !product.variants) {
    return product.images
  }

  const variant = product.variants!.find((v) => v.id === selectedVariantId)
  if (!variant || !variant.images?.length) {
    return product.images
  }

  const imageIdsMap = new Map(variant.images!.map((i) => [i.id, true]))
  return product.images?.filter((i) => imageIdsMap.has(i.id)) ?? null
}

/**
 * Build the page description from real fields only: subtitle, then the first
 * sentence of the description. The fallback is the store description, never a
 * generated sentence like "Buy X online" built from the title.
 */
function buildDescription(product: HttpTypes.StoreProduct): string {
  if (product.subtitle?.trim()) {
    return product.subtitle.trim()
  }

  const firstSentence = product.description
    ?.trim()
    .split(/(?<=[.!?])\s/)[0]
    ?.trim()

  if (firstSentence) {
    return firstSentence
  }

  return siteConfig.description
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const { handle, countryCode } = params
  const region = await getRegion(countryCode)

  if (!region) {
    notFound()
  }

  const product = await listProducts({
    countryCode,
    queryParams: { handle },
  }).then(({ response }) => response.products[0])

  if (!product) {
    notFound()
  }

  const description = buildDescription(product)
  const title = `${product.title} | ${siteConfig.name}`

  return {
    title: product.title,
    description,
    alternates: {
      // One canonical per product: the `?v_id=` variant parameter selects an
      // image set, it does not make a different product page. The country code is
      // part of the path, so it belongs in the canonical — omitting it would point
      // search engines at a URL that does not resolve.
      canonical: `/${countryCode}/products/${handle}`,
    },
    openGraph: {
      title,
      description,
      images: product.thumbnail ? [product.thumbnail] : [],
      type: "website",
      locale: siteConfig.locale,
    },
  }
}

export default async function ProductPage(props: Props) {
  const params = await props.params
  const region = await getRegion(params.countryCode)
  const searchParams = await props.searchParams

  const selectedVariantId = searchParams.v_id

  if (!region) {
    notFound()
  }

  const pricedProduct = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle: params.handle },
  }).then(({ response }) => response.products[0])

  if (!pricedProduct) {
    notFound()
  }

  const images = getImagesForVariant(pricedProduct, selectedVariantId)

  return (
    <ProductTemplate
      product={pricedProduct}
      region={region}
      countryCode={params.countryCode}
      images={images ?? []}
    />
  )
}