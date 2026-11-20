import { t } from "@lib/i18n/translations"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export type TickerVariant =
  | "welcome"
  | "shipping"
  | "promo"
  | "payment"
  | "catalog"
  | "health"
  | "custom"

export type TickerItem = {
  id: string
  variant: TickerVariant
  lead: string
  detail?: string
  linkLabel?: string
  href?: string
}

const DEFAULT_WELCOME = "Bienvenido a nuestra tienda"
const DEFAULT_SHIPPING = "Envíos en Piura"

const TICKER_ICON_META: Record<
  TickerVariant,
  { src: string; sizeClass: string; px: number }
> = {
  welcome: {
    src: "/icons/ticker/welcome.png",
    sizeClass: "h-7 w-7",
    px: 28,
  },
  shipping: {
    src: "/icons/ticker/shipping.png",
    sizeClass: "h-[30px] w-[30px]",
    px: 30,
  },
  promo: {
    src: "/icons/ticker/promo.png",
    sizeClass: "h-7 w-7",
    px: 28,
  },
  payment: {
    src: "/icons/ticker/payment.png",
    sizeClass: "h-7 w-7",
    px: 28,
  },
  catalog: {
    src: "/icons/ticker/catalog.png",
    sizeClass: "h-7 w-7",
    px: 28,
  },
  health: {
    src: "/icons/ticker/health.png",
    sizeClass: "h-7 w-7",
    px: 28,
  },
  custom: {
    src: "/icons/ticker/custom.png",
    sizeClass: "h-7 w-7",
    px: 28,
  },
}

function buildTickerItems(messages: string[]): TickerItem[] {
  const cleaned = messages
    .map((entry) =>
      entry.trim().replace(/(?:a|en)\s+todo\s+el\s+Per[uú]/gi, "en Piura")
    )
    .filter(Boolean)

  const primary = cleaned[0] || DEFAULT_WELCOME
  const secondary = cleaned[1] || DEFAULT_SHIPPING
  const extras = cleaned.slice(2)

  return [
    {
      id: "welcome",
      variant: "welcome",
      lead: primary,
      detail: "Fancy Pets Perú",
    },
    {
      id: "shipping",
      variant: "shipping",
      lead: secondary,
      detail:
        secondary.toLowerCase() === DEFAULT_SHIPPING.toLowerCase()
          ? "Piura, Castilla y Veintiséis de Octubre"
          : undefined,
    },
    {
      id: "promo-offers",
      variant: "promo",
      lead: "Liquidación en alimentos y accesorios",
      linkLabel: "Ver ofertas",
      href: "/collections/ofertas",
    },
    ...extras.map((message, index) => ({
      id: `custom-${index}`,
      variant: "custom" as const,
      lead: message,
    })),
    {
      id: "payments",
      variant: "payment",
      lead: "Paga con Yape, Plin, transferencia o tarjeta",
      href: "/store",
    },
    {
      id: "categories",
      variant: "catalog",
      lead: "Todo para perros y gatos",
      detail: "Alimentos, snacks y juguetes",
      href: "/categories/perros",
    },
    {
      id: "health-care",
      variant: "health",
      lead: "Farmacia, higiene y marcas originales",
      detail: "Recojo en tienda",
      href: "/categories/salud",
    },
  ]
}

function TickerIcon({ variant }: { variant: TickerVariant }) {
  const meta = TICKER_ICON_META[variant] ?? TICKER_ICON_META.custom

  return (
    <img
      src={meta.src}
      alt=""
      width={meta.px}
      height={meta.px}
      loading="eager"
      decoding="sync"
      aria-hidden="true"
      className={`${meta.sizeClass} shrink-0 select-none object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]`}
    />
  )
}

function TickerItemContent({ item }: { item: TickerItem }) {
  return (
    <>
      <TickerIcon variant={item.variant} />
      <span className="text-[13px] font-medium tracking-wide text-white">
        {item.lead}
      </span>
      {item.detail ? (
        <span className="text-[13px] font-normal text-white/75">
          · {item.detail}
        </span>
      ) : null}
      {item.linkLabel ? (
        <span className="inline-flex items-center gap-1 border-b border-[#F36F21] pb-px text-[13px] font-semibold text-[#FDBA74] transition-colors group-hover/item:text-white">
          <span>{item.linkLabel}</span>
          <span aria-hidden="true">&rarr;</span>
        </span>
      ) : null}
    </>
  )
}

function TickerTrackGroup({
  items,
  isDuplicate = false,
}: {
  items: TickerItem[]
  isDuplicate?: boolean
}) {
  return (
    <div
      className="flex shrink-0 items-center"
      aria-hidden={isDuplicate ? "true" : undefined}
    >
      {items.map((item) => (
        <div key={item.id} className="flex shrink-0 items-center pl-6">
          {item.href ? (
            <LocalizedClientLink
              href={item.href}
              tabIndex={isDuplicate ? -1 : undefined}
              className="group/item inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap py-1 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:underline"
            >
              <TickerItemContent item={item} />
            </LocalizedClientLink>
          ) : (
            <div className="inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap py-1">
              <TickerItemContent item={item} />
            </div>
          )}
          <span
            aria-hidden="true"
            className="ml-7 mr-1 h-4 w-px shrink-0 bg-white/25"
          />
        </div>
      ))}
    </div>
  )
}

