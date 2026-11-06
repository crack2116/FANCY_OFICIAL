"use client"

import Image from "next/image"
import { useState } from "react"

import { t } from "@lib/i18n/translations"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"
import PlaceholderImage from "@modules/common/icons/placeholder-image"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
  productTitle: string
}

/**
 * Product gallery.
 *
 * One large image plus a thumbnail strip, which is how a shopper expects to
 * inspect a product. The previous version stacked every image vertically: with
 * four images the buy box was pushed several screens down, and the shopper had to
 * scroll back up to add anything to the cart.
 *
 * The thumbnails are real buttons with `aria-pressed`, not clickable images, so
 * the selected image is exposed to assistive technology and the whole gallery is
 * keyboard-operable. Images without a URL are dropped before rendering; the
 * placeholder is only shown when there is genuinely nothing to show.
 */
const ImageGallery = ({ images, productTitle }: ImageGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(0)

  const usable = images.filter(
    (image): image is HttpTypes.StoreProductImage & { url: string } =>
      Boolean(image.url)
  )

  if (!usable.length) {
    return (
      <div className="flex aspect-[4/5] w-full items-center justify-center rounded-[1.5rem] border border-[#eadfce] bg-white text-fg-muted shadow-[var(--shadow-card)]">
        <PlaceholderImage size={48} />
      </div>
    )
  }

  const current = usable[activeIndex] ?? usable[0]

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.5rem] border border-[#eadfce] bg-white shadow-[var(--shadow-card)]">
        <Image
          src={current.url}
          alt={t("product.galleryImageAlt", {
            number: activeIndex + 1,
            title: productTitle,
          })}
          fill
          priority
          sizes="(min-width: 1280px) 640px, (min-width: 1024px) 52vw, 100vw"
          className="object-cover"
        />
      </div>

      {usable.length > 1 ? (
        <ul className="grid grid-cols-4 gap-3">
          {usable.map((image, index) => {
            const isActive = index === activeIndex

            return (
              <li key={image.id}>
                <button
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={t("product.galleryThumbnail", {
                    number: index + 1,
                    title: productTitle,
                  })}
                  aria-pressed={isActive}
                  className={clx(
                    "relative block aspect-square w-full overflow-hidden rounded-xl border-2 bg-white transition-all",
                    isActive
                      ? "border-brand-500 ring-2 ring-brand-200"
                      : "border-transparent opacity-65 hover:opacity-100"
                  )}
                >
                  <Image
                    src={image.url}
                    alt=""
                    fill
                    sizes="140px"
                    className="object-cover"
                  />
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

export default ImageGallery
