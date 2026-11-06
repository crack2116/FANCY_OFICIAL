import type { MetadataRoute } from "next"

/**
 * PWA manifest.
 *
 * Without this file `/manifest.webmanifest` was handled by the root
 * `[countryCode]` route, which returned the storefront HTML with a 200 status.
 * A browser asking for a manifest got a page, and a crawler got a soft 404.
 *
 * The icons are the existing paw favicon, not the official wordmark logo: the
 * manifest is exactly where a small, square, legible mark is required.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fancy Pets",
    short_name: "Fancy Pets",
    description:
      "Alimentos, salud, higiene y accesorios para el cuidado diario de tu mascota.",
    lang: "es-PE",
    dir: "ltr",
    start_url: "/pe",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FBF7F0",
    theme_color: "#00546C",
    categories: ["shopping", "pets"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/favicon.ico",
        sizes: "16x16 32x32",
        type: "image/x-icon",
      },
    ],
  }
}