export default function AnnouncementTicker({
  messages,
}: {
  messages: string[]
}) {
  const items = buildTickerItems(messages)

  return (
    <div
      className="announcement-bar relative border-b-2 border-[#F36F21] bg-[#0E352E] text-white"
      role="region"
      aria-label={t("announcement.label")}
    >
      <div className="relative flex h-12 w-full items-center">
        {/* Full-bleed continuous marquee viewport */}
        <div
          className="announcement-marquee-viewport min-w-0 flex-1 overflow-hidden"
          data-testid="announcement-marquee"
        >
          <div className="announcement-marquee-track items-center">
            <TickerTrackGroup items={items} />
            <TickerTrackGroup items={items} isDuplicate />
          </div>
        </div>

        {/* Clean desktop right dock for original flat social brand icons */}
        <div
          className="announcement-social-dock pointer-events-auto absolute right-0 top-0 z-10 hidden h-full items-center gap-2.5 small:flex"
          aria-label="Redes sociales"
        >
          <span
            className="inline-flex h-[22px] w-[22px] items-center justify-center transition-transform hover:scale-105"
            title="Facebook"
          >
            <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
              <circle cx="12" cy="12" r="12" fill="#1877F2" />
              <path
                d="M16.671 15.469 17.203 12h-3.328V9.75c0-.949.465-1.875 1.957-1.875h1.515V4.922s-1.375-.234-2.688-.234c-2.742 0-4.535 1.664-4.535 4.672V12H7.078v3.469h3.046v8.384a12.14 12.14 0 0 0 3.75 0v-8.384h2.797Z"
                fill="#FFFFFF"
              />
            </svg>
          </span>
          <span
            className="inline-flex h-[22px] w-[22px] items-center justify-center transition-transform hover:scale-105"
            title="Instagram"
          >
            <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
              <defs>
                <radialGradient id="ig-brand-grad" cx="30%" cy="107%" r="150%">
                  <stop offset="0%" stopColor="#FDF497" />
                  <stop offset="5%" stopColor="#FDF497" />
                  <stop offset="45%" stopColor="#FD5949" />
                  <stop offset="60%" stopColor="#D6249F" />
                  <stop offset="90%" stopColor="#285AEB" />
                </radialGradient>
              </defs>
              <rect width="24" height="24" rx="6" fill="url(#ig-brand-grad)" />
              <rect
                x="4.5"
                y="4.5"
                width="15"
                height="15"
                rx="4.2"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="1.9"
              />
              <circle
                cx="12"
                cy="12"
                r="3.6"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="1.9"
              />
              <circle cx="16.4" cy="7.6" r="1.1" fill="#FFFFFF" />
            </svg>
          </span>
          <span
            className="inline-flex h-[22px] w-[22px] items-center justify-center transition-transform hover:scale-105"
            title="TikTok"
          >
            <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
              <rect
                x="0.5"
                y="0.5"
                width="23"
                height="23"
                rx="5.5"
                fill="#010101"
                stroke="rgba(255,255,255,0.22)"
                strokeWidth="1"
              />
              <path
                d="M15.6 5.2h-2.1v8.1a2.6 2.6 0 1 1-1.8-2.5V8.6a4.8 4.8 0 1 0 3.9 4.7V9.1c1 .7 2.2 1.1 3.5 1.1V8.1c-1.7-.1-3.1-1.3-3.5-2.9Z"
                fill="#25F4EE"
                transform="translate(-0.7, -0.5)"
              />
              <path
                d="M15.6 5.2h-2.1v8.1a2.6 2.6 0 1 1-1.8-2.5V8.6a4.8 4.8 0 1 0 3.9 4.7V9.1c1 .7 2.2 1.1 3.5 1.1V8.1c-1.7-.1-3.1-1.3-3.5-2.9Z"
                fill="#FE2C55"
                transform="translate(0.7, 0.5)"
              />
              <path
                d="M15.6 5.2h-2.1v8.1a2.6 2.6 0 1 1-1.8-2.5V8.6a4.8 4.8 0 1 0 3.9 4.7V9.1c1 .7 2.2 1.1 3.5 1.1V8.1c-1.7-.1-3.1-1.3-3.5-2.9Z"
                fill="#FFFFFF"
              />
            </svg>
          </span>
          <span
            className="inline-flex h-5 w-[26px] items-center justify-center transition-transform hover:scale-105"
            title="YouTube"
          >
            <svg viewBox="0 0 24 18" className="h-[19px] w-[26px]" aria-hidden="true">
              <path
                d="M23.5 2.8A3 3 0 0 0 21.4.7C19.5.2 12 .2 12 .2s-7.5 0-9.4.5A3 3 0 0 0 .5 2.8 31.2 31.2 0 0 0 0 9a31.2 31.2 0 0 0 .5 6.2 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.2 31.2 0 0 0 24 9a31.2 31.2 0 0 0-.5-6.2Z"
                fill="#FF0000"
              />
              <path d="M9.6 12.7 15.9 9 9.6 5.3v7.4Z" fill="#FFFFFF" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  )
}
