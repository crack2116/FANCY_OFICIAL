/**
 * Storefront branding, read from the backend at request time.
 *
 * WHY A FETCH AND NOT A CONSTANT
 * ------------------------------
 * The whole point of this module is that a clinic operator changes colours and
 * the logo from the Admin, with no deploy. A build-time constant cannot do
 * that. The Admin form writes `store.metadata.branding`; this reads it back
 * through `GET /store/branding`.
 *
 * WHY IT NEVER THROWS
 * -------------------
 * A storefront that fails because a cosmetic setting is unreachable is worse
 * than one that shows the default palette. Every failure path here resolves to
 * `DEFAULT_BRANDING` rather than propagating, so a backend hiccup degrades the
 * colours and never the shop.
 *
 * WHY CACHING IS DELIBERATELY CONSERVATIVE
 * -----------------------------------------
 * Branding changes are rare and must be visible immediately after the operator
 * saves. The request is therefore marked `force-cache` with a revalidate window
 * rather than a long immutable cache, so a change lands within seconds instead
 * of surviving a stale entry for the rest of the day.
 */

import {
  CATEGORY_HANDLE_PATTERN,
  DEFAULT_ANNOUNCEMENT_ENABLED,
  DEFAULT_ANNOUNCEMENT_MESSAGES,
  DEFAULT_BRANDING,
  HERO_SLIDE_IDS,
  MAX_CATEGORY_ARTWORK,
  type StoreBranding,
} from "@lib/branding-contract"
import type { StoreBrandingResponse } from "@lib/branding-contract"

const BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const PUBLISHABLE_API_KEY =
  process.env.MEDUSA_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

export const BRANDING_REVALIDATE_SECONDS = 60

/**
 * Fetch branding, falling back to the shipped palette.
 *
 * Uses plain `fetch` against the backend rather than `sdk.store`, which only
 * exposes methods for routes the SDK ships. This mirrors how `middleware.ts`
 * reaches `/store/regions`: same publishable-key header, same `next.revalidate`
 * caching. A malformed or partial payload is normalised by `normalizeBranding`,
 * so this only decides between "the backend answered" and "it did not".
 */
export const getBranding = async (): Promise<StoreBranding> => {
  if (!BACKEND_URL) {
    return FALLBACK_BRANDING
  }

  try {
    const response = await fetch(`${BACKEND_URL}/store/branding`, {
      method: "GET",
      headers: {
        "x-publishable-api-key": PUBLISHABLE_API_KEY ?? "",
      },
      next: { revalidate: BRANDING_REVALIDATE_SECONDS },
      cache: "force-cache",
    })

    if (!response.ok) {
      throw new Error(`Branding endpoint returned ${response.status}`)
    }

    const { branding } = (await response.json()) as StoreBrandingResponse

    return normalizeBranding(branding)
  } catch {
    return FALLBACK_BRANDING
  }
}

/**
 * The shipped look, used whenever the backend cannot be reached.
 *
 * A storefront that fails because a cosmetic setting is unreachable is worse
 * than one that shows default colours, so every failure path lands here.
 */
const FALLBACK_BRANDING: StoreBranding = {
  logo_url: null,
  tagline: null,
  announcement_enabled: DEFAULT_ANNOUNCEMENT_ENABLED,
  announcement_messages: [...DEFAULT_ANNOUNCEMENT_MESSAGES],
  category_artwork: {},
  hero_artwork: {},
  colors: DEFAULT_BRANDING,
}

const HEX = /^#[0-9a-fA-F]{6}$/

const KNOWN_HERO_SLIDE_IDS = HERO_SLIDE_IDS as readonly string[]

