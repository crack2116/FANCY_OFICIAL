import { getBranding } from "@lib/branding"
import { getActiveSlides } from "@lib/util/home-merchandising"
import HeroCarousel from "./hero-carousel"

/**
 * Home hero.
 *
 * A Server Component on purpose: it resolves the slide configuration and hands
 * the result to the carousel, which is the only Client Component in the home
 * tree. Adding, reordering or disabling a slide is a change in
 * `src/lib/home-config.ts` alone.
 *
 * WHY IT READS BRANDING ITSELF
 * -----------------------------
 * `getActiveSlides` stays pure — it takes the artwork map as a parameter, exactly
 * like `resolveCategoryCards` — and the fetch lives in this server component, so
 * nothing that decides what renders ever awaits on the network.
 *
 * This is a SIBLING of `HomeSections` under the home page, not a child, so the
 * map cannot be handed down from there. It is also not a new risk to the page:
 * the root layout already awaits `getBranding()` for the CSS variables, and the
 * call is `force-cache` with a revalidate window, so this one is a cache hit.
 *
 * No marketing claims, prices or invented commercial copy: every string comes
 * from `t()` and the artwork is either the local demo SVG set or what the
 * operator uploaded from the Admin.
 */
export default async function Hero() {
  const heroArtwork = await getBranding()
    .then((branding) => branding.hero_artwork)
    .catch(() => ({}))

  return <HeroCarousel slides={getActiveSlides(undefined, heroArtwork)} />
}