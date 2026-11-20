"use client"

import { Heart } from "@medusajs/icons"
import { MouseEvent, useEffect, useSyncExternalStore } from "react"

import { t } from "@lib/i18n/translations"
import {
  getWishlistServerSnapshot,
  getWishlistSnapshot,
  hydrateWishlist,
  subscribeWishlist,
  toggleWishlist,
} from "@lib/wishlist"
import { clx } from "@modules/common/components/ui"

export default function WishlistButton({
  handle,
  title,
  className,
}: {
  handle: string
  title: string
  className?: string
}) {
  const handles = useSyncExternalStore(
    subscribeWishlist,
    getWishlistSnapshot,
    getWishlistServerSnapshot
  )

  useEffect(() => {
    hydrateWishlist()
  }, [])

  const saved = handles.includes(handle)

  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    toggleWishlist(handle)
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={
        saved
          ? t("wishlist.remove", { title })
          : t("wishlist.add", { title })
      }
      data-testid="wishlist-button"
      className={clx(
        "inline-flex h-8 w-8 items-center justify-center rounded-full text-[#0E352E] transition-colors hover:text-[#F36F21]",
        saved && "text-red-500",
        className
      )}
    >
      <Heart
        className="h-5 w-5"
        {...(saved ? { fill: "currentColor" } : {})}
      />
    </button>
  )
}
