import type { ComponentType } from "react"

import type { TranslationKey } from "@lib/i18n/translations"
import type { IconProps } from "types/icon"

import Ball from "@modules/common/icons/ball"
import Bowl from "@modules/common/icons/bowl"
import Cat from "@modules/common/icons/cat"
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
    "Alimentos, accesorios y cuidado para tu mascota. Fancy Pets — Pet Shop. Envíos en Piura.",
  /** BCP 47 tag. Drives <html lang> and every Intl formatter. */
  locale: "es-PE",
  currency: "PEN",
  country: "PE",
  /** Route prefix the storefront uses for the Peru region. */
  defaultCountryCode: "pe",
} as const

export const OFFERS_COLLECTION_HANDLE = "ofertas"

export type NavIconKey =
  | "paw"
  | "cat"
  | "bowl"
  | "pulse"
  | "cross"
  | "droplet"
  | "tag"
  | "ball"
  | "percent"

export type NavChild = {
  labelKey: TranslationKey
  handle: string
}

export type NavItem = {
  labelKey: TranslationKey
  handle: string | null
  icon?: NavIconKey
  children?: NavChild[]
}

export const mainNav: NavItem[] = [
  { labelKey: "nav.perros", handle: "perros", icon: "paw" },
  { labelKey: "nav.gatos", handle: "gatos", icon: "cat" },
  { labelKey: "nav.alimentos", handle: "alimentos", icon: "bowl" },
  { labelKey: "nav.salud", handle: "salud", icon: "pulse" },
  { labelKey: "nav.farmacia", handle: "farmacia", icon: "cross" },
  { labelKey: "nav.higiene", handle: "higiene", icon: "droplet" },
  { labelKey: "nav.accesorios", handle: "accesorios", icon: "tag" },
  { labelKey: "nav.juguetes", handle: "juguetes", icon: "ball" },
  { labelKey: "nav.ofertas", handle: null, icon: "percent" },
]

export const navIcons: Record<NavIconKey, ComponentType<IconProps>> = {
  paw: Paw,
  cat: Cat,
  bowl: Bowl,
  pulse: Pulse,
  cross: Cross,
  droplet: Droplet,
  tag: Tag,
  ball: Ball,
  percent: Percent,
}

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

export const announcement = {
  enabled: true,
  messages: ["Bienvenido a nuestra tienda", "Envíos en Piura"],
} as const

export type FooterLink = { labelKey: TranslationKey; href: string | null }

export type FooterColumn = { titleKey: TranslationKey; links: FooterLink[] }

export const footerColumns: FooterColumn[] = [
  {
    titleKey: "footer.comprar",
    links: [
      { labelKey: "footer.tienda", href: "/store" },
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
