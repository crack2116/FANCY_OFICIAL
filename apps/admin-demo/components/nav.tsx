import { Inter } from "next/font/google"
import { t } from "@lib/i18n/translations"
import { FancyPetsLogo } from "@modules/common/components/fancy-pets-logo"
import { SiteMenu } from "./site-menu"

// Datos ficticios para el prototipo
const FICTIONAL_CATEGORIES = [
  { handle: "alimentos", label: "Alimentos" },
  { handle: "salud", label: "Salud" },
  { handle: "higiene", label: "Higiene" },
  { handle: "accesorios", label: "Accesorios" },
  { handle: "juguetes", label: "Juguetes" },
]

export default function Nav() {
  return (
    <nav className="border-t border-[var(--border-subtle)]/70 bg-[var(--chrome-nav)]">
      <div className="site-container h-12 items-center gap-x-1 medium:gap-x-1.5">
        <ul className="flex h-12 items-center gap-x-1 medium:gap-x-1.5">
          {FICTIONAL_CATEGORIES.map((cat) => (
            <li key={cat.handle}>
              <a
                href={`/categories/${cat.handle}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-fg-subtle transition-colors hover:bg-brand-100 hover:text-fg-base medium:px-3.5"
              >
                <span className="shrink-0" />
                <span>{t(cat.label)}</span>
              </a>
            </li>
          ))}
          <li>
            <a
              href="/collections/ofertas"
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand-400 px-4 text-[11px] font-bold uppercase tracking-wide text-[#1f1b16] shadow-sm transition-colors hover:bg-brand-300"
            >
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent-600" />
              {t("nav.ofertas")}
            </a>
          </li>
        </ul>
      </div>
    </nav>
  )
}
