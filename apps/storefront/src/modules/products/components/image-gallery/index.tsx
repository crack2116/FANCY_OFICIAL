"use client"

import { t } from "@lib/i18n/translations"
import { HttpTypes } from "@medusajs/types"
import { Container, clx } from "@modules/common/components/ui"
import { sanitizeProductImageUrl } from "@modules/products/components/thumbnail"
import Image from "next/image"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
  productTitle: string
  thumbnail?: string | null
}

type GalleryItem = {
  id: string
  url: string
}

const MIN_ZOOM = 1
const MAX_ZOOM = 3
const ZOOM_STEP = 0.5

/**
 * Product gallery with interactive hover-magnify zoom on desktop and a
 * full-screen zoomable lightbox modal for both desktop and mobile shoppers.
 */
const ImageGallery = ({
  images,
  productTitle,
  thumbnail,
}: ImageGalleryProps) => {
  const resolvedImages = useMemo<GalleryItem[]>(() => {
    const mapped = images
      .map((img) => ({
        id: img.id,
        url: sanitizeProductImageUrl(img.url) ?? img.url ?? "",
      }))
      .filter((img) => Boolean(img.url))

    if (mapped.length > 0) {
      return mapped
    }

    const fallbackUrl = sanitizeProductImageUrl(thumbnail) ?? thumbnail
    return fallbackUrl ? [{ id: "product-thumbnail", url: fallbackUrl }] : []
  }, [images, thumbnail])

  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [hoverOrigin, setHoverOrigin] = useState({ x: 50, y: 50 })

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [zoom, setZoom] = useState<number>(MIN_ZOOM)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)

  const dragStateRef = useRef<{
    active: boolean
    startX: number
    startY: number
    originPanX: number
    originPanY: number
    moved: boolean
  }>({
    active: false,
    startX: 0,
    startY: 0,
    originPanX: 0,
    originPanY: 0,
    moved: false,
  })

  const openLightbox = useCallback((index: number) => {
    setHoveredId(null)
    setLightboxIndex(index)
    setZoom(MIN_ZOOM)
    setPan({ x: 0, y: 0 })
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null)
    setZoom(MIN_ZOOM)
    setPan({ x: 0, y: 0 })
    setIsDragging(false)
  }, [])

  const handleZoomChange = useCallback((nextZoom: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom))
    setZoom(clamped)
    if (clamped <= MIN_ZOOM) {
      setPan({ x: 0, y: 0 })
    }
  }, [])

  const stepPrev = useCallback(() => {
    if (resolvedImages.length <= 1) return
    setLightboxIndex((prev) =>
      prev === null
        ? 0
        : (prev - 1 + resolvedImages.length) % resolvedImages.length
    )
    setZoom(MIN_ZOOM)
    setPan({ x: 0, y: 0 })
  }, [resolvedImages.length])

  const stepNext = useCallback(() => {
    if (resolvedImages.length <= 1) return
    setLightboxIndex((prev) =>
      prev === null ? 0 : (prev + 1) % resolvedImages.length
    )
    setZoom(MIN_ZOOM)
    setPan({ x: 0, y: 0 })
  }, [resolvedImages.length])

  useEffect(() => {
    if (lightboxIndex === null) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeLightbox()
      } else if (event.key === "ArrowLeft") {
        stepPrev()
      } else if (event.key === "ArrowRight") {
        stepNext()
      } else if (event.key === "+" || event.key === "=") {
        setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))
      } else if (event.key === "-") {
        setZoom((z) => {
          const next = Math.max(MIN_ZOOM, z - ZOOM_STEP)
          if (next <= MIN_ZOOM) setPan({ x: 0, y: 0 })
          return next
        })
      } else if (event.key === "0") {
        setZoom(MIN_ZOOM)
        setPan({ x: 0, y: 0 })
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [closeLightbox, lightboxIndex, stepNext, stepPrev])

  const activeLightboxImage =
    lightboxIndex !== null ? resolvedImages[lightboxIndex] : null

  return (
    <>
      <div className="relative flex items-start">
        <div className="flex flex-1 flex-col gap-y-4 small:mx-12">
          {resolvedImages.map((image, index) => {
            const isHovered = hoveredId === image.id
            const isExternal = image.url.startsWith("http")

            return (
              <Container
                key={image.id}
                id={image.id}
                className="group relative aspect-[29/34] w-full cursor-zoom-in overflow-hidden rounded-2xl border border-[#E7E5DF] bg-white shadow-xs"
                onClick={() => openLightbox(index)}
                onPointerMove={(event) => {
                  if (event.pointerType !== "mouse") {
                    return
                  }
                  const rect = event.currentTarget.getBoundingClientRect()
                  if (!rect.width || !rect.height) return
                  const x = Math.min(
                    100,
                    Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)
                  )
                  const y = Math.min(
                    100,
                    Math.max(0, ((event.clientY - rect.top) / rect.height) * 100)
                  )
                  setHoverOrigin({ x, y })
                  if (hoveredId !== image.id) {
                    setHoveredId(image.id)
                  }
                }}
                onPointerLeave={() => {
                  if (hoveredId === image.id) {
                    setHoveredId(null)
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    openLightbox(index)
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`${t("product.zoom.open")} — ${t(
                  "product.galleryImageAlt",
                  {
                    number: index + 1,
                    title: productTitle,
                  }
                )}`}
                data-testid="product-gallery-image"
              >
                <div
                  className="absolute inset-0 transition-transform duration-150 ease-out will-change-transform"
                  style={{
                    transform: isHovered ? "scale(2.15)" : "scale(1)",
                    transformOrigin: `${hoverOrigin.x}% ${hoverOrigin.y}%`,
                  }}
                >
                  <Image
                    src={image.url}
                    priority={index <= 2}
                    unoptimized={isExternal}
                    className="object-contain p-3 select-none"
                    alt={t("product.galleryImageAlt", {
                      number: index + 1,
                      title: productTitle,
                    })}
                    fill
                    sizes="(max-width: 576px) 320px, (max-width: 768px) 440px, (max-width: 992px) 520px, 800px"
                    draggable={false}
                  />
                </div>

                <span
                  className={clx(
                    "pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-[#E7E5DF] bg-white/90 px-3 py-1.5 text-xs font-medium text-[#0F352E] shadow-sm backdrop-blur-xs transition-opacity",
                    isHovered
                      ? "opacity-0"
                      : "opacity-90 group-hover:opacity-100"
                  )}
                  data-testid="image-zoom-trigger"
                >
                  <ZoomInIcon className="h-3.5 w-3.5 text-[#F36F21]" />
                  <span>{t("product.zoom.open")}</span>
                </span>
              </Container>
            )
          })}
        </div>
      </div>

      {activeLightboxImage && lightboxIndex !== null ? (
        <div
          className="fixed inset-0 z-[90] flex flex-col bg-black/85 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={productTitle}
          data-testid="image-zoom-modal"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeLightbox()
            }
          }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white sm:px-6">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{productTitle}</p>
              <p className="text-xs text-white/70">
                {lightboxIndex + 1} / {resolvedImages.length} ·{" "}
                {Math.round(zoom * 100)}%
              </p>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => handleZoomChange(zoom - ZOOM_STEP)}
                disabled={zoom <= MIN_ZOOM}
                aria-label={t("product.zoom.out")}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-base font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                data-testid="image-zoom-out"
              >
                -
              </button>

              <span className="min-w-[3.25rem] text-center text-xs font-medium tabular-nums text-white/90">
                {Math.round(zoom * 100)}%
              </span>

              <button
                type="button"
                onClick={() => handleZoomChange(zoom + ZOOM_STEP)}
                disabled={zoom >= MAX_ZOOM}
                aria-label={t("product.zoom.in")}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-base font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                data-testid="image-zoom-in"
              >
                +
              </button>

              {zoom > MIN_ZOOM ? (
                <button
                  type="button"
                  onClick={() => handleZoomChange(MIN_ZOOM)}
                  className="hidden h-9 items-center rounded-lg border border-white/20 bg-white/10 px-3 text-xs font-medium text-white transition hover:bg-white/20 sm:inline-flex"
                  data-testid="image-zoom-reset"
                >
                  {t("product.zoom.reset")}
                </button>
              ) : null}

              <button
                type="button"
                onClick={closeLightbox}
                aria-label={t("product.zoom.close")}
                className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                data-testid="image-zoom-close"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            className="relative flex flex-1 items-center justify-center overflow-hidden p-4 sm:p-8"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                closeLightbox()
              }
            }}
          >
            {resolvedImages.length > 1 ? (
              <button
                type="button"
                onClick={stepPrev}
                aria-label={t("product.zoom.prev")}
                className="absolute left-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white transition hover:bg-black/75 sm:left-6"
              >
                ‹
              </button>
            ) : null}

            <div
              className={clx(
                "relative flex h-[72vh] sm:h-[78vh] w-full max-w-4xl items-center justify-center overflow-hidden rounded-2xl bg-white p-4 shadow-2xl touch-none select-none",
                zoom > 1
                  ? isDragging
                    ? "cursor-grabbing"
                    : "cursor-grab"
                  : "cursor-zoom-in"
              )}
              onPointerDown={(event) => {
                if (zoom <= MIN_ZOOM) {
                  dragStateRef.current.active = false
                  dragStateRef.current.moved = false
                  return
                }
                event.currentTarget.setPointerCapture(event.pointerId)
                dragStateRef.current = {
                  active: true,
                  startX: event.clientX,
                  startY: event.clientY,
                  originPanX: pan.x,
                  originPanY: pan.y,
                  moved: false,
                }
                setIsDragging(true)
              }}
              onPointerMove={(event) => {
                const drag = dragStateRef.current
                if (!drag.active) return
                const dx = event.clientX - drag.startX
                const dy = event.clientY - drag.startY
                if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
                  drag.moved = true
                }
                const maxOffset = (zoom - 1) * 260
                setPan({
                  x: Math.min(maxOffset, Math.max(-maxOffset, drag.originPanX + dx)),
                  y: Math.min(maxOffset, Math.max(-maxOffset, drag.originPanY + dy)),
                })
              }}
              onPointerUp={(event) => {
                if (dragStateRef.current.active) {
                  try {
                    event.currentTarget.releasePointerCapture(event.pointerId)
                  } catch {
                    // ignore if not captured
                  }
                }
                dragStateRef.current.active = false
                setIsDragging(false)
              }}
              onClick={() => {
                if (dragStateRef.current.moved) {
                  dragStateRef.current.moved = false
                  return
                }
                if (zoom > MIN_ZOOM) {
                  handleZoomChange(MIN_ZOOM)
                } else {
                  handleZoomChange(2)
                }
              }}
              data-testid="image-zoom-stage"
            >
              <div
                className={clx(
                  "relative h-full w-full",
                  !isDragging && "transition-transform duration-150 ease-out"
                )}
                style={{
                  transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                }}
              >
                <Image
                  src={activeLightboxImage.url}
                  unoptimized={activeLightboxImage.url.startsWith("http")}
                  alt={t("product.galleryImageAlt", {
                    number: lightboxIndex + 1,
                    title: productTitle,
                  })}
                  fill
                  className="object-contain p-2 select-none"
                  sizes="(max-width: 768px) 95vw, 900px"
                  draggable={false}
                />
              </div>
            </div>

            {resolvedImages.length > 1 ? (
              <button
                type="button"
                onClick={stepNext}
                aria-label={t("product.zoom.next")}
                className="absolute right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white transition hover:bg-black/75 sm:right-6"
              >
                ›
              </button>
            ) : null}
          </div>

          {resolvedImages.length > 1 ? (
            <div className="flex items-center justify-center gap-2 border-t border-white/10 px-4 py-3">
              {resolvedImages.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => {
                    setLightboxIndex(idx)
                    setZoom(MIN_ZOOM)
                    setPan({ x: 0, y: 0 })
                  }}
                  aria-label={t("product.galleryThumbnail", {
                    number: idx + 1,
                    title: productTitle,
                  })}
                  className={clx(
                    "relative h-12 w-12 overflow-hidden rounded-lg border-2 bg-white transition",
                    idx === lightboxIndex
                      ? "border-[#F36F21]"
                      : "border-white/20 opacity-60 hover:opacity-100"
                  )}
                >
                  <Image
                    src={img.url}
                    unoptimized={img.url.startsWith("http")}
                    alt={img.id}
                    fill
                    className="object-contain p-1"
                    sizes="48px"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  )
}

function ZoomInIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
      <path d="M11 8v6" />
      <path d="M8 11h6" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  )
}

export default ImageGallery
