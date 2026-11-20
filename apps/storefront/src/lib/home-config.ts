import type { TranslationKey } from "@lib/i18n/translations"

/** Category card artwork in `public/categories`. */
const ART = {
  juguete: "/categories/cat-juguetes.png",
  alimento: "/categories/cat-alimentos.png",
  salud: "/categories/cat-salud.png",
  higiene: "/categories/cat-higiene.png",
  accesorio: "/categories/cat-accesorios.png",
  farmacia: "/categories/cat-farmacia.png",
} as const

const HERO_ART = {
  bienestar: "/hero/hero-pets-bienestar.jpg",
  nutricion: "/hero/hero-pets-nutricion.jpg",
  duoDesktop: "/hero/pets-duo-desktop.svg",
  duoMobile: "/hero/pets-duo-mobile.svg",
  careDesktop: "/hero/pets-care-desktop.svg",
  careMobile: "/hero/pets-care-mobile.svg",
} as const

export type HomeHeroSlide = {
  id: string
  eyebrowKey?: TranslationKey | null
  titleKey?: TranslationKey
  subtitleKey?: TranslationKey
  ctaKey?: TranslationKey
  ctaHref: string
  secondaryCtaKey?: TranslationKey
  secondaryCtaHref?: string
  imageAltKey?: TranslationKey
  /** Literal strings customizable from the Admin Panel Carruseles view */
  eyebrow?: string
  title?: string
  titleHighlight?: string
  subtitle?: string
  ctaLabel?: string
  secondaryCtaLabel?: string
  imageAlt?: string
  imageDesktop: string
  imageMobile: string | null
  active: boolean
  order: number
}

export const heroSlides: HomeHeroSlide[] = [
  {
    id: "bienestar-diario",
    eyebrowKey: "home.hero.eyebrow.care",
    eyebrow: "Cuidado de tu mascota",
    titleKey: "home.hero.slide2.title",
    title: "Bienestar todos los",
    titleHighlight: "días",
    subtitleKey: "home.hero.slide2.subtitle",
    subtitle:
      "Productos seleccionados para acompañar a tu mascota en cada etapa.",
    ctaKey: "home.hero.slide2.cta",
    ctaLabel: "Ver alimentos",
    ctaHref: "/categories/alimentos",
    secondaryCtaKey: "home.hero.slide2.secondaryCta",
    secondaryCtaLabel: "Ver cuidados",
    secondaryCtaHref: "/categories/salud",
    imageAltKey: "home.hero.slide2.alt",
    imageAlt: "Cachorro Golden Retriever y gatito junto a su plato y juguetes",
    imageDesktop: HERO_ART.bienestar,
    imageMobile: HERO_ART.bienestar,
    active: true,
    order: 10,
  },
  {
    id: "cuidado-diario",
    eyebrowKey: "home.hero.eyebrow.store",
    eyebrow: "Nutrición y Salud",
    titleKey: "home.hero.slide1.title",
    title: "Todo para cuidar a tu",
    titleHighlight: "mejor amigo",
    subtitleKey: "home.hero.slide1.subtitle",
    subtitle:
      "Alimentos, higiene, paseo y diversión en un solo lugar para que tu mascota viva bien todos los días.",
    ctaKey: "home.hero.slide1.cta",
    ctaLabel: "Explorar productos",
    ctaHref: "/store",
    secondaryCtaKey: "home.hero.secondaryCta",
    secondaryCtaLabel: "Ver ofertas",
    secondaryCtaHref: "/collections/ofertas",
    imageAltKey: "home.hero.slide1.alt",
    imageAlt: "Perro y gato felices con alimento balanceado y juguetes",
    imageDesktop: HERO_ART.nutricion,
    imageMobile: HERO_ART.nutricion,
    active: true,
    order: 20,
  },
]

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

export type HomeSecondaryBanner = {
  id: string
  eyebrowKey: TranslationKey | null
  titleKey: TranslationKey
  subtitleKey: TranslationKey
  ctaKey: TranslationKey
  ctaHref: string
  secondaryCtaKey?: TranslationKey
  secondaryCtaHref?: string
  image: string
  imageAltKey: TranslationKey
  active: boolean
  order: number
}

export const secondaryBanners: HomeSecondaryBanner[] = [
  {
    id: "rutina-diaria",
    eyebrowKey: "home.banner.eyebrow",
    titleKey: "home.banner.title",
    subtitleKey: "home.banner.subtitle",
    ctaKey: "home.banner.cta",
    ctaHref: "/store",
    secondaryCtaKey: "home.banner.secondaryCta",
    secondaryCtaHref: "/categories/higiene",
    image: "/hero/cuidado-diario-bento.jpg",
    imageAltKey: "home.banner.imageAlt",
    active: true,
    order: 20,
  },
]

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

export { benefits } from "@lib/site-config"

export const homeSeo = {
  titleKey: "home.meta.title",
  descriptionKey: "home.meta.description",
} as const

export const RAIL_PRODUCT_LIMIT = 8
