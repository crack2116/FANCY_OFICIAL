import { Container, clx } from "@modules/common/components/ui"
import Image from "next/image"
import React from "react"

import { t } from "@lib/i18n/translations"
import PlaceholderImage from "@modules/common/icons/placeholder-image"

type ThumbnailProps = {
  thumbnail?: string | null
  images?: { url?: string }[] | null
  size?: "small" | "medium" | "large" | "full" | "square"
  isFeatured?: boolean
  className?: string
  alt?: string
  "data-testid"?: string
}

export function sanitizeProductImageUrl(url?: string | null): string | undefined {
  if (!url) {
    return undefined
  }
  if (
    url.includes("localhost:9000/static/") ||
    url.includes("medusa-public-images.s3") ||
    url.includes("/demo/alimento") ||
    url.includes("/demo/snack")
  ) {
    return "/products/pedigree-adulto-1-5kg.png"
  }
  if (url.includes("/demo/accesorio")) {
    return "/products/cama-gatos-rosada.png"
  }
  if (url.includes("/demo/higiene")) {
    return "/categories/cat-higiene.png"
  }
  if (url.includes("/demo/salud")) {
    return "/categories/cat-salud.png"
  }
  if (url.includes("/demo/juguete")) {
    return "/categories/cat-juguetes.png"
  }
  return url
}

const Thumbnail: React.FC<ThumbnailProps> = ({
  thumbnail,
  images,
  size = "small",
  isFeatured,
  className,
  alt,
  "data-testid": dataTestid,
}) => {
  const initialImage = sanitizeProductImageUrl(thumbnail || images?.[0]?.url)

  return (
    <Container
      className={clx(
        "relative w-full overflow-hidden bg-white",
        className,
        {
          "aspect-[11/14]": isFeatured && size !== "square",
          "aspect-[9/16]": !isFeatured && size !== "square",
          "aspect-[1/1]": size === "square",
          "w-[180px]": size === "small",
          "w-[290px]": size === "medium",
          "w-[440px]": size === "large",
          "w-full": size === "full" || size === "square",
        }
      )}
      data-testid={dataTestid}
    >
      <ImageOrPlaceholder image={initialImage} size={size} alt={alt} />
    </Container>
  )
}

const ImageOrPlaceholder = ({
  image,
  size,
  alt,
}: Pick<ThumbnailProps, "size" | "alt"> & { image?: string }) => {
  if (!image) {
    return (
      <div className="absolute inset-0 flex h-full w-full items-center justify-center">
        <PlaceholderImage size={size === "small" ? 16 : 24} />
      </div>
    )
  }

  if (image.startsWith("/")) {
    return (
      <img
        src={image}
        alt={alt ?? t("product.imageAlt")}
        className={clx(
          "absolute inset-0 h-full w-full object-center",
          size === "square" ? "object-contain" : "object-cover"
        )}
        draggable={false}
      />
    )
  }

  return (
    <Image
      src={image}
      alt={alt ?? t("product.imageAlt")}
      className={clx(
        "absolute inset-0 object-center",
        size === "square" ? "object-contain p-1" : "object-cover"
      )}
      draggable={false}
      quality={80}
      sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
      fill
    />
  )
}

export default Thumbnail
