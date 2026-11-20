/**
 * ============================================================================
 *  Store branding contract — shared by the public and admin APIs.
 * ============================================================================
 *
 * WHAT THIS IS
 * One shape, one validator and one set of defaults for how the storefront
 * LOOKS. It is deliberately NOT the landing page content: heroes, rails and
 * copy stay in the storefront's own config for now.
 *
 * WHERE IT IS STORED
 * `store.metadata.branding` on the single store record. Chosen over a new module
 * because this deployment has exactly one store and the value is a small, fixed
 * document. Two consequences are accepted on purpose:
 *
 *   - `metadata` is untyped JSONB, so the database cannot enforce the shape.
 *     That is why everything is validated at the API boundary and why
 *     `readBranding` NEVER trusts what it finds: a hand-edited or corrupted
 *     value degrades to the default for that field instead of breaking render.
 *   - `updateStoresWorkflow` REPLACES the whole `metadata` object rather than
 *     merging it, so every write spreads the existing keys back in.
 *
 * The admin UI talks to this contract, not to `metadata`, so promoting this to
 * a real module later would not change a single screen.
 *
 * WHY ONLY FIVE COLORS
 * `globals.css` already defines a semantic palette (`--brand-500`,
 * `--accent-500`, `--surface`, `--fg-base`). Exposing all twenty-odd tokens
 * would be a paint chart nobody can reason about. These five are the ones a
 * clinic actually wants to change, and the derived shades map onto the tokens
 * that already exist.
 */

import { z } from "@medusajs/framework/zod"

/** 6-digit hex, case-insensitive. Rejects `#fff`, `red`, and CSS functions. */
const HEX_COLOR = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "El color debe ser un hex de 6 dígitos, por ejemplo #F99C32")

/**
 * The editable brand colours.
 *
 * Field names describe INTENT, not the CSS variable they feed, so the admin can
 * be relabelled in Spanish without this contract changing.
 */
export const brandingValidator = z.object({
  /** Primary. Feeds `--brand-400` and `--brand-500`: buttons, links, focus. */
  primary: HEX_COLOR,
  /**
   * Darker primary, used wherever the brand colour sits on white and has to
   * stay legible. Feeds `--brand-600/700/800/900`, and therefore
   * `--fg-interactive`, `--border-interactive`.
   */
  primaryDark: HEX_COLOR,
  /** Coral accent. Feeds `--accent-500/600/700`: offers and badges. */
  accent: HEX_COLOR,
  /** Page background. Feeds `--surface`. */
  surface: HEX_COLOR,
  /** Body text. Feeds `--fg-base`. */
  text: HEX_COLOR,
})

export type StoreBrandingInput = z.infer<typeof brandingValidator>

/** The payload the storefront and the admin form both consume. */
export const DEFAULT_BRANDING: StoreBrandingInput = {
  primary: "#e8681c",
  primaryDark: "#a8440b",
  accent: "#c93b2c",
  surface: "#faf7f2",
  text: "#1c2b27",
}

/** Logo is an optional URL rather than a required colour. */
export const logoValidator = z
  .string()
  .trim()
  .url("El logo debe ser una URL completa")
  .max(2048)
  .nullable()

/**
 * The artwork key syntax: lowercase, dash-separated, bounded length.
 *
 * Anchored because a key becomes part of a public URL (`/categories/<handle>`)
 * and because a URL query, so anything looser would let a hand-edited metadata
 * row point the storefront at a path that does not exist.
 *
 * ONE PATTERN FOR BOTH MAPS
 * -------------------------
 * Category handles and hero slide ids happen to share this shape, so they share
 * the literal too. They remain SEPARATE concepts with separate validation — a
 * hero id must additionally be a member of `HERO_SLIDE_IDS` — because the two key
 * spaces evolve independently.
 */
export const ARTWORK_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/

/**
 * A category handle as Medusa stores it.
 *
 * Alias of `ARTWORK_KEY_PATTERN`, named for the call site so the reader does not
 * have to know that hero ids share the same shape.
 */
export const CATEGORY_HANDLE_PATTERN = ARTWORK_KEY_PATTERN

/**
 * Upper bound on the artwork map.
 *
 * The store has six real categories. The cap exists so a bug or a hand-edited
 * metadata row cannot turn this small cosmetic document into an unbounded blob
 * that every storefront request reads and re-serialises.
 */
export const MAX_CATEGORY_ARTWORK = 24

/**
 * Category artwork, keyed by category handle.
 *
 * Medusa v2's `product_category` has no image field at all — the store API does
 * not return one, not even as null — so there is nothing on the category row for
 * an upload to write into. `store.metadata` is the one place that exists both in
 * the framework and in this document, so the map lives here instead.
 *
 * The VALUES must be absolute URLs: the storefront hands them straight to
 * `next/image`, which refuses a relative src at runtime. A value that is not a
 * URL is dropped on read rather than stored.
 */
