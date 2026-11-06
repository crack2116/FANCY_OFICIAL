import { MetadataRoute } from "next"
import { listProducts } from "@lib/data/products"
import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { getBaseURL } from "@lib/util/env"
import { siteConfig } from "@lib/site-config"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseURL()
  const countryCode = siteConfig.defaultCountryCode

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/${countryCode}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/${countryCode}/store`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ]

  try {
    const [productsRes, categoriesRes, collectionsRes] = await Promise.allSettled([
      listProducts({ countryCode, queryParams: { limit: 100 } }),
      listCategories(),
      listCollections(),
    ])

    const productEntries: MetadataRoute.Sitemap =
      productsRes.status === "fulfilled" && productsRes.value?.response?.products
        ? productsRes.value.response.products
            .filter((p) => Boolean(p.handle))
            .map((p) => ({
              url: `${baseUrl}/${countryCode}/products/${p.handle}`,
              lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
              changeFrequency: "weekly" as const,
              priority: 0.8,
            }))
        : []

    const categoryEntries: MetadataRoute.Sitemap =
      categoriesRes.status === "fulfilled" && Array.isArray(categoriesRes.value)
        ? categoriesRes.value
            .filter((c) => Boolean(c.handle))
            .map((c) => ({
              url: `${baseUrl}/${countryCode}/categories/${c.handle}`,
              lastModified: new Date(),
              changeFrequency: "weekly" as const,
              priority: 0.7,
            }))
        : []

    const collectionEntries: MetadataRoute.Sitemap =
      collectionsRes.status === "fulfilled" && Array.isArray(collectionsRes.value?.collections)
        ? collectionsRes.value.collections
            .filter((c) => Boolean(c.handle))
            .map((c) => ({
              url: `${baseUrl}/${countryCode}/collections/${c.handle}`,
              lastModified: new Date(),
              changeFrequency: "weekly" as const,
              priority: 0.7,
            }))
        : []

    return [...staticRoutes, ...categoryEntries, ...collectionEntries, ...productEntries]
  } catch (err) {
    console.error("[Sitemap] Error generating dynamic sitemap:", err)
    return staticRoutes
  }
}
