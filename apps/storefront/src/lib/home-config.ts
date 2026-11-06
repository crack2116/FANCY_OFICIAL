/**
 * Home merchandising configuration — Phase 3.
 *
 * This module is the single place where home PAGE LAYOUT is decided. It holds
 * no fetched data: every handle here must match something that really exists in
 * the backend, and the resolution helpers in `@lib/util/home-*` silently drop
 * entries that do not. Adding, removing or reordering a section therefore never
 * requires a JSX change, and nothing in this file can put a broken link on the
 * page.
 *
 * Copy is stored as translation KEYS, never as literal Spanish, so every visible
 * string keeps going through `t()` and `src/lib/i18n/translations.ts` stays the
 * only dictionary. That is why the fields are named `titleKey` and friends.
 *
 * Deliberately absent, because the data model does not have them yet: brand,
 * ratings, review counts, discounts, shipping-cost or delivery-time policies,
 * and any prescription or medical concept.
 */

import type { TranslationKey } from "@lib/i18n/translations"

/** Local demo artwork. The SVGs live in `public/demo` and are also valid in Admin. */
const ART = {
  juguete: "/demo/juguete.svg",
  alimento: "/demo/alimento.svg",
  salud: "/demo/salud.svg",
  higiene: "/demo/higiene.svg",
  accesorio: "/demo/accesorio.svg",
  farmacia: "/demo/farmacia.svg",
} as const

/**
 * Hero artwork, drawn in-house for this storefront.
 *
 * These are original vector compositions, not stock photography: no licence to
 * track, no hotlinked CDN, and crisp at every density. Each scene ships with a
 * wider desktop crop and a tighter mobile crop so the pets stay legible in the
 * narrow hero instead of shrinking into a corner.
 */
const HERO_ART = {
  duoDesktop: "/hero/pets-duo-desktop.svg",
  duoMobile: "/hero/pets-duo-mobile.svg",
  careDesktop: "/hero/pets-care-desktop.svg",
  careMobile: "/hero/pets-care-mobile.svg",
} as const

/**
 * One hero slide.
 *
 * `imageMobile` is optional art direction for narrow viewports; when it is
 * absent the desktop artwork is used everywhere. Both are rendered inside a
 * fixed aspect-ratio box, so swapping them never shifts layout.
 */
export type HomeHeroSlide = {
  id: string
  eyebrowKey: TranslationKey | null
  titleKey: TranslationKey
  subtitleKey: TranslationKey
  ctaKey: TranslationKey
  ctaHref: string
  /**
   * Optional secondary CTA. Defaults to the categories anchor, which is right
   * for the first slide. Other slides override it so no two hero buttons share
   * both the same label and the same destination.
   */
  secondaryCtaKey?: TranslationKey
  secondaryCtaHref?: string
  imageAltKey: TranslationKey
  imageDesktop: string
  imageMobile: string | null
  /** Inactive slides are filtered out before rendering, not hidden with CSS. */
  active: boolean
  order: number
}

export const heroSlides: HomeHeroSlide[] = [
  {
    id: "cuidado-diario",
    eyebrowKey: "home.hero.eyebrow.store",
    titleKey: "home.hero.slide1.title",
    subtitleKey: "home.hero.slide1.subtitle",
    ctaKey: "home.hero.slide1.cta",
    ctaHref: "/store",
    imageAltKey: "home.hero.slide1.alt",
    imageDesktop: HERO_ART.duoDesktop,
    imageMobile: HERO_ART.duoMobile,
    active: true,
    order: 10,
  },
  {
    id: "bienestar-diario",
    eyebrowKey: "home.hero.eyebrow.care",
    titleKey: "home.hero.slide2.title",
    subtitleKey: "home.hero.slide2.subtitle",
    ctaKey: "home.hero.slide2.cta",
    /*
     * Direct route into the food category, so its label says exactly where it
     * goes. The handle is seeded and the category page exists.
     */
    ctaHref: "/categories/alimentos",
    /*
     * Distinct from the first slide's "Ver categorías" anchor: this one goes to
     * a real, existing category page, so the two hero CTAs never share text or
     * destination.
     */
    secondaryCtaKey: "home.hero.slide2.secondaryCta",
    secondaryCtaHref: "/categories/salud",
    imageAltKey: "home.hero.slide2.alt",
    imageDesktop: HERO_ART.careDesktop,
    imageMobile: HERO_ART.careMobile,
    active: true,
    order: 20,
  },
]

