"use client"

import { useState, useEffect } from "react"
import { copy } from "./admin-copy"
import { Button, clx, Section } from "@medusajs/ui"
import { useEffect } from "react"

// Copiar la estructura del BrandingForm original pero con datos ficticios
// y sin conexión al backend real

const COLOR_FIELDS = [
  { key: "primary", label: copy("brandFieldPrimary"), hint: copy("brandFieldPrimaryHint"), token: "--brand-500" },
  { key: "primaryDark", label: copy("brandFieldPrimaryDark"), hint: copy("brandFieldPrimaryDarkHint"), token: "--brand-700" },
  { key: "accent", label: copy("brandFieldAccent"), hint: copy("brandFieldAccentHint"), token: "--accent-500" },
  { key: "surface", label: copy("brandFieldSurface"), hint: copy("brandFieldSurfaceHint"), token: "--surface" },
  { key: "text", label: copy("brandFieldText"), hint: copy("brandFieldTextHint"), token: "--fg-base" },
]

const DEFAULT_COLORS = {
  primary: "#f99c32",
  primaryDark: "#bd6212",
  accent: "#f24534",
  surface: "#ffffff",
  text: "#12211f",
}

export function BrandingEditor() {
  const [colors, setColors] = useState<Record<string, string>>({...DEFAULT_COLORS})
  const [logoUrl, setLogoUrl] = useState<string>("")
  const [tagline, setTagline] = useState<string>("")
  const [announcementEnabled, setAnnouncementEnabled] = useState(true)
  const [announcement, setAnnouncement] = useState<string[]>([
    "Bienvenido a nuestra tienda",
    "Envíos a todo el Perú",
  ])
  const [pending, setPending] = useState<Record<string, string[]>>({ category: [], hero: [] })
  const [artworkErrors, setArtworkErrors] = useState<Record<string, Record<string, string>>>({ category: {}, hero: {} })

  // Datos ficticios - simular carga inicial
  useEffect(() => {
    setColors({...DEFAULT_COLORS})
    setLogoUrl("")
    setTagline("Marca y apariencia")
    setAnnouncementEnabled(true)
    setAnnouncement([
      "Bienvenido a nuestra tienda",
      "Envíos a todo el Perú",
    ])
  }, [])

  const handleColorChange = (key: string, value: string) => {
    setColors(prev => ({...prev, [key]: value}))
  }

  const handleLogoChange = (url: string) => {
    setLogoUrl(url)
  }

  const handleTaglineChange = (value: string) => {
    setTagline(value)
  }

  const handleAnnouncementToggle = (enabled: boolean) => {
    setAnnouncementEnabled(enabled)
    if (!enabled) {
      setAnnouncement([])
    }
  }

  const handleAnnouncementAdd = (msg: string) => {
    setAnnouncement(prev => [...prev.filter(m => m !== ""), msg].filter((m, i) => i < 5))
  }

  const handleAnnouncementRemove = (index: number) => {
    setAnnouncement(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold text-ui-fg-base mb-6">
        {copy("brandingHeading")}
      </h2>

      {/* Colores */}
      <Section>
        <h3 className="text-ui-fg-base text-sm font-medium mb-4">
          {copy("brandingColorsHeading")}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {COLOR_FIELDS.map((field) => (
            <div key={field.key} className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium w-20">{field.label}</span>
                <span>{colors[field.key] || field.token}</span>
              </div>
              <input
                type="color"
                value={colors[field.key] || "#f99c32"}
                onChange={(e) => handleColorChange(field.key, e.target.value)}
                className="w-24 h-8 rounded-md"
                aria-label={field.hint}
              />
              <p className="text-xs text-ui-fg-muted">{field.hint}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Logo y tagline */}
      <Section>
        <h3 className="text-ui-fg-base text-sm font-medium mb-4">
          {copy("brandingLogoHeading")}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-ui-fg-muted mb-2">
              {copy("brandingLogoHint")}
            </label>
            <input
              type="text"
              value={logoUrl || ""}
              onChange={(e) => handleLogoChange(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-md border border-[var(--border-subtle)] px-3 py-2 text-sm"
              aria-label={copy("brandingLogoHint")}
            />
          </div>
          <div>
            <label className="block text-xs text-ui-fg-muted mb-2">
              {copy("brandingTaglineHeading")}
            </label>
            <input
              type="text"
              value={tagline || ""}
              onChange={(e) => handleTaglineChange(e.target.value)}
              placeholder="Frase corta..."
              className="w-full rounded-md border border-[var(--border-subtle)] px-3 py-2 text-sm"
              aria-label={copy("brandingTaglineHint")}
            />
          </div>
        </div>
      </Section>

      {/* Banner de anuncio */}
      <Section>
        <h3 className="text-ui-fg-base text-sm font-medium mb-4">
          {copy("brandingAnnouncementHeading")}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-ui-fg-muted mb-2">
              {copy("brandingAnnouncementEnabled")}
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none rounded-md px-3 py-1.5 border border-[var(--border-subtle)] hover:bg-brand-100 transition-colors">
              <input
                type="checkbox"
                checked={announcementEnabled}
                onChange={(e) => handleAnnouncementToggle(e.target.checked)}
                className="rounded border-none cursor-pointer"
              />
              <span>Mostrar barra de anuncio</span>
            </label>
          </div>
          <div>
            <p className="text-xs text-ui-fg-muted mb-2">
              {copy("brandingAnnouncementMessageLabel")}
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {announcement.map((msg, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <input
                    type="text"
                    value={msg}
                    onChange={(e) => handleAnnouncementAdd(e.target.value)}
                    className="flex-1 rounded-md border border-[var(--border-subtle)] px-2 py-1 text-sm"
                    aria-label="Mensaje"
                  />
                  <button
                    type="button"
                    onClick={() => handleAnnouncementRemove(idx)}
                    className="px-2 py-1 text-xs rounded border border-red-500 text-red-500 hover:text-white transition-colors"
                  >
                    {t("remove")}
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => handleAnnouncementAdd("")}
                className="w-full py-2 rounded-md border border-[var(--border-subtle)] text-xs text-brand-400 hover:bg-brand-100 transition-colors"
                aria-label="Agregar mensaje"
              >
                + Agregar mensaje
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* Artwork grid - categorías y hero */}
      <Section>
        <h3 className="text-ui-fg-base text-sm font-medium mb-4">
          {copy("brandingArtworkHeading")}
        </h3>
        <p className="text-xs text-ui-fg-muted mb-4">
          {copy("brandingArtworkSubtitle")}
        </p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {/* Category artwork slots */}
          <div>
            <h4 className="text-ui-fg-subtle text-xs uppercase tracking-wider">Categorías</h4>
            <p className="text-ui-fg-muted text-xs mt-1">
              Hasta 24 imágenes de categoría
            </p>
          </div>
          {/* Hero artwork slots */}
          <div>
            <h4 className="text-ui-fg-subtle text-xs uppercase tracking-wider">Portada (Hero)</h4>
            <p className="text-ui-fg-muted text-xs mt-1">
              2 diapositivas: cuidado-diario, bienestar-diario
            </p>
          </div>
        </div>
      </Section>

      {/* Botones de acción */}
      <div className="flex gap-3 pt-6 border-t border-[var(--border-subtle)]">
        <button
          type="button"
          className="flex-1 py-2.5 px-4 rounded-md border border-[var(--border-subtle)] hover:bg-brand-50 hover:text-brand-600 transition-colors"
        >
          {copy("brandingSave")}
        </button>
        <button
          type="button"
          className="flex-1 py-2.5 px-4 rounded-md border border-[var(--border-subtle)] bg-white text-brand-600 hover:bg-brand-100 transition-colors"
        >
          {copy("brandingSaving")}
        </button>
        <button
          type="button"
          className="flex-1 py-2.5 px-4 rounded-md border border-[var(--border-subtle)] opacity-50 cursor-not-allowed"
        >
          {copy("brandingSaved")}
        </button>
      </div>
    </section>
  )
}
