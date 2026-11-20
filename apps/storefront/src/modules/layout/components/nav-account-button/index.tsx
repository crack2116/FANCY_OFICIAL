"use client"

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react"
import { useParams, usePathname } from "next/navigation"
import { ArrowRightOnRectangle } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { signout } from "@lib/data/customer"
import { t } from "@lib/i18n/translations"
import {
  getWishlistServerSnapshot,
  getWishlistSnapshot,
  hydrateWishlist,
  subscribeWishlist,
} from "@lib/wishlist"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"
import Heart from "@modules/common/icons/heart"
import MapPin from "@modules/common/icons/map-pin"
import Package from "@modules/common/icons/package"
import User from "@modules/common/icons/user"
import AuthModal from "@modules/account/components/auth-modal"

type Props = {
  customer: HttpTypes.StoreCustomer | null
}

function getInitials(customer: HttpTypes.StoreCustomer): string {
  const first = customer.first_name?.trim().charAt(0) ?? ""
  const last = customer.last_name?.trim().charAt(0) ?? ""
  const combined = `${first}${last}`.toUpperCase()
  if (combined) {
    return combined
  }
  return (customer.email?.trim().charAt(0) || "F").toUpperCase()
}

export default function NavAccountButton({ customer }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoverOpenedAtRef = useRef<number>(0)
  const pathname = usePathname()
  const { countryCode } = useParams() as { countryCode?: string }

  const wishlistHandles = useSyncExternalStore(
    subscribeWishlist,
    getWishlistSnapshot,
    getWishlistServerSnapshot
  )

  useEffect(() => {
    hydrateWishlist()
  }, [])

  // Close submenu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Listen for ?login=true query param on load or navigation
  useEffect(() => {
    if (typeof window !== "undefined") {
      const search = new URLSearchParams(window.location.search)
      if (search.get("login") === "true" && !customer) {
        setModalOpen(true)
      }
    }
  }, [customer])

  // Listen for custom event to open auth modal from anywhere
  useEffect(() => {
    const handleOpen = () => {
      if (!customer) {
        setModalOpen(true)
      }
    }
    window.addEventListener("open-auth-modal", handleOpen)
    return () => window.removeEventListener("open-auth-modal", handleOpen)
  }, [customer])

  // Close on outside click or Escape
  useEffect(() => {
    if (!menuOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [menuOpen])

  const clearCloseTimer = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }

  const handleMouseEnter = () => {
    clearCloseTimer()
    if (!menuOpen) {
      hoverOpenedAtRef.current = Date.now()
      setMenuOpen(true)
    }
  }

  const handleToggleMenu = () => {
    if (Date.now() - hoverOpenedAtRef.current < 450) {
      setMenuOpen(true)
      return
    }
    setMenuOpen((prev) => !prev)
  }

  const handleMouseLeave = () => {
    clearCloseTimer()
    closeTimeoutRef.current = setTimeout(() => {
      setMenuOpen(false)
    }, 150)
  }

  const handleClose = useCallback(() => {
    setModalOpen(false)
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      if (url.searchParams.has("login") || url.searchParams.has("auth_error")) {
        url.searchParams.delete("login")
        url.searchParams.delete("auth_error")
        window.history.replaceState({}, "", url.pathname + url.search)
      }
    }
  }, [])

  const handleSignOut = async () => {
    if (signingOut) {
      return
    }
    setSigningOut(true)
    setMenuOpen(false)
    await signout(countryCode || "pe")
  }

  const label = customer?.first_name
    ? `Hola, ${customer.first_name}`
    : t("header.account")

  const buttonClasses =
    "flex h-10 w-10 items-center justify-center rounded-full text-[#1A1A1A] transition-colors hover:bg-slate-100 xsmall:w-auto xsmall:gap-2 xsmall:px-3 text-[13.5px] font-medium cursor-pointer"

  if (customer) {
    const fullName =
      [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
      t("account.title")
    const initials = getInitials(customer)
    const favoritesCount = wishlistHandles.length

    return (
      <div
        ref={containerRef}
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          type="button"
          onClick={handleToggleMenu}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={label}
          data-testid="nav-account-link"
          className="flex h-10 items-center gap-2 rounded-full border border-transparent px-2 text-[13.5px] font-semibold text-[#0F352E] transition-colors hover:border-[#FFE0C4] hover:bg-[#FFF5EB] xsmall:px-2.5 cursor-pointer"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F36F21] text-[11px] font-bold text-white shadow-2xs">
            {initials}
          </span>
          <span className="hidden medium:inline truncate max-w-[140px]">
            {label}
          </span>
          <ChevronDown
            size="14"
            className={`hidden xsmall:inline-block shrink-0 text-slate-500 transition-transform duration-150 ${
              menuOpen ? "rotate-180 text-[#F36F21]" : ""
            }`}
          />
        </button>

        {menuOpen ? (
          <div
            role="menu"
            aria-label={t("account.menu.label")}
            data-testid="nav-account-menu"
            className="absolute right-0 top-[calc(100%+8px)] z-[80] w-64 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_18px_45px_rgba(15,53,46,0.14)]"
          >
            <div className="border-b border-slate-100 bg-gradient-to-r from-[#FFF8F1] to-[#FFFDF9] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F36F21] text-xs font-bold text-white">
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#0F352E]">
                    {fullName}
                  </p>
                  {customer.email ? (
                    <p className="truncate text-xs text-slate-500">
                      {customer.email}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="p-1.5">
              <LocalizedClientLink
                href="/account"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                data-testid="nav-menu-overview"
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-[#FFF5EB] hover:text-[#D85A0E]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#0F352E]">
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 9.5 10 3.5l7 6V16.5a1 1 0 0 1-1 1h-4v-4.5H8v4.5H4a1 1 0 0 1-1-1V9.5Z"
                    />
                  </svg>
                </span>
                <span>{t("account.menu.overview")}</span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/account/profile"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                data-testid="nav-menu-profile"
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-[#FFF5EB] hover:text-[#D85A0E]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#0F352E]">
                  <User size="16" />
                </span>
                <span>{t("account.nav.profile")}</span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/account/orders"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                data-testid="nav-menu-orders"
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-[#FFF5EB] hover:text-[#D85A0E]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#0F352E]">
                  <Package size="16" />
                </span>
                <span>{t("account.nav.orders")}</span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/account/addresses"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                data-testid="nav-menu-addresses"
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-[#FFF5EB] hover:text-[#D85A0E]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#0F352E]">
                  <MapPin size="16" />
                </span>
                <span>{t("account.nav.addresses")}</span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/account/favorites"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                data-testid="nav-menu-favorites"
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-[#FFF5EB] hover:text-[#D85A0E]"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#0F352E]">
                    <Heart size="16" />
                  </span>
                  <span>{t("account.nav.favorites")}</span>
                </span>
                {favoritesCount > 0 ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FFF0E4] px-1.5 text-[11px] font-bold text-[#D85A0E]">
                    {favoritesCount}
                  </span>
                ) : null}
              </LocalizedClientLink>
            </div>

            <div className="border-t border-slate-100 p-1.5">
              <button
                type="button"
                role="menuitem"
                disabled={signingOut}
                onClick={handleSignOut}
                data-testid="nav-account-logout"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60 cursor-pointer"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <ArrowRightOnRectangle className="h-4 w-4" />
                </span>
                <span>{t("account.nav.logout")}</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={buttonClasses}
        data-testid="nav-account-link"
        aria-label={label}
      >
        <User size="20" />
        <span className="hidden font-medium medium:inline truncate max-w-[120px]">
          {label}
        </span>
      </button>

      <AuthModal isOpen={modalOpen} onClose={handleClose} />
    </>
  )
}
