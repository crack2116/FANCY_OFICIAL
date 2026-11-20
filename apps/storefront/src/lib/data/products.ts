"use server"

import { sdk } from "@lib/config"
import { CACHE_POLICY } from "@lib/catalogue/cache-policy"
import { PET_PRODUCT_FIELDS } from "@lib/pet-product"
import { isProductPurchasable } from "@lib/util/stock"
import { HttpTypes } from "@medusajs/types"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { getRegion, retrieveRegion } from "./regions"

type ProductListQueryParams = (HttpTypes.FindParams &
  HttpTypes.StoreProductListParams) & {
  options?: string[]
  option_value_id?: string | string[]
}

/**
 * The product fields every grid card needs.
 *
 * `+variants.inventory_quantity` is what makes the stock badge and the
 * availability filter truthful, and `+variants.calculated_price` is what makes
 * the card price match the price list the region actually applies.
 *
 * `PET_PRODUCT_FIELDS` is in this SAME field string on purpose. Brand and pet
 * profile reach a card, a brand page and a product detail section, and the
 * module links resolve them in the same batched graph read as the products
 * themselves — one read for the products, one read per linked service for the
 * whole batch. Asking for them in a second request, or per product, is exactly
 * the N+1 this field list exists to avoid.
 */
const CARD_FIELDS =
  "*variants.calculated_price,+variants.inventory_quantity,*variants.images,*variants.options,*categories,+metadata,+tags," +
  PET_PRODUCT_FIELDS

export const listProducts = async ({
  pageParam = 1,
  queryParams,
  countryCode,
  regionId,
}: {
  pageParam?: number
  queryParams?: ProductListQueryParams
  countryCode?: string
  regionId?: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: ProductListQueryParams
}> => {
  if (!countryCode && !regionId) {
    throw new Error("Country code or region ID is required")
  }

  const limit = queryParams?.limit || 12
  const _pageParam = Math.max(pageParam, 1)
  const offset = _pageParam === 1 ? 0 : (_pageParam - 1) * limit

  let region: HttpTypes.StoreRegion | undefined | null

  if (countryCode) {
    region = await getRegion(countryCode)
  } else {
    region = await retrieveRegion(regionId!)
  }

  if (!region) {
    return {
      response: { products: [], count: 0 },
      nextPage: null,
    }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("products")),
  }

  return sdk.client
    .fetch<{ products: HttpTypes.StoreProduct[]; count: number }>(
      `/store/products`,
      {
        method: "GET",
        query: {
          limit,
          offset,
          region_id: region?.id,
          fields: CARD_FIELDS,
          ...queryParams,
        },
        headers,
        next,
        cache: "force-cache",
      }
    )
    .then(({ products, count }) => {
      const nextPage = count > offset + limit ? pageParam + 1 : null

      return {
        response: {
          products,
          count,
        },
        nextPage: nextPage,
        queryParams,
      }
    })
}

type ProductPage = {
  products: HttpTypes.StoreProduct[]
  count: number
}

/**
 * Hydrate a page of search hits into real products, in the engine's order.
 *
 * The index stores a document per product, not a Store API product: it has a
 * title, a handle and a thumbnail but no variants, so it cannot price a card or
 * decide whether anything is in stock. Rather than inventing a second, poorer
 * card component, the hits are looked up here and rendered with the same
 * `ProductPreview` every other grid uses.
 *
 * NOT cached (`no-store`). This data is only ever reached through filters, sort
 * and page, so freezing it as eternal static content is exactly the failure the
 * cache policy warns about.
 */
export const listProductsByIds = async ({
  ids,
  countryCode,
  regionId,
}: {
  ids: string[]
  countryCode?: string
  regionId?: string
}): Promise<HttpTypes.StoreProduct[]> => {
  if (!ids.length) {
    return []
  }

  const region = countryCode
    ? await getRegion(countryCode)
    : await retrieveRegion(regionId!)

  if (!region) {
    return []
  }

  const { products } = await sdk.client.fetch<ProductPage>("/store/products", {
    method: "GET",
    query: {
      id: ids,
      limit: ids.length,
      region_id: region.id,
      fields: CARD_FIELDS,
    },
    headers: await getAuthHeaders(),
    cache: CACHE_POLICY.searchResults,
  })

  // The API returns products in its own order. Put them back the way the search
  // engine ranked them, otherwise the shopper sees the right products in the
  // wrong order.
  const byId = new Map(products.map((product) => [product.id, product]))

  return ids.flatMap((id) => {
    const product = byId.get(id)

    return product ? [product] : []
  })
}

export const listProductsByHandles = async ({
  handles,
  countryCode,
  regionId,
}: {
  handles: string[]
  countryCode?: string
  regionId?: string
}): Promise<HttpTypes.StoreProduct[]> => {
  const uniqueHandles = Array.from(new Set(handles.filter(Boolean)))
  if (!uniqueHandles.length) {
    return []
  }

  const region = countryCode
    ? await getRegion(countryCode)
    : await retrieveRegion(regionId!)

  if (!region) {
    return []
  }

  const { products } = await sdk.client.fetch<ProductPage>("/store/products", {
    method: "GET",
    query: {
      handle: uniqueHandles,
      limit: uniqueHandles.length,
      region_id: region.id,
      fields: CARD_FIELDS,
    },
    headers: await getAuthHeaders(),
    cache: CACHE_POLICY.searchResults,
  })

  const byHandle = new Map(products.map((product) => [product.handle, product]))

  return uniqueHandles.flatMap((handle) => {
    const product = byHandle.get(handle)

    return product ? [product] : []
  })
}

/** Page size for the availability scan. One request per 500 products. */
const STOCK_SCAN_PAGE_SIZE = 500

/**
 * The ids of every product that can actually be bought right now.
 *
 * Only read when the availability filter is on. The product index carries no
 * inventory field at all, so this cannot be a facet; it is a real Store API read
 * of `inventory_quantity` / `manage_inventory` / `allow_backorder`, pushed into
 * the search query as an `id IN (...)` filter so the ordering, the exact count
 * and the paging all stay inside the engine.
 *
 * The scan walks the whole catalogue in pages, so the result is exact for any
 * catalogue size rather than "whatever fitted in the first request".
 */
export const listPurchasableProductIds = async ({
  countryCode,
  regionId,
}: {
  countryCode?: string
  regionId?: string
}): Promise<string[]> => {
  const region = countryCode
    ? await getRegion(countryCode)
    : await retrieveRegion(regionId!)

  if (!region) {
    return []
  }

  const headers = await getAuthHeaders()
  const purchasable: string[] = []
  let offset = 0
  let total = 1

  while (offset < total) {
    const page = await sdk.client.fetch<ProductPage>("/store/products", {
      method: "GET",
      query: {
        limit: STOCK_SCAN_PAGE_SIZE,
        offset,
        region_id: region.id,
        fields: CARD_FIELDS,
      },
      headers,
      cache: CACHE_POLICY.searchResults,
    })

    const products = page?.products ?? []

    if (!products.length) {
      break
    }

    products
      .filter(isProductPurchasable)
      .forEach((product) => purchasable.push(product.id))

    offset += products.length
    total = page.count ?? offset

    if (products.length < STOCK_SCAN_PAGE_SIZE) {
      break
    }
  }

  return purchasable
}
