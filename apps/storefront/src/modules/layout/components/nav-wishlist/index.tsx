"use client"

import { useEffect, useSyncExternalStore } from "react"
import { t } from "@lib/i18n/translations"
import Heart from "@modules/common/icons/heart"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import {
  getWishlistServerSnapshot,
  getWishlistSnapshot,
  hydrateWishlist,
  subscribeWishlist,
} from "@lib/wishlist"

export default function NavWishlist() {
  const handles = useSyncExternalStore(
    subscribeWishlist,
    getWishlistSnapshot,
    getWishlistServerSnapshot
  )

  useEffect(() => {
    hydrateWishlist()
  }, [])

  const count = handles.length

  return (
    <LocalizedClientLink
      href="/account"
      className="relative flex h-10 items-center gap-2 rounded-full px-2.5 text-sm text-[var(--chrome-header-ink)] transition-colors hover:bg-[var(--chrome-header-hover)]"
      aria-label={
        count > 0
          ? t("nav.wishlistWithCount", { count })
          : t("nav.wishlist")
      }
      data-testid="nav-wishlist-link"
    >
      <div className="relative flex items-center justify-center">
        <Heart size="20" />
        {count > 0 ? (
          <span
            data-testid="wishlist-count-badge"
            className="absolute -right-2 -top-1.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-brand-700 px-1 text-[10px] font-bold leading-none text-white"
          >
            {count}
          </span>
        ) : null}
      </div>
      <span className="hidden medium:inline font-medium">
        {t("nav.wishlist")}
      </span>
    </LocalizedClientLink>
  )
}
