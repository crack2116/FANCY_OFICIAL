/**
 * Pure helpers that turn the home configuration into renderable descriptors.
 *
 * These functions are the guard rail between `home-config.ts` and the UI: a
 * config entry only survives if the backend really has the category or
 * collection it points at. Nothing here fetches, so it is safe to call from a
 * server component, a client component or a test.
 */

import {
  homeCategoryCards,
  homeRails,
  heroSlides,
  secondaryBanners,
  type HomeCategoryCard,
  type HomeHeroSlide,
  type HomeRail,
  type HomeSecondaryBanner,
} from "@lib/home-config"
import type { TranslationKey } from "@lib/i18n/translations"
import type { HttpTypes } from "@medusajs/types"

/** A category card that has been matched against a real category. */
export type ResolvedCategoryCard = {
  id: string
  handle: string
  /** Real name from the API. Never taken from the config. */
  name: string
  href: string
  image: string
  imageAltKey: TranslationKey
  ctaKey: TranslationKey
}

/** A rail that has been matched against a real collection. */
export type ResolvedRail = {
  id: string
  /** Position on the shared rails-and-banners ordering scale. */
  order: number
  titleKey: TranslationKey
  subtitleKey: TranslationKey
  viewAllKey: TranslationKey
  collection: HttpTypes.StoreCollection
  href: string
}

/** Sections that are switched on, in merchandising order. */
const activeAndOrdered = <T extends { active: boolean; order: number }>(
  entries: T[]
): T[] =>
  entries.filter((entry) => entry.active).sort((a, b) => a.order - b.order)

/**
 * Hero slides to render. Filtering by `active` here — instead of hiding slides
 * with CSS — means a disabled slide never reaches the DOM, so it cannot be
 * reached by Tab or read by a screen reader.
 *
 * `artwork` is passed IN rather than fetched here, for the same reason
 * `resolveCategoryCards` takes it: this module is the guard rail between
 * `home-config.ts` and the UI and it fetches nothing.
 *
 * ONE UPLOAD PER SLIDE, NOT ONE PER VIEWPORT
 * A slide config carries both `imageDesktop` and `imageMobile`, and the carousel
 * picks between them with `<picture>`. A single uploaded URL replaces BOTH: the
 * hero renders inside a fixed `4/3` to `3/2` box with `object-cover`, so one
 * image already covers both viewports by cropping. Keeping the configured pair
 * as the fallback means a slide with no upload keeps its art direction, which is
 * what the config is for.
 */
export const getActiveSlides = (
  slides: HomeHeroSlide[] = heroSlides,
  artwork: Record<string, string> = {}
): HomeHeroSlide[] =>
  activeAndOrdered(slides).map((slide) => {
    // Read by slide id, so an admin entry for a slide that no longer exists is
    // simply never looked at — inert rather than broken.
    const uploaded = artwork[slide.id]

    return uploaded
      ? { ...slide, imageDesktop: uploaded, imageMobile: uploaded }
      : slide
  })

export const getActiveBanners = (
  banners: HomeSecondaryBanner[] = secondaryBanners
): HomeSecondaryBanner[] => activeAndOrdered(banners)

/**
 * Match category cards to the categories the API returned. A card whose handle
 * does not exist is dropped rather than rendered as a dead link.
 *
 * `artwork` is passed IN rather than fetched here. This module is the guard rail
 * between `home-config.ts` and the UI and it fetches nothing, so it stays pure
 * and unit-testable; the server component that renders the page reads branding
 * and hands the map over.
 */
export const resolveCategoryCards = (
  cards: HomeCategoryCard[] = homeCategoryCards,
  categories: HttpTypes.StoreProductCategory[] = [],
  artwork: Record<string, string> = {}
): ResolvedCategoryCard[] =>
  activeAndOrdered(cards).flatMap((card) => {
    const category = categories.find((item) => item.handle === card.handle)

    if (!category) {
      return []
    }

    return [
      {
        id: card.id,
        handle: category.handle,
        name: category.name,
        href: `/categories/${category.handle}`,
        // Medusa v2's `product_category` has NO image field at all — the store
        // API does not return one, so there is nothing on the category row for
        // an admin upload to write into. Artwork therefore comes from two
        // sources, in order: what the operator uploaded for this handle, and
        // the shipped demo SVG in `homeCategoryCards`. The fallback is the
        // normal state, not a blank one: an empty map renders the demo art.
        image: artwork[category.handle] ?? card.image,
        imageAltKey: card.imageAltKey,
        ctaKey: card.ctaKey,
      },
    ]
  })

/**
 * Match rails to the collections the API returned. The "ver todo" href is built
 * from the resolved collection handle, so it cannot drift away from a page that
 * actually exists.
 */
export const resolveRails = (
  rails: HomeRail[] = homeRails,
  collections: HttpTypes.StoreCollection[] = []
): ResolvedRail[] =>
  activeAndOrdered(rails).flatMap((rail) => {
    const collection = collections.find(
      (item) => item.handle === rail.collectionHandle
    )

    if (!collection?.handle) {
      return []
    }

    return [
      {
        id: rail.id,
        order: rail.order,
        titleKey: rail.titleKey,
        subtitleKey: rail.subtitleKey,
        viewAllKey: rail.viewAllKey,
        collection,
        href: `/collections/${collection.handle}`,
      },
    ]
  })

export const categoryHasProducts = (
  category: HttpTypes.StoreProductCategory | null | undefined
): boolean => (category?.products?.length ?? 0) > 0

export const categoryHasChildren = (
  category: HttpTypes.StoreProductCategory | null | undefined
): boolean => (category?.category_children?.length ?? 0) > 0

export const collectionHasProducts = (
  collection: HttpTypes.StoreCollection | null | undefined
): boolean => (collection?.products?.length ?? 0) > 0
