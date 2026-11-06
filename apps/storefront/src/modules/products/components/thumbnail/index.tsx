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
  /**
   * Alternative text for the image. Callers that know the product should pass a
   * specific description; the default is a generic Spanish noun rather than a
   * hardcoded English word, because a screen reader reads this out loud.
   */
  alt?: string
  "data-testid"?: string
}

const Thumbnail: React.FC<ThumbnailProps> = ({
  thumbnail,
  images,
  size = "small",
  className,
  alt,
  "data-testid": dataTestid,
}) => {
  const initialImage = thumbnail || images?.[0]?.url

  /* The image sits directly on the card's white plate. The previous grey fill
   (`bg-ui-bg-subtle`) was fine when the card had no surface of its own; inside a
   white card it reads as a grey band under the product photo, which the live
   store never shows. */
  return (
    <Container
      className={clx(
        "relative w-full overflow-hidden bg-[var(--surface-subtle)]",
        className,
        {
          /*
           * One ratio for every card size. Featured cards used to be 11/14 and
           * listing cards 9/16, which made the same product change shape between
           * the home rail and the catalogue. 4/5 is tall enough to feel editorial
           * without turning a four-column grid into a wall of empty image.
           */
          "aspect-[4/5]": size !== "square",
          "aspect-[1/1]": size === "square",
          "w-[180px]": size === "small",
          "w-[290px]": size === "medium",
          "w-[440px]": size === "large",
          "w-full": size === "full",
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
  return image ? (
    <Image
      src={image}
      alt={alt ?? t("product.imageAlt")}
      className="absolute inset-0 object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.035]"
      draggable={false}
      quality={50}
      sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
      fill
    />
  ) : (
    <div className="w-full h-full absolute inset-0 flex items-center justify-center">
      <PlaceholderImage size={size === "small" ? 16 : 24} />
    </div>
  )
}

export default Thumbnail
