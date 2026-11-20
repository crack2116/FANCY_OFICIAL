import { getBranding } from "@lib/branding"
import type { HomeHeroSlide } from "@lib/home-config"
import { getActiveSlides } from "@lib/util/home-merchandising"
import HeroCarousel from "./hero-carousel"

const BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:9000"

const PUBLISHABLE_API_KEY =
  process.env.MEDUSA_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  ""

async function getAdminManagedSlides(): Promise<HomeHeroSlide[] | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/store/regions`, {
      method: "GET",
      headers: {
        "x-publishable-api-key": PUBLISHABLE_API_KEY,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as {
      regions?: Array<{
        id: string
        name?: string
        metadata?: Record<string, unknown> | null
      }>
    }

    const regions = data?.regions ?? []
    // Prefer Peru region if present, otherwise first region with fancypets_hero_slides
    const sortedRegions = [...regions].sort((a, b) => {
      const aPe = (a.name || "").toLowerCase().includes("per") ? -1 : 0
      const bPe = (b.name || "").toLowerCase().includes("per") ? -1 : 0
      return aPe - bPe
    })

    for (const region of sortedRegions) {
      const rawSlides = region.metadata?.fancypets_hero_slides
      if (Array.isArray(rawSlides) && rawSlides.length > 0) {
        const validSlides: HomeHeroSlide[] = rawSlides
          .filter(
            (item): item is Record<string, unknown> =>
              Boolean(item) && typeof item === "object"
          )
          .map((item, idx) => ({
            id:
              typeof item.id === "string" && item.id.trim()
                ? item.id.trim()
                : `slide-${idx + 1}`,
            eyebrow:
              typeof item.eyebrow === "string" ? item.eyebrow : undefined,
            title: typeof item.title === "string" ? item.title : "",
            titleHighlight:
              typeof item.titleHighlight === "string"
                ? item.titleHighlight
                : undefined,
            subtitle:
              typeof item.subtitle === "string" ? item.subtitle : "",
            ctaLabel:
              typeof item.ctaLabel === "string"
                ? item.ctaLabel
                : "Explorar productos",
            ctaHref:
              typeof item.ctaHref === "string" && item.ctaHref.trim()
                ? item.ctaHref.trim()
                : "/store",
            secondaryCtaLabel:
              typeof item.secondaryCtaLabel === "string"
                ? item.secondaryCtaLabel
                : undefined,
            secondaryCtaHref:
              typeof item.secondaryCtaHref === "string" &&
              item.secondaryCtaHref.trim()
                ? item.secondaryCtaHref.trim()
                : undefined,
            imageDesktop:
              typeof item.imageDesktop === "string" && item.imageDesktop.trim()
                ? item.imageDesktop.trim()
                : "/hero/hero-pets-bienestar.jpg",
            imageMobile:
              typeof item.imageMobile === "string" && item.imageMobile.trim()
                ? item.imageMobile.trim()
                : typeof item.imageDesktop === "string" &&
                    item.imageDesktop.trim()
                  ? item.imageDesktop.trim()
                  : "/hero/hero-pets-bienestar.jpg",
            imageAlt:
              typeof item.imageAlt === "string" && item.imageAlt.trim()
                ? item.imageAlt.trim()
                : typeof item.title === "string"
                  ? item.title
                  : "Fancy Pets",
            active: item.active !== false,
            order:
              typeof item.order === "number" && Number.isFinite(item.order)
                ? item.order
                : (idx + 1) * 10,
          }))
          .filter((slide) => slide.active)
          .sort((a, b) => a.order - b.order)

        if (validSlides.length > 0) {
          return validSlides
        }
      }
    }
  } catch {
    // Fallback to static home-config slides
  }
  return null
}

export default async function Hero() {
  const [adminSlides, heroArtwork] = await Promise.all([
    getAdminManagedSlides(),
    getBranding()
      .then((branding) => branding.hero_artwork)
      .catch(() => ({})),
  ])

  const slides =
    adminSlides && adminSlides.length > 0
      ? adminSlides
      : getActiveSlides(undefined, heroArtwork)

  return <HeroCarousel slides={slides} />
}
