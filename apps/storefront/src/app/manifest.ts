import type { MetadataRoute } from "next"

/**
 * PWA manifest.
 *
 * Uses the storefront F monogram icon (`icon.svg` and `favicon.ico`) and
 * keeps the root manifest response clean instead of falling back to HTML.
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
    background_color: "#FFF8F0",
    theme_color: "#0E352E",
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
        sizes: "16x16 32x32 48x48",
        type: "image/x-icon",
      },
    ],
  }
}
