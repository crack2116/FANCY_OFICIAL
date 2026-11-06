/**
 * Single source of truth for brand identity and locale.
 *
 * The commercial name is now confirmed: "FANCY PET PERU OFICIAL". Changing the
 * brand means editing THIS FILE ONLY — never hunt for hardcoded strings across
 * components.
 *
 * The SAME name must exist as `store.name` in the backend, because that is what
 * Medusa Admin renders in its sidebar header (it reads `store.name` and shows
 * its initials — it is not a hardcoded "Medusa" wordmark). Storefront and Admin
 * therefore have two separate copies of this string, and they drift apart
 * silently. `docs/DECISIONS.md` records the pairing.
 *
 * All visible copy lives in `src/lib/i18n/translations.ts` instead, so brand
 * identity and copy stay separate concerns.
 */

import type { ComponentType } from "react"

import type { TranslationKey } from "@lib/i18n/translations"
import type { IconProps } from "types/icon"

import Ball from "@modules/common/icons/ball"
import Bowl from "@modules/common/icons/bowl"
import Cross from "@modules/common/icons/cross"
import Droplet from "@modules/common/icons/droplet"
import Paw from "@modules/common/icons/paw"
import Percent from "@modules/common/icons/percent"
import Pulse from "@modules/common/icons/pulse"
import Tag from "@modules/common/icons/tag"

export const siteConfig = {
  /** Confirmed commercial name. */
  name: "FANCY PET PERU OFICIAL",
  /** Shown in metadata and the footer. */
  description:
    "Alimentos, accesorios y cuidado para tu mascota. Fancy Pets — Pet Shop. Envíos a todo el Perú.",
  /** BCP 47 tag. Drives <html lang> and every Intl formatter. */
  locale: "es-PE",
  currency: "PEN",
  country: "PE",
  /** Route prefix the storefront uses for the Peru region. */
  defaultCountryCode: "pe",
} as const

/**
 * The Medusa collection that holds the region's discounted products.
 *
 * "Ofertas" is a real collection, not a facet. The product index resolves prices
 * with a currency context only, while the demo discount comes from a
 * REGION-SCOPED price list, so the index reports `on_sale: false` for a product
 * the Store API genuinely sells cheaper. Listing the collection is honest where an
 * `on_sale` facet would not be.
 */
export const OFFERS_COLLECTION_HANDLE = "ofertas"

/**
 * Main navigation. `handle` must match a top-level category handle in the
 * backend; entries whose category does not exist yet are skipped by the nav,
 * so this list can be written before the taxonomy is seeded.
 *
 * An entry with `handle: null` is a route that is not a category. Today that is
 * only "Ofertas", which points at the real offers collection. There is
 * deliberately no bare `/store` fallback for it any more: a link labelled
 * "Ofertas" that lands on the unfiltered catalogue is worse than no link.
 */
/**
 * Which of the category icons a nav entry uses.
 *
 * Stored as a KEY rather than as the component itself, so this file describes
 * what the nav looks like without deciding what a component is. `navIcons` below
 * is the only place that knows which key maps to which drawing; a nav entry that
 * names a key the registry does not have would be a type error, not a blank
 * square at runtime.
 *
 * The live store loads these as external `.svg` files over the network. Ours are
 * inlined, because an inline `<svg>` costs nothing on the wire and a nav that
 * shifts every icon request is worse than one that never requests them.
 */
export type NavIconKey =
  | "paw"
  | "bowl"
  | "pulse"
  | "cross"
  | "droplet"
  | "tag"
  | "ball"
  | "percent"

/**
 * A submenu entry under a top-level nav item.
 *
 * Defined now, used by nothing yet — see `NavItem.children` below. It exists so
 * that turning on submenus is a config change rather than a migration of the
 * link shape.
 */
export type NavChild = {
  labelKey: TranslationKey
  handle: string
}

export type NavItem = {
  labelKey: TranslationKey
  handle: string | null
  /**
   * Optional. An entry with no icon renders as a bare label, which is a
   * deliberate supported state: a new category that has not been given an icon
   * yet should read as plain text, not as a broken placeholder.
   */
  icon?: NavIconKey
  /**
   * Submenu entries. OPTIONAL AND CURRENTLY EMPTY ON EVERY ENTRY.
   *
   * The reference store shows a downward caret on the items that open a
   * mega-menu, and none on the items that go straight to a page. Ours has no
   * submenus wired, so there is nothing for a caret to open, and the header
   * therefore renders none — a caret pointing at nothing is worse than no
   * caret. The field, the type and the conditional in the header all exist, so
   * the caret appears by itself the moment an entry gets its first child.
   */
  children?: NavChild[]
}