/**
 * One "compra por categoría" card.
 *
 * Only `handle` is real data; the visible name comes from the category the API
 * returns, never from here. `image` is decorative artwork and `imageAltKey`
 * describes it honestly.
 */
export type HomeCategoryCard = {
  id: string
  handle: string
  image: string
  imageAltKey: TranslationKey
  ctaKey: TranslationKey
  active: boolean
  order: number
}

export const homeCategoryCards: HomeCategoryCard[] = [
  {
    id: "alimentos",
    handle: "alimentos",
    image: ART.alimento,
    imageAltKey: "home.categories.imageAlt.alimentos",
    ctaKey: "home.categories.cta",
    active: true,
    order: 1,
  },
  {
    id: "salud",
    handle: "salud",
    image: ART.salud,
    imageAltKey: "home.categories.imageAlt.salud",
    ctaKey: "home.categories.cta",
    active: true,
    order: 20,
  },
  {
    id: "higiene",
    handle: "higiene",
    image: ART.higiene,
    imageAltKey: "home.categories.imageAlt.higiene",
    ctaKey: "home.categories.cta",
    active: true,
    order: 30,
  },
  {
    id: "accesorios",
    handle: "accesorios",
    image: ART.accesorio,
    imageAltKey: "home.categories.imageAlt.accesorios",
    ctaKey: "home.categories.cta",
    active: true,
    order: 40,
  },
  {
    id: "juguetes",
    handle: "juguetes",
    image: ART.juguete,
    imageAltKey: "home.categories.imageAlt.juguetes",
    ctaKey: "home.categories.cta",
    active: true,
    order: 50,
  },
  {
    id: "farmacia",
    handle: "farmacia",
    image: ART.farmacia,
    imageAltKey: "home.categories.imageAlt.farmacia",
    ctaKey: "home.categories.cta",
    active: true,
    order: 60,
  },
]

/**
 * The secondary commercial block.
 *
 * Rails and banners share ONE ordering scale: both carry an `order` and both are
 * merged into a single sorted list, so merchandising can insert, move or drop a
 * block by editing a number here instead of moving JSX around. Use steps of 10
 * so a new block can be slotted between two existing ones.
 */
export type HomeSecondaryBanner = {
  id: string
  eyebrowKey: TranslationKey | null
  titleKey: TranslationKey
  subtitleKey: TranslationKey
  ctaKey: TranslationKey
  ctaHref: string
  image: string
  imageAltKey: TranslationKey
  active: boolean
  order: number
}

export const secondaryBanners: HomeSecondaryBanner[] = [
  {
    id: "rutina-diaria",
    eyebrowKey: null,
    titleKey: "home.banner.title",
    subtitleKey: "home.banner.subtitle",
    ctaKey: "home.banner.cta",
    ctaHref: "/store",
    image: "/hero/care-kit.svg",
    imageAltKey: "home.banner.imageAlt",
    active: true,
    order: 20,
  },
]

/**
 * One product rail. It maps to a REAL Medusa collection: the rail disappears
 * if `collectionHandle` does not exist, so an unseeded collection can never
 * render a heading over an empty row.
 */
export type HomeRail = {
  id: string
  collectionHandle: string
  titleKey: TranslationKey
  subtitleKey: TranslationKey
  viewAllKey: TranslationKey
  active: boolean
  order: number
}

export const homeRails: HomeRail[] = [
  {
    id: "featured",
    collectionHandle: "destacados",
    titleKey: "home.rails.featured.title",
    subtitleKey: "home.rails.featured.subtitle",
    viewAllKey: "home.rails.viewAll",
    active: true,
    order: 10,
  },
  {
    id: "new",
    collectionHandle: "nuevos",
    titleKey: "home.rails.new.title",
    subtitleKey: "home.rails.new.subtitle",
    viewAllKey: "home.rails.viewAll",
    active: true,
    order: 30,
  },
  {
    id: "offers",
    collectionHandle: "ofertas",
    titleKey: "home.rails.offers.title",
    subtitleKey: "home.rails.offers.subtitle",
    viewAllKey: "home.rails.viewAll",
    active: true,
    order: 50,
  },
]

/**
 * Trust signals now live in `@lib/site-config` so the footer and the home page
 * share one array. Re-exported here for convenience.
 */
export { benefits } from "@lib/site-config"

/** Home SEO, derived from config rather than hardcoded in the page. */
export const homeSeo = {
  titleKey: "home.meta.title",
  descriptionKey: "home.meta.description",
} as const

/** Products requested per rail. Enough to overflow the row, small enough to stay cheap. */
export const RAIL_PRODUCT_LIMIT = 8
