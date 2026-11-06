import type { ReactNode } from "react"

import { t } from "@lib/i18n/translations"

/**
 * The five-up trust strip that sits directly under the hero.
 *
 * WHY IT EXISTS AND WHY IT IS NOT THE `Benefits` BLOCK
 * ------------------------------------------------------
 * The live store opens with a horizontal strip of icon-and-caption promises
 * right under the banner, and a shopper reads it before any product.
 * `Benefits` already existed but was a tall three-column block pinned to the
 * bottom of the page, which is a different component doing a different job: it
 * explains the policies at the end of the scroll, this one sells confidence at
 * the first screen.
 *
 * Keeping them separate is deliberate. Merging them would force one layout to
 * serve both positions and both would look wrong.
 *
 * WHY THE COPY IS A LOCAL CONSTANT
 * --------------------------------
 * These are short promises, not editorial copy, and they are read once. They
 * live here rather than in the 700-line translation dictionary so the whole
 * strip can be read in one place, next to the markup that renders it.
 *
 * HONESTY
 * -------
 * Every promise here is one the store can actually keep. There is no invented
 * delivery window, no warranty and no veterinary guarantee, because none of
 * those exist yet. If one becomes real, it can be added here.
 *
 * That test decided the fifth item too. "Mi Cuenta / Crea tu cuenta y sigue tus
 * pedidos" is the only fifth candidate that could be VERIFIED instead of
 * invented: `account/@dashboard/orders/page.tsx` renders and
 * `GET /store/customers/me/orders/:id` enforces ownership, so the claim is a
 * fact about shipped code. Every other candidate (WhatsApp, devoluciones, marcas
 * originales, envio gratis) would have been a promise this store cannot prove.
 *
 * AND NOTHING HERE DEPENDS ON A PRICE. Two earlier items were "Delivery Gratis
 * / Por compras mayores a 90 soles" and "15% OFF en tu tercer pedido / Usando
 * el cupón FANCY15". Both were removed because a promise tied to a threshold or
 * a coupon goes stale the moment the promotion ends, and then the storefront is
 * quietly lying to the first screen a shopper reads. When a campaign is
 * genuinely running, it belongs in the announcement strip above the header,
 * which the operator controls from Admin > Configuracion > Marca and can switch
 * off the day it ends.
 *
 * AND IT NEVER PROMISES WHAT THE STORE DOES NOT DO. The strip used to carry
 * "Delivery Gratis" and then "Envos a todo el Peru" with a truck beside it. The
 * store does not deliver, so the item and the glyph were removed outright rather
 * than reworded: the fix for an untrue shipping claim is to delete it, not to
 * soften it. With no delivery item, the fourth slot went to "Compra Segura",
 * which answers a question none of the other three does.
 *
 * OPEN INCONSISTENCY
 * ------------------
 * Three shipping claims still live OUTSIDE this file and still contradict the
 * decision above: `site-config.ts:37` (SEO meta description),
 * `site-config.ts:215` and `branding-contract.ts:71-72` (the announcement
 * strip), and `translations.ts:269` `benefits.shipping.title`, which the still
 * mounted `Benefits` block renders at `home-sections/index.tsx:154`. Surfaced
 * to the user; deliberately NOT changed here, because removing a claim is their
 * call, not this file's.
 */

type TrustItem = {
  id: string
  title: string
  description: string
  /** Drawn inline so the strip needs no icon font or extra request. */
  icon: ReactNode
}

/*
 * All five glyphs are drawn on this file's 24-unit grid at a 1.6 stroke with
 * round caps and joins, so they read as one set at the 36px the strip renders
 * them. Two of them deliberately do NOT reuse `common/icons/`: those live on a
 * 20-unit grid at 1.5 because they sit inside 18px nav links, and dropping one
 * in here leaves the row visibly mismatched in weight.
 */

/** Chat bubble. The three dots are what make it read as speech, not as a blob. */
const IconSupport = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.5 11.7c0 4.3-3.8 7.8-8.5 7.8a9.8 9.8 0 0 1-3.3-.6L4 21l1.5-4.1a7.5 7.5 0 0 1-2-5.2c0-4.3 3.8-7.8 8.5-7.8s8.5 3.5 8.5 7.8Z" />
    <path d="M9 11.7h.01M12.5 11.7h.01M16 11.7h.01" />
  </svg>
)

/**
 * Heart, standing in for "Alimento, Salud e Higiene". It replaces a paw print,
 * which said "pet" and nothing more: every item in this strip is about pets, so
 * the paw repeated what the whole row already says. A heart reads as care, which
 * is what that item actually claims. It also avoids colliding with the nav, where
 * the paw is already the icon for Perros.
 */
const IconCare = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.3 5.6a5 5 0 0 0-7.1 0L12 6.8l-1.2-1.2a5 5 0 1 0-7.1 7.1L12 21l8.3-8.3a5 5 0 0 0 0-7.1Z" />
  </svg>
)

/**
 * Shopfront. Three paths, no scalloped awning: the awning used to be four small
 * arcs hanging off its bottom edge, and at the 36px this strip renders them those
 * arcs close into a dark band, so this one glyph read as a smudge next to three
 * that stayed open. The trapezoid alone is what already separates a shopfront
 * from a plain box.
 */
const IconPickup = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3.4 9.6 5 4.2h14l1.6 5.4Z" />
    <path d="M4.6 9.6V20h14.8V9.6" />
    <path d="M9.6 20v-5.4h4.8V20" />
  </svg>
)

/** Shield with a tick. */
const IconSecure = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2.8 19 5.5v5.9c0 4.4-2.9 8.3-7 9.8-4.1-1.5-7-5.4-7-9.8V5.5l7-2.7Z" />
    <path d="m9 11.9 2.2 2.2 4.3-4.4" />
  </svg>
)

export default function TrustStrip() {
  /*
   * Four items, not five. The fifth was "Mi Cuenta", which the header already
   * offers twice on mobile (the account icon and the side menu). Four is also the
   * count that lets the row breathe on a 1280px page without wrapping a Spanish
   * title onto three lines.
   */
  const items: TrustItem[] = [
    {
      id: "support",
      title: t("home.trust.support.title"),
      description: t("home.trust.support.description"),
      icon: <IconSupport />,
    },
    {
      id: "catalogue",
      title: t("home.trust.catalogue.title"),
      description: t("home.trust.catalogue.description"),
      icon: <IconCare />,
    },
    {
      id: "pickup",
      title: t("home.trust.pickup.title"),
      description: t("home.trust.pickup.description"),
      icon: <IconPickup />,
    },
    {
      id: "secure",
      title: t("home.trust.secure.title"),
      description: t("home.trust.secure.description"),
      icon: <IconSecure />,
    },
  ]

  return (
    <section aria-label={t("benefits.title")} className="bg-[var(--surface-warm)] py-7 medium:py-9">
      <div className="site-container">
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-[1.5rem] border border-[#eadfce] bg-white p-5 shadow-[var(--shadow-card)] medium:grid-cols-4 medium:gap-x-6 medium:p-6">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 [&_svg]:h-5 [&_svg]:w-5">
                {item.icon}
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <h3 className="text-[13px] font-semibold leading-tight text-fg-base">
                  {item.title}
                </h3>
                <p className="text-[11px] leading-relaxed text-fg-muted">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}