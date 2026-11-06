import {
  useState,
  useEffect,
} from "react"

import Nav from "./nav"
import BrandingEditor from "./branding"
import DeliveryTracker from "./delivery"

// Datos ficticios para el prototipo (nada toca la base real)
const SIDEBAR_ITEMS = [
  { key: "dashboard", label: "Inicio", href: "/dashboard", icon: "home" },
  { key: "sales", label: "Ventas", href: "/sales", icon: "shopping-cart" },
  { key: "products", label: "Productos", href: "/products", icon: "box" },
  { key: "inventory", label: "Inventario", href: "/inventory", icon: "paw" },
  { key: "customers", label: "Clientes", href: "/customers", icon: "user" },
  { key: "delivery", label: "Delivery", href: "/delivery", icon: "truck" },
  { key: "promotions", label: "Promociones", href: "/promotions", icon: "tag" },
  { key: "settings", label: "Configuración", href: "/settings", icon: "settings" },
]

// Tarjetas del dashboard (ficticias)
const DashboardCards = [
  { id: "orders", title: "Pedidos hoy", value: "12", subtitle: "12 pedidos nuevos", icon: "shopping-cart", tone: "positive" },
  { id: "revenue", title: "Ingresos", value: "S/ 2,850", subtitle: "Ventas confirmadas", icon: "dollar-sign", tone: "positive" },
  { id: "stock", title: "Stock bajo", value: "4", subtitle: "4 productos con alerta", icon: "alert-circle", tone: "warning" },
  { id: "active", title: "Clientes activos", value: "87", subtitle: "Húspedes registrados", icon: "users", tone: "info" },
]

// Datos ficticios de delivery
const FictitiousDeliveries = [
  {
    id: "#ORD-20240115-001",
    status: "preparation",
    customer: "María S.",
    address: "Av. José Gálvez 123, Lima",
    pet: "Perro Golden",
    eta: "Hoy 3:00 PM",
  },
  {
    id: "#ORD-20240115-002",
    status: "in-transit",
    customer: "Carlos R.",
    address: "Ur. los Olivos 45, Arequipa",
    pet: "Gato siames",
    eta: "Hoy 5:00 PM",
  },
  {
    id: "#ORD-20240115-003",
    status: "delivered",
    customer: "Ana M.",
    address: "Jr. Miguel Grau 88, Trujillo",
    pet: "Pez beta",
    eta: "Ayer 4:00 PM",
  },
]

