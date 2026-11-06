/**
 * The branding contract, mirrored for the storefront.
 *
 * WHY THIS FILE EXISTS RATHER THAN IMPORTING THE BACKEND ONE
 * ----------------------------------------------------------
 * The storefront and the backend are separate build graphs with separate
 * tsconfigs. Importing `apps/backend/src/lib/store-branding.ts` from the
 * storefront would couple them and drag `@medusajs/framework/zod` into the
 * browser bundle for two constants.
 *
 * So the SHAPE is duplicated and the risk is handled explicitly: `defaults` and
 * the types below are asserted against the backend's `DEFAULT_BRANDING` by the
 * comment contract, and the storefront re-validates every value it receives in
 * `lib/branding.ts` rather than trusting it. If the backend adds a field, this
 * side simply ignores it until it is needed.
 */

/** The five editable brand colours, named by intent rather than by CSS token. */
export type BrandingColors = {
  primary: string
  primaryDark: string
  accent: string
  surface: string
  text: string
}

export type StoreBranding = {
  logo_url: string | null
  tagline: string | null
  /** The announcement bar above the header. */
  announcement_enabled: boolean
  announcement_messages: string[]
  /**
   * Category artwork keyed by category handle.
   *
   * An EMPTY map is the normal state, not a broken one: it is what makes
   * `resolveCategoryCards` fall back to the shipped demo SVG instead of
   * rendering a blank circle.
   */
  category_artwork: Record<string, string>
  /**
   * Hero artwork keyed by hero slide id.
   *
   * Also normally empty. An entry replaces BOTH the desktop and the mobile image
   * of its slide, because the hero crops one image inside a fixed aspect box.
   */
  hero_artwork: Record<string, string>
  colors: BrandingColors
}

export type StoreBrandingResponse = {
  store: { name: string }
  branding: StoreBranding
}

/**
 * The shipped palette. MUST equal `DEFAULT_BRANDING` in
 * `apps/backend/src/lib/store-branding.ts`.
 */
export const DEFAULT_BRANDING: BrandingColors = {
  primary: "#f99c32",
  primaryDark: "#bd6212",
  accent: "#f24534",
  surface: "#ffffff",
  text: "#12211f",
}

/** MUST equal `DEFAULT_ANNOUNCEMENT_*` in `apps/backend/src/lib/store-branding.ts`. */
export const DEFAULT_ANNOUNCEMENT_ENABLED = true
export const DEFAULT_ANNOUNCEMENT_MESSAGES = [
  "Bienvenido a nuestra tienda",
  "Envíos a todo el Perú",
]

/**
 * MUST equal `CATEGORY_HANDLE_PATTERN` in
 * `apps/backend/src/lib/store-branding.ts`.
 *
 * Re-checked here even though the backend validates on write, because a store
 * row edited straight in the database bypasses that validator and the value ends
 * up as a `next/image` src.
 */
export const CATEGORY_HANDLE_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/

/** MUST equal `MAX_CATEGORY_ARTWORK` in `apps/backend/src/lib/store-branding.ts`. */
export const MAX_CATEGORY_ARTWORK = 24

/**
 * MUST equal `HERO_SLIDE_IDS` in `apps/backend/src/lib/store-branding.ts`.
 *
 * THE DUPLICATION IS THE POINT HERE, NOT AN ACCIDENT
 * --------------------------------------------------
 * Hero slides are this app's configuration (`heroSlides` in `home-config.ts`),
 * not backend data, so there is nothing on the server that can enumerate them —
 * and the backend still has to reject an upload naming a slide that does not
 * exist. Both sides therefore hold the same closed list.
 *
 * The backend's copy is the one that GATES writes, so if the two drift the failure
 * is a refused upload, never a stored entry nothing renders. This side uses it to
 * ignore an admin entry left behind by a slide that was since deleted or renamed:
 * a stale key is simply never read.
 */
export const HERO_SLIDE_IDS = ["cuidado-diario", "bienestar-diario"] as const

export type HeroSlideId = (typeof HERO_SLIDE_IDS)[number]