/**
 * Keep only entries that are still usable as an image source.
 *
 * `isValidKey` is what separates the two maps: a category handle is
 * pattern-checked, a hero slide id must be a slide this storefront knows. A hero
 * entry left behind by a slide that was since deleted is therefore dropped here
 * rather than carried through the page forever.
 *
 * Degrades PER ENTRY, not per map: one handle the backend no longer recognises
 * must not blank the five categories that are fine. The URL test is `http(s)`
 * because these strings go straight into `next/image`, which refuses anything
 * else at runtime — and because a relative value here would be a path on the
 * storefront, not on the backend.
 */
const normalizeArtwork = (
  value: unknown,
  isValidKey: (key: string) => boolean,
  max: number
): Record<string, string> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {}
  }

  const entries: Record<string, string> = {}

  for (const [handle, url] of Object.entries(value)) {
    if (Object.keys(entries).length >= max) {
      break
    }

    if (!isValidKey(handle) || typeof url !== "string") {
      continue
    }

    try {
      const parsed = new URL(url)

      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        continue
      }

      entries[handle] = url
    } catch {
      // Not a URL at all. Dropped, and its siblings keep their artwork.
    }
  }

  return entries
}

/**
 * Re-validate whatever the API returned, per field.
 *
 * The API already validates on write, but a row edited directly in the database
 * or written by an older build can still be wrong, and this runs on every
 * request. One bad colour must not blank the other four.
 */
const normalizeBranding = (value: unknown): StoreBranding => {
  const raw = (value ?? {}) as Partial<StoreBranding>
  const colors = { ...DEFAULT_BRANDING }

  for (const key of Object.keys(DEFAULT_BRANDING) as (keyof typeof DEFAULT_BRANDING)[]) {
    const candidate = (raw.colors as Record<string, unknown> | undefined)?.[key]
    if (typeof candidate === "string" && HEX.test(candidate)) {
      colors[key] = candidate
    }
  }

  const messages = Array.isArray(raw.announcement_messages)
    ? raw.announcement_messages
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .slice(0, 5)
    : []

  return {
    logo_url: typeof raw.logo_url === "string" && raw.logo_url ? raw.logo_url : null,
    tagline: typeof raw.tagline === "string" && raw.tagline ? raw.tagline : null,
    announcement_enabled:
      typeof raw.announcement_enabled === "boolean"
        ? raw.announcement_enabled
        : DEFAULT_ANNOUNCEMENT_ENABLED,
    announcement_messages: messages.length ? messages : [...DEFAULT_ANNOUNCEMENT_MESSAGES],
    category_artwork: normalizeArtwork(
      raw.category_artwork,
      (handle) => CATEGORY_HANDLE_PATTERN.test(handle),
      MAX_CATEGORY_ARTWORK
    ),
    hero_artwork: normalizeArtwork(
      raw.hero_artwork,
      (id) => KNOWN_HERO_SLIDE_IDS.includes(id),
      // Membership is already the cap; the argument is only here so the two maps
      // go through the same helper.
      KNOWN_HERO_SLIDE_IDS.length
    ),
    colors,
  }
}

/**
 * The branding as CSS custom properties.
 *
 * Maps the five editable colours onto the tokens `globals.css` already defines,
 * including the derived shades, so a re-skin reaches every component that uses
 * `--brand-*` without a single component change. That mapping is the contract:
 * `globals.css` declares these tokens, this file only overrides their values.
 */
export const brandingCssVariables = (branding: StoreBranding): Record<string, string> => {
  const { primary, primaryDark, accent, surface, text } = branding.colors

  return {
    "--brand-400": primary,
    "--brand-500": primary,
    "--brand-600": primaryDark,
    "--brand-700": primaryDark,
    "--brand-800": primaryDark,
    "--brand-900": primaryDark,
    "--accent-500": accent,
    "--accent-600": accent,
    "--accent-700": accent,
    "--surface": surface,
    "--bg-base": surface,
    "--fg-base": text,
  }
}

/** Serialise to the `style` string React accepts on an element. */
export const brandingStyle = (branding: StoreBranding): Record<string, string> =>
  brandingCssVariables(branding)