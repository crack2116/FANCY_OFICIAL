import { t } from "@lib/i18n/translations"
import { useMemo } from "react"

// Simulación de categorías del backend
function useCategories() {
  return useMemo(() => [
    { handle: "alimentos", label: "Alimentos" },
    { handle: "salud", label: "Salud" },
    { handle: "higiene", label: "Higiene" },
    { handle: "accesorios", label: "Accesorios" },
    { handle: "juguetes", label: "Juguetes" },
  ], [])
}

function useCollections() {
  return useMemo(() => ({
    collections: [
      { handle: "ofertas", title: "Ofertas" },
    ],
  }), [])
}

export const SiteMenu = ({
  regions,
  locales,
  currentLocale,
  categories,
  collections,
}: any) => {
  const navItems = useMemo(() => {
    const items: any[] = []
    categories?.forEach((cat) => {
      items.push({
        labelKey: `nav.${cat.handle}`,
        handle: cat.handle,
        icon: "paw",
      })
    })
    // Add offers
    if (collections?.collections?.length) {
      items.push({
        labelKey: "nav.ofertas",
        handle: null,
        icon: "percent",
      })
    }
    return items
  }, [categories, collections])

  return (
    <nav
      aria-label={t("nav.label")}
      className="h-full border-t border-[var(--border-subtle)]/70 bg-[var(--chrome-nav)]"
    >
      <ul className="site-container flex h-12 items-center gap-x-1 medium:gap-x-1.5">
        {navItems.map((item) => {
          const Icon = item.icon
            ? {
                paw: () => import("@modules/common/icons/paw").then((m) => m.Paw),
                bowl: () => import("@modules/common/icons/bowl").then((m) => m.Bowl),
                pulse: () => import("@modules/common/icons/pulse").then((m) => m.Pulse),
                cross: () => import("@modules/common/icons/cross").then((m) => m.Cross),
                droplet: () => import("@modules/common/icons/droplet").then((m) => m.Droplet),
                tag: () => import("@modules/common/icons/tag").then((m) => m.Tag),
                ball: () => import("@modules/common/icons/ball").then((m) => m.Ball),
                percent: () => import("@modules/common/icons/percent").then((m) => m.Percent),
              }[item.icon]()
            : null

          return (
            <li key={item.handle}>
              <a
                href={item.handle ? `/categories/${item.handle}` : "/collections/ofertas"}
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-fg-subtle transition-colors hover:bg-brand-100 hover:text-fg-base medium:px-3.5"
              >
                {Icon ? (
                  <Icon className="shrink-0" />
                ) : null}
                <span>{t(item.labelKey)}</span>
                {item.children?.length ? (
                  <svg
                    viewBox="0 0 12 12"
                    width="12"
                    height="12"
                    className="shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2.5 4.5 6 8l3.5-3.5" />
                  </svg>
                ) : null}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
