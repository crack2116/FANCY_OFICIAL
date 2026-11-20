"use client"

import { useEffect, useState, useCallback } from "react"
import { createPortal } from "react-dom"
import { clx } from "@modules/common/components/ui"
import { siteConfig } from "@lib/site-config"
import { t } from "@lib/i18n/translations"
import { FancyPetsLogo } from "@modules/common/components/fancy-pets-logo"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import Login from "@modules/account/components/login"
import Register from "@modules/account/components/register"

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  google_not_configured:
    "El acceso con Google no está disponible en este servidor. Usa tu correo y contraseña.",
  google_unavailable:
    "No pudimos conectar con Google en este momento. Inténtalo de nuevo o usa tu correo.",
  google_cancelled: "Cancelaste el inicio de sesión con Google.",
  google_failed:
    "No se pudo completar el acceso con Google. Inténtalo de nuevo o crea tu cuenta con correo.",
}

type Props = {
  isOpen: boolean
  onClose: () => void
  initialView?: LOGIN_VIEW
}

export default function AuthModal({
  isOpen,
  onClose,
  initialView = LOGIN_VIEW.SIGN_IN,
}: Props) {
  const [view, setView] = useState<LOGIN_VIEW>(initialView)
  const [mounted, setMounted] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync initial view and URL auth errors when opening
  useEffect(() => {
    if (isOpen) {
      setView(initialView)
      if (typeof window !== "undefined") {
        const search = new URLSearchParams(window.location.search)
        const errorCode = search.get("auth_error")
        setAuthError(
          errorCode
            ? AUTH_ERROR_MESSAGES[errorCode] || AUTH_ERROR_MESSAGES.google_failed
            : null
        )
      }
    }
  }, [isOpen, initialView])

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    },
    [onClose]
  )

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!isOpen) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3.5 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Floating Modal Card */}
      <div
        className="relative w-full max-w-[440px] my-auto bg-white rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.35)] border border-[#FFE8D6] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative corner watermark */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -bottom-6 w-28 h-28 opacity-[0.035] text-[#F36F21]"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 13.5c-2.4 0-4.5 1.8-4.5 4.5 0 1.9 1.4 3 3 3 1.2 0 1.5-.6 1.5-.6s.3.6 1.5.6c1.6 0 3-1.1 3-3 0-2.7-2.1-4.5-4.5-4.5zm-5.5-3c-1.4 0-2.5 1.6-2.5 3s1.1 2.5 2.5 2.5 2.5-1.1 2.5-2.5-1.1-3-2.5-3zm11 0c-1.4 0-2.5 1.6-2.5 3s1.1 2.5 2.5 2.5 2.5-1.1 2.5-2.5-1.1-3-2.5-3zm-8-5c-1.4 0-2.5 1.6-2.5 3s1.1 2.5 2.5 2.5 2.5-1.1 2.5-2.5-1.1-3-2.5-3zm5 0c-1.4 0-2.5 1.6-2.5 3s1.1 2.5 2.5 2.5 2.5-1.1 2.5-2.5-1.1-3-2.5-3z" />
          </svg>
        </div>

        {/* Modal Header */}
        <div className="bg-gradient-to-br from-[#FFF5EB] via-[#FFF9F3] to-[#FFF0E0] px-6 pt-6 pb-4 border-b border-[#FFE8D6]/80 text-center relative">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="absolute top-3.5 right-3.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 hover:bg-white hover:text-slate-800 transition-colors shadow-xs border border-slate-200/60 cursor-pointer"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <FancyPetsLogo className="h-9 w-auto mx-auto mb-1.5" title={siteConfig.name} />
          <h2 id="auth-modal-title" className="text-sm text-slate-600 font-medium">
            {view === LOGIN_VIEW.SIGN_IN
              ? "Inicia sesión para gestionar tus pedidos y favoritos"
              : "Crea tu cuenta y disfruta de envíos rápidos en Piura"}
          </h2>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 max-h-[75vh] overflow-y-auto">
          {authError ? (
            <div
              className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs sm:text-sm text-rose-700"
              role="alert"
              data-testid="auth-modal-error"
            >
              {authError}
            </div>
          ) : null}

          {/* Switcher Tab */}
          <div className="w-full grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 mb-5 shadow-inner">
            <button
              type="button"
              onClick={() => setView(LOGIN_VIEW.SIGN_IN)}
              className={clx(
                "py-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 text-center cursor-pointer",
                view === LOGIN_VIEW.SIGN_IN
                  ? "bg-white text-[#F36F21] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              {t("account.login.title")}
            </button>
            <button
              type="button"
              onClick={() => setView(LOGIN_VIEW.REGISTER)}
              className={clx(
                "py-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 text-center cursor-pointer",
                view === LOGIN_VIEW.REGISTER
                  ? "bg-white text-[#F36F21] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              {t("account.register.title")}
            </button>
          </div>

          {view === LOGIN_VIEW.SIGN_IN ? (
            <Login
              setCurrentView={setView}
              sessionExpired={false}
              onSuccess={onClose}
              showHeading={false}
            />
          ) : (
            <Register
              setCurrentView={setView}
              onSuccess={onClose}
              showHeading={false}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