export const mainNav: NavItem[] = [
  { labelKey: "nav.perros", handle: "perros", icon: "paw" },
  { labelKey: "nav.alimentos", handle: "alimentos", icon: "bowl" },
  { labelKey: "nav.salud", handle: "salud", icon: "pulse" },
  { labelKey: "nav.farmacia", handle: "farmacia", icon: "cross" },
  { labelKey: "nav.higiene", handle: "higiene", icon: "droplet" },
  { labelKey: "nav.accesorios", handle: "accesorios", icon: "tag" },
  { labelKey: "nav.juguetes", handle: "juguetes", icon: "ball" },
  // Not a category: the offers collection. Resolved to a real href by
  // `@lib/util/nav-links`, and dropped entirely when that collection is absent.
  { labelKey: "nav.ofertas", handle: null, icon: "percent" },
]

/**
 * Key to component. The single place that binds a nav icon key to a drawing.
 *
 * These are all default exports from `@modules/common/icons` and all share that
 * folder's shape: inline SVG, 20-unit viewBox, 1.5 stroke, `currentColor`. That
 * uniformity is what makes eight independent files look like one set, and it is
 * why they can be swapped here without touching the header.
 *
 * Each icon defaults to `aria-hidden`, so the nav link's accessible name stays
 * the plain label — a screen reader hears "Perros", not "paw, Perros".
 */
export const navIcons: Record<NavIconKey, ComponentType<IconProps>> = {
  paw: Paw,
  bowl: Bowl,
  pulse: Pulse,
  cross: Cross,
  droplet: Droplet,
  tag: Tag,
  ball: Ball,
  percent: Percent,
}

/**
 * Trust signals.
 *
 * Single source of truth: the footer and the home page both render from this
 * array, so the two can never drift apart. Copy lives in the translation
 * dictionary, hence the `*Key` fields.
 *
 * These are deliberately honest. There is no free-shipping threshold, no
 * delivery window, no veterinary guarantee and no warranty claim, because none
 * of those policies exist yet. Add them here when they become real.
 */
export type Benefit = {
  id: string
  titleKey: TranslationKey
  descriptionKey: TranslationKey
}

export const benefits: Benefit[] = [
  {
    id: "shipping",
    titleKey: "benefits.shipping.title",
    descriptionKey: "benefits.shipping.description",
  },
  {
    id: "quality",
    titleKey: "benefits.quality.title",
    descriptionKey: "benefits.quality.description",
  },
  {
    id: "secure",
    titleKey: "benefits.secure.title",
    descriptionKey: "benefits.secure.description",
  },
  {
    id: "selection",
    titleKey: "benefits.selection.title",
    descriptionKey: "benefits.selection.description",
  },
  {
    id: "support",
    titleKey: "benefits.support.title",
    descriptionKey: "benefits.support.description",
  },
  {
    id: "returns",
    titleKey: "benefits.returns.title",
    descriptionKey: "benefits.returns.description",
  },
]

/**
 * Announcement bar. Development placeholder copy — no commercial claims.
 * Set `enabled` to false to hide the bar without touching components.
 */
export const announcement = {
  enabled: true,
  messages: ["Bienvenido a nuestra tienda", "Envíos a todo el Perú"],
} as const

/**
 * Footer column links. Entries with a null `href` render as plain labels and
 * are reserved for sections that are not built yet (legal pages, contact
 * details). No invented legal data: RUC, address, phone and company name are
 * intentionally absent until they are real.
 */
export type FooterLink = { labelKey: TranslationKey; href: string | null }

export type FooterColumn = { titleKey: TranslationKey; links: FooterLink[] }

export const footerColumns: FooterColumn[] = [
  {
    titleKey: "footer.comprar",
    links: [
      { labelKey: "footer.tienda", href: "/store" },
      // Resolved at render time by the footer, which checks the collection
      // actually exists before turning this into a link.
      { labelKey: "footer.ofertas", href: null },
      { labelKey: "footer.nuevos", href: null },
    ],
  },
  {
    titleKey: "footer.ayuda",
    links: [
      { labelKey: "footer.envios", href: null },
      { labelKey: "footer.devoluciones", href: null },
      { labelKey: "footer.preguntas", href: null },
      { labelKey: "footer.contacto", href: null },
    ],
  },
  {
    titleKey: "footer.cuenta",
    links: [
      { labelKey: "footer.miCuenta", href: "/account" },
      { labelKey: "footer.pedidos", href: "/account/orders" },
      { labelKey: "footer.direcciones", href: "/account/addresses" },
    ],
  },
  {
    titleKey: "footer.legal",
    links: [
      { labelKey: "footer.terminos", href: null },
      { labelKey: "footer.privacidad", href: null },
      { labelKey: "footer.libroReclamaciones", href: null },
    ],
  },
]