const ARTWORK_URL = z
  .string()
  .url("La imagen debe ser una URL completa")
  .max(2048)

export const categoryArtworkValidator = z
  .record(
    z.string().regex(CATEGORY_HANDLE_PATTERN, "El identificador de categoría no es válido"),
    ARTWORK_URL
  )
  .refine((entries) => Object.keys(entries).length <= MAX_CATEGORY_ARTWORK, {
    message: `Solo se admiten hasta ${MAX_CATEGORY_ARTWORK} imágenes de categoría`,
  })

/**
 * The hero slide ids the storefront renders.
 *
 * WHY THIS LIST IS DUPLICATED AND NOT DERIVED
 * -------------------------------------------
 * Slide ids are STOREFRONT CONFIG (`heroSlides` in
 * `apps/storefront/src/lib/home-config.ts`), not backend data: there is no hero
 * slide entity in Medusa, so nothing on the server can enumerate them. The
 * storefront is a separate build graph, so importing the storefront file from
 * here is not possible either. That leaves a deliberate duplicate, handled the
 * same way as the rest of this contract: the storefront mirrors the list, and
 * the only thing that breaks if the two drift is that an upload is refused —
 * never a broken image.
 *
 * CLOSED SET ON PURPOSE
 * ---------------------
 * Hero keys must be a member of this list, unlike category handles which are
 * only pattern-checked. A hero slide id names a piece of landing composition, so
 * accepting an unknown one would let an upload be written that nothing will ever
 * read. Membership doubles as the cap: the map cannot exceed
 * `HERO_SLIDE_IDS.length`, which is exactly the number of entries that can render.
 */
export const HERO_SLIDE_IDS = ["cuidado-diario", "bienestar-diario"] as const

export type HeroSlideId = (typeof HERO_SLIDE_IDS)[number]

export const MAX_HERO_ARTWORK = HERO_SLIDE_IDS.length

const HERO_SLIDE_ID = z.enum(HERO_SLIDE_IDS)

/** Hero artwork, keyed by slide id. A sibling of `category_artwork`. */
export const heroArtworkValidator = z
  .record(z.string(), ARTWORK_URL)
  .refine(
    (entries) =>
      Object.keys(entries).every((id) => HERO_SLIDE_ID.safeParse(id).success),
    { message: "La diapositiva indicada no existe en la portada" }
  )

/**
 * Body accepted by `POST /admin/branding`.
 *
 * Shaped like the object `GET /admin/branding` returns, so a client can read
 * the branding, hand it back with one field changed, and never has to know
 * where the colours live. The colours are nested under `colors` for exactly
 * that reason; an earlier flat version made the round-trip asymmetric and the
 * form rejected its own GET.
 */
export const updateBrandingValidator = z.object({
  logo_url: logoValidator.optional(),
  tagline: z.string().trim().max(160).nullable().optional(),
  /**
   * Announcement bar. This is the first thing a shopper sees on the landing, so
   * it belongs with the rest of "how the shop presents itself".
   */
  announcement_enabled: z.boolean().optional(),
  announcement_messages: z
    .array(z.string().trim().min(1).max(120))
    .max(5)
    .optional(),
  /**
   * Category artwork keyed by handle. Sent whole from the admin form, so a
   * removed entry is how the operator goes back to the shipped demo artwork.
   */
  category_artwork: categoryArtworkValidator.optional(),
  /**
   * Hero artwork keyed by slide id. Same semantics as `category_artwork`: sent
   * whole, and a removed entry restores the configured image.
   */
  hero_artwork: heroArtworkValidator.optional(),
  colors: brandingValidator,
})

export type UpdateBrandingInput = z.infer<typeof updateBrandingValidator>

/** The `branding` key inside `store.metadata`. */
export const BRANDING_METADATA_KEY = "branding"

export const DEFAULT_ANNOUNCEMENT_ENABLED = true
export const DEFAULT_ANNOUNCEMENT_MESSAGES: readonly string[] = [
  "Bienvenido a nuestra tienda",
  "Envíos a todo el Perú",
]

/**
 * No artwork is stored by default, which is what makes the storefront fall back
 * to the shipped demo SVG rather than rendering a blank circle.
 */
export const DEFAULT_CATEGORY_ARTWORK: Record<string, string> = {}

/** Same idea for the hero: an empty map renders the configured slide images. */
export const DEFAULT_HERO_ARTWORK: Record<string, string> = {}

/** The single store row is read on every storefront request. */
export const DEFAULT_LOGO_URL: string | null = null
export const DEFAULT_TAGLINE: string | null = null

export type StoreBranding = {
  logo_url: string | null
  tagline: string | null
  announcement_enabled: boolean
  announcement_messages: string[]
  category_artwork: Record<string, string>
  hero_artwork: Record<string, string>
  colors: StoreBrandingInput
}