export default function Dashboard() {
  const [showDelivery, setShowDelivery] = useState(false)

  return (
    <div className="min-h-screen bg-[var(--surface-warm)]">
      {/* Header / Top bar */}
      <header className="border-b border-[var(--border-subtle)] bg-[var(--chrome-header)] text-[var(--chrome-header-ink)]">
        <div className="site-container h-[90px] flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <LocalizedLink href="/" className="flex items-center gap-2">
              <svg
                viewBox="0 0 216 62"
                width={40}
                height={40}
                className="shrink-0"
                role="img"
                aria-label="Fancy Pets"
              >
                <text
                  x="6"
                  y="38"
                  fontFamily="'Fredoka', 'Quicksand', 'Arial Rounded MT Bold', system-ui, sans-serif"
                  fontSize="24"
                  fontWeight="700"
                >
                  <tspan fill="#F24534">F</tspan>
                  <tspan fill="#F99C32">a</tspan>
                  <tspan fill="#3B82F6">n</tspan>
                  <tspan fill="#06B6D4">c</tspan>
                  <tspan fill="#8B5CF6">y</tspan>
                  <tspan fill="transparent"> </tspan>
                  <tspan fill="#EC4899">P</tspan>
                  <tspan fill="#F24534">e</tspan>
                  <tspan fill="#F97316">t</tspan>
                  <tspan fill="#F24534">s</tspan>
                </text>
                <line x1="12" y1="52" x2="62" y2="52" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" />
                <text
                  x="70"
                  y="55"
                  fontFamily="'Montserrat', 'Futura', 'Century Gothic', system-ui, sans-serif"
                  fontSize="8"
                  fontWeight="700"
                  letterSpacing="3.5"
                  fill="#D97706"
                >
                  PET SHOP
                </text>
                <line x1="154" y1="52" x2="204" y2="52" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              <span className="font-semibold text-base">{t("nav.home")}</span>
            </LocalizedLink>

            <nav className="hidden md:flex items-center gap-6">
              {SIDEBAR_ITEMS.map((item) => (
                <a
                  key={item.key}
                  href={item.href}
                  className="text-sm font-medium transition-colors hover:text-brand-600"
                >
                  {t(item.label)}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-ui-fg-muted">
              {new Date().toLocaleDateString("es-PE", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              className="shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="20 6 9 12 20 18" />
            </svg>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-[var(--chrome-nav)] border-r border-[var(--border-subtle)] flex flex-col">
          <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
            <h2 className="text-ui-fg-muted text-sm uppercase tracking-wider">
              {t("nav.label")}
            </h2>
          </div>
          <nav className="flex-1 flex flex-col gap-1">
            {SIDEBAR_ITEMS.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className="flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-brand-100 hover:text-brand-600 [&.active]:bg-brand-100 [&.active]:text-brand-600"
                style={item.key === "dashboard" ? { opacity: 1, fontWeight: 500 } : { opacity: 0.7 }}
              >
                <svg
                  className="shrink-0 w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {item.icon}
                </svg>
                <span>{t(item.label)}</span>
              </a>
            ))}
          </nav>
        </aside>

        {/* Content area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {showDelivery ? <DeliveryTracker deliveries={FictitiousDeliveries} onClose={() => setShowDelivery(false)} /> : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Dashboard cards */}
            <div className="space-y-4">
              {DashboardCards.map((card) => (
                <div
                  key={card.id}
                  className={`p-4 rounded-lg border ... bg-white shadow-sm transition-colors hover:${card.tone === "positive" ? "border-brand-200" : card.tone === "warning" ? "border-warning-200" : "border-fg-subtle"}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <svg
                        className="shrink-0 w-5 h-5 text-[var(--ui-fg-subtle)]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {card.icon === "shopping-cart" && (
                          <path d="M2 2l20 8l-8 18l-8-18L2 2zm16 8l-8 13l-8-13l8-13l8 13z" />
                        }}
                        {card.icon === "paw" && (
                          <path d="M12 1a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h7a3 3 0 0 0 3-3V4a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h2a3 3 0 0 1 3 3v7a3 3 0 0 0 3 3h7a3 3 0 0 0 3-3v-7a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v7a3 3 0 0 0 3 3h7a3 3 0 0 0 3-3V4a3 3 0 0 0-3-3H2zm3 6V4h6v6h-6zM7 18V4h2v6H7zM7 8h2v6H7V8zM16 18v6h2v-6h-2v-8h2V16h-2z" />
                        }}
                        {card.icon === "dollar-sign" && (
                          <path d="M12 2v20M16.5 4.5l2.121 2.121-1.414 1.414L20.83 9.5l-3.938 3.938-1.414-1.414L16.5 4.5zm7.684 5.243-3.938 3.938-1.414-1.414L12 15.5l5.857-5.857-1.414 1.414L19.684 19.243z" />
                        }}
                        {card.icon === "alert-circle" && (
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                        }}
                        {card.icon === "users" && (
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 4.37A4 4 0 0 0 12.68 2.12l-3.44 3.44" />
                          <line x1="18" y1="15" x2="18" y2="21" />
                          <line x1="12" y1="15" x2="18" y2="15" />
                        )}
                      </svg>
                      <span>{card.icon === "users" ? "87" : card.value}</span>
                    </div>
                    <span className="text-xs text-ui-fg-muted">{card.subtitle}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Secondary info area */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-[var(--border-subtle)]">
              <h2 className="text-ui-fg-base text-sm font-medium mb-4">
                {t("dashboard.quick-actions")}
              </h2>
              <div className="space-y-3">
                <button className="w-full py-2.5 px-4 rounded-md border border-[var(--border-subtle)] hover:bg-brand-50 hover:text-brand-600 transition-colors">
                  {t("dashboard.new-order")}
                </button>
                <button className="w-full py-2.5 px-4 rounded-md border border-[var(--border-subtle)] hover:bg-brand-50 hover:text-brand-600 transition-colors">
                  {t("dashboard.view-reports")}
                </button>
                <button className="w-full py-2.5 px-4 rounded-md border border-[var(--border-subtle)] hover:bg-brand-50 hover-text-brand-600 transition-colors">
                  {t("dashboard.export-data")}
                </button>
              </div>
            </div>
          </div>

          {/* Delivery section when toggled */}
          <div id="delivery-section" className="mt-8 p-6 rounded-lg border border-[var(--border-subtle)] bg-white shadow-sm">
            <h2 className="text-ui-fg-base text-lg font-medium mb-4">
              {t("delivery.title")}
            </h2>
            <div className="space-y-4">
              {FictitiousDeliveries.map((del) => (
                <div key={del.id} className="p-4 rounded-md border bg-[var(--surface-cream)]">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{del.customer}</span>
                      <span className="text-xs text-ui-fg-muted">{del.pet}</span>
                    </div>
                    <span className="text-sm font-medium {del.status === "delivered" ? "text-positive" : del.status === "in-transit" ? "text-info" : "text-warning"}">
                      {t(`order.status.fulfillment.${del.status}`)}
                    </span>
                  </div>
                  <p className="text-sm text-ui-fg-subtle mt-1">
                    {del.address} {del.eta ? `· ETA: ${del.eta}` : ""}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button className="py-1 px-2 text-xs rounded border border-[var(--border-subtle)] hover:bg-brand-50 transition-colors">
                      {t("delivery.detail")}
                    </button>
                    <button className="py-1 px-2 text-xs rounded border border-[var(--border-subtle)] hover:bg-brand-50 transition-colors">
                      {t("delivery.update")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Bottom bar / announcement */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--chrome-section)] text-[var(--chrome-ink-muted)] py-3">
        <div className="site-container text-center text-xs">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </div>
      </footer>
    </div>
  )
}
