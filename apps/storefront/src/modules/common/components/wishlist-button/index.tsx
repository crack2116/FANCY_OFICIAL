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

/**
 * The wishlist heart.
 *
 * ONE STORE, MANY HEARTS. Every card subscribes to the same module store in
 * `@lib/wishlist`, so tapping the heart on a product that is on screen three
 * times updates all three. Reading `localStorage` per button would give three
 * answers that disagree with each other and with the storage, which is exactly
 * the bug this component exists to not have.
 *
 * The card is a single link to the product, so the heart is mounted as a
 * SIBLING of that link in `ProductPreview` rather than inside it: a button
 * nested in an anchor is invalid HTML, and the click would navigate away before
 * the toggle ran.
 *
 * NO HYDRATION MISMATCH. The server has no storage, so the first client render
 * reads the shared empty default and the real list arrives from an effect.
 */
export default function WishlistButton({
  handle,
  title,
  className,
}: {
  /** Product handle, which is also what the store persists. */
  handle: string
  /** Product name, so the button is announced as an action on THIS product. */
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

  /*
   * The heart is not inside the link, so its own click never reaches the
   * anchor. Propagation is stopped anyway because a card-level click handler or
   * an analytics listener would otherwise read the tap as "open the product".
   */
  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    toggleWishlist(handle)
  }

  /*
   * A white plate with a soft edge, because the heart sits over whatever the
   * product photo happens to be: an outline-only heart disappears against a
   * white background shot and vanishes against a dark one.
   */
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
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white/90 text-fg-muted shadow-sm outline-none backdrop-blur transition-colors hover:bg-white hover:text-accent-600 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
        saved && "border-accent-100 bg-white text-accent-600",
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