export const DEFAULT_STORE_BRANDING: StoreBranding = {
  logo_url: DEFAULT_LOGO_URL,
  tagline: DEFAULT_TAGLINE,
  announcement_enabled: DEFAULT_ANNOUNCEMENT_ENABLED,
  announcement_messages: [...DEFAULT_ANNOUNCEMENT_MESSAGES],
  category_artwork: DEFAULT_CATEGORY_ARTWORK,
  hero_artwork: DEFAULT_HERO_ARTWORK,
  colors: DEFAULT_BRANDING,
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isHeroSlideId = (key: string): boolean => HERO_SLIDE_ID.safeParse(key).success

const isCategoryHandle = (key: string): boolean => CATEGORY_HANDLE_PATTERN.test(key)

/**
 * Salvage an artwork map out of raw metadata, entry by entry.
 *
 * Degrades PER ENTRY rather than per map: one key that is not a valid key, or
 * one URL that is not a URL, is dropped on its own and its siblings survive. A
 * blanket "invalid map means empty" would turn a single bad row into six missing
 * images, which is a worse failure than the one it was hiding.
 *
 * `isValidKey` is what separates the two maps: a category handle is
 * pattern-checked, a hero slide id must be a member of `HERO_SLIDE_IDS`. A map
 * that is not an object at all degrades to `null`, which the caller turns into
 * the default — the same rule every other field follows.
 */
const readArtworkMap = (
  value: unknown,
  isValidKey: (key: string) => boolean,
  max: number
): Record<string, string> | null => {
  if (!isRecord(value)) {
    return null
  }

  const entries: Record<string, string> = {}

  for (const [rawKey, url] of Object.entries(value)) {
    if (Object.keys(entries).length >= max) {
      break
    }

    const key = rawKey.trim().toLowerCase()
    const parsed = ARTWORK_URL.safeParse(url)

    if (!isValidKey(key) || !parsed.success) {
      continue
    }

    entries[key] = parsed.data
  }

  return entries
}

/**
 * Read branding out of raw `store.metadata`, field by field.
 *
 * Every field is validated INDEPENDENTLY. A single malformed colour must not
 * discard the four that are fine, and a `metadata` written by an older or newer
 * version of this app must still render. Unknown keys are dropped rather than
 * passed through.
 */
export const readBranding = (metadata: unknown): StoreBranding => {
  const root = isRecord(metadata) ? metadata : {}
  const raw = isRecord(root[BRANDING_METADATA_KEY]) ? root[BRANDING_METADATA_KEY] : {}

  const colors = { ...DEFAULT_BRANDING }
  for (const key of Object.keys(DEFAULT_BRANDING) as (keyof StoreBrandingInput)[]) {
    const parsed = brandingValidator.shape[key].safeParse(raw[key])
    if (parsed.success) {
      colors[key] = parsed.data
    }
  }

  const logo = logoValidator.safeParse(raw.logo_url)

  const categoryArtwork = readArtworkMap(
    raw.category_artwork,
    isCategoryHandle,
    MAX_CATEGORY_ARTWORK
  )

  const heroArtwork = readArtworkMap(raw.hero_artwork, isHeroSlideId, MAX_HERO_ARTWORK)

  const messages = Array.isArray(raw.announcement_messages)
    ? raw.announcement_messages
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 5)
    : [...DEFAULT_ANNOUNCEMENT_MESSAGES]

  return {
    logo_url: logo.success ? logo.data : DEFAULT_LOGO_URL,
    tagline: typeof raw.tagline === "string" ? raw.tagline : DEFAULT_TAGLINE,
    // A missing flag means ON, so branding written before this field existed
    // keeps showing the bar rather than silently losing it.
    announcement_enabled:
      typeof raw.announcement_enabled === "boolean"
        ? raw.announcement_enabled
        : DEFAULT_ANNOUNCEMENT_ENABLED,
    announcement_messages: messages.length ? messages : [...DEFAULT_ANNOUNCEMENT_MESSAGES],
    category_artwork: categoryArtwork ?? { ...DEFAULT_CATEGORY_ARTWORK },
    hero_artwork: heroArtwork ?? { ...DEFAULT_HERO_ARTWORK },
    colors,
  }
}

/** Merge an update into existing metadata, preserving every unrelated key. */
export const mergeBrandingMetadata = (
  metadata: unknown,
  branding: StoreBranding
): Record<string, unknown> => ({
  ...(isRecord(metadata) ? metadata : {}),
  [BRANDING_METADATA_KEY]: {
    logo_url: branding.logo_url,
    tagline: branding.tagline,
    announcement_enabled: branding.announcement_enabled,
    announcement_messages: branding.announcement_messages,
    // Nested rather than spread: each map is keyed by a handle or a slide id, so
    // flattening either into the branding document would collide with a colour
    // named the same.
    category_artwork: branding.category_artwork,
    hero_artwork: branding.hero_artwork,
    ...branding.colors,
  },
})