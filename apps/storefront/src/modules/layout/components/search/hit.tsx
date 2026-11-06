"use client"

import Image from "next/image"
import type { Hit as HitType } from "instantsearch.js"

import { t } from "@lib/i18n/translations"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import PlaceholderImage from "@modules/common/icons/placeholder-image"
import { Text } from "@modules/common/components/ui"

export type ProductHit = HitType<{
  title: string | null
  handle: string | null
  thumbnail: string | null
}>

type SearchHitProps = {
  hit: ProductHit
  onNavigate?: () => void
}

/**
 * One row of the typeahead suggestion list.
 *
 * Deliberately NOT the full `ProductPreview` card: this is a combobox popup
 * inside a 420px drawer, where a vertical card with a badge and a price is
 * unusable at eight rows. The rows are real indexed products with a real
 * thumbnail and a real title — nothing is suggested that does not exist. The
 * results GRID on `/store` uses `ProductPreview`.
 */
const SearchHit = ({ hit, onNavigate }: SearchHitProps) => {
  if (!hit.handle) {
    return null
  }

  return (
    <li>
      <LocalizedClientLink
        href={`/products/${hit.handle}`}
        onClick={onNavigate}
        className="flex items-center gap-x-4 px-4 py-3 transition-colors hover:bg-surface-subtle"
        data-testid="search-hit-link"
      >
        <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-rounded bg-surface-subtle">
          {hit.thumbnail ? (
            <Image
              src={hit.thumbnail}
              alt=""
              fill
              sizes="56px"
              className="object-cover object-center"
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-fg-muted">
              <PlaceholderImage size={20} />
            </div>
          )}
        </div>
        <Text className="txt-medium line-clamp-2 text-fg-base">
          {hit.title ?? t("nav.store")}
        </Text>
      </LocalizedClientLink>
    </li>
  )
}

export default SearchHit