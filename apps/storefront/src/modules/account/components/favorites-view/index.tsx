"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { HttpTypes } from "@medusajs/types"
import { listProductsByHandles } from "@lib/data/products"
import { t } from "@lib/i18n/translations"
import {
  getWishlistServerSnapshot,
  getWishlistSnapshot,
  hydrateWishlist,
  subscribeWishlist,
} from "@lib/wishlist"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Heart from "@modules/common/icons/heart"
import ProductPreview from "@modules/products/components/product-preview"

type Props = {
  countryCode: string
  region: HttpTypes.StoreRegion
}

export default function FavoritesView({ countryCode, region }: Props) {
  const handles = useSyncExternalStore(
    subscribeWishlist,
    getWishlistSnapshot,
    getWishlistServerSnapshot
  )
  const [products, setProducts] = useState<HttpTypes.StoreProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    hydrateWishlist()
    setReady(true)
  }, [])

  const handlesKey = handles.join("|")

  useEffect(() => {
    if (!ready) {
      return
    }

    if (!handles.length) {
      setProducts([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    listProductsByHandles({
      handles: [...handles],
      countryCode,
      regionId: region.id,
    })
      .then((result) => {
        if (!cancelled) {
          setProducts(result)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [ready, handlesKey, countryCode, region.id, handles])

  if (!ready || (loading && products.length === 0)) {
    return (
      <div
        className="grid grid-cols-1 xsmall:grid-cols-2 medium:grid-cols-3 gap-5"
        data-testid="favorites-loading"
      >
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-80 rounded-[1.75rem] border border-slate-100 bg-white p-5 animate-pulse"
          >
            <div className="h-6 w-20 rounded-full bg-slate-100" />
            <div className="my-4 h-40 w-full rounded-2xl bg-slate-100" />
            <div className="h-4 w-3/4 rounded bg-slate-100" />
            <div className="mt-2 h-4 w-1/2 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    )
  }

  if (!handles.length || products.length === 0) {
    return (
      <div
        className="rounded-3xl border border-slate-200/80 bg-white p-8 sm:p-12 text-center shadow-[0_10px_30px_rgba(15,53,46,0.04)] flex flex-col items-center gap-4"
        data-testid="favorites-empty"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF3E8] text-[#F36F21]">
          <Heart size="26" />
        </div>
        <div className="max-w-md space-y-1.5">
          <h2 className="text-lg font-bold text-[#0F352E]">
            {t("account.favorites.empty.title")}
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {t("account.favorites.empty.body")}
          </p>
        </div>
        <LocalizedClientLink
          href="/store"
          className="mt-2 inline-flex items-center justify-center rounded-full bg-[#F36F21] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#E05E10]"
          data-testid="favorites-explore-cta"
        >
          {t("account.favorites.empty.cta")}
        </LocalizedClientLink>
      </div>
    )
  }

  return (
    <div
      className="grid grid-cols-1 xsmall:grid-cols-2 medium:grid-cols-3 gap-5"
      data-testid="favorites-grid"
    >
      {products.map((product) => (
        <ProductPreview key={product.id} product={product} region={region} />
      ))}
    </div>
  )
}
