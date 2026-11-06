import { resolve } from "node:path"

const THEME_COLOR = "#0b1930"
const APP_NAME = "FancyPets Admin"
const ATTRIBUTE_PATTERN = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g

const attributes = (tag: string): Record<string, string> =>
  Object.fromEntries(
    [...tag.matchAll(ATTRIBUTE_PATTERN)].map((match) => [
      match[1].toLowerCase(),
      match[2] ?? match[3] ?? match[4],
    ])
  )

const escapeAttribute = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")

const adminBasePath = (base?: string) => {
  if (!base || base === "." || base === "./") {
    return "/app/"
  }
  const path = new URL(base, "https://admin.invalid").pathname
  return `${path.replace(/\/+$/, "")}/`
}

/** HTML-only install metadata; intentionally no worker or private-data caching. */
export const transformAdminPwaHtml = (html: string, base?: string): string => {
  const path = adminBasePath(base)
  const replacedNames = new Set([
    "theme-color",
    "mobile-web-app-capable",
    "apple-mobile-web-app-capable",
    "apple-mobile-web-app-title",
    "apple-mobile-web-app-status-bar-style",
  ])
  let viewport: string | undefined

  const cleanHtml = html
    .replace(/<meta\b[^>]*>\s*/gi, (tag) => {
      const attrs = attributes(tag)
      const name = attrs.name?.toLowerCase()
      if (name === "viewport") {
        viewport ??= attrs.content
        return ""
      }
      return name && replacedNames.has(name) ? "" : tag
    })
    .replace(/<link\b[^>]*>\s*/gi, (tag) => {
      const rel = attributes(tag).rel?.toLowerCase()
      return rel === "manifest" || rel === "apple-touch-icon" ? "" : tag
    })

  const viewportContent = (viewport || "width=device-width, initial-scale=1")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => !/^viewport-fit\s*=/i.test(part))
    .concat("viewport-fit=cover")
    .join(", ")
  const metadata = [
    `<meta name="viewport" content="${escapeAttribute(viewportContent)}">`,
    `<link rel="manifest" href="${path}manifest-v1.webmanifest">`,
    `<link rel="apple-touch-icon" href="${path}icons/apple-touch-icon-v1.png">`,
    `<meta name="theme-color" content="${THEME_COLOR}">`,
    '<meta name="mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
    `<meta name="apple-mobile-web-app-title" content="${APP_NAME}">`,
  ].join("\n")

  let titledHtml = cleanHtml
  if (/<title\b/i.test(cleanHtml)) {
    titledHtml = cleanHtml.replace(/<title>[\s\S]*?<\/title>/i, `<title>${APP_NAME}</title>`)
  } else {
    const headIndex = cleanHtml.toLowerCase().lastIndexOf("</head>")
    if (headIndex !== -1) {
      titledHtml = `${cleanHtml.slice(0, headIndex)}<title>${APP_NAME}</title>${cleanHtml.slice(headIndex)}`
    }
  }

  const headIndex = titledHtml.toLowerCase().lastIndexOf("</head>")
  return headIndex !== -1
    ? `${titledHtml.slice(0, headIndex)}${metadata}\n${titledHtml.slice(headIndex)}`
    : titledHtml
}

/** Medusa merges these overrides; do not return its existing plugin array again. */
export const createAdminPwaConfig = (
  baseConfig: { base?: string },
  backendRoot = process.cwd()
) => ({
  publicDir: resolve(backendRoot, "src/admin/public"),
  plugins: [{
    name: "fancy-pets-admin-pwa",
    transformIndexHtml: {
      order: "post" as const,
      handler: (html: string) => transformAdminPwaHtml(html, baseConfig.base),
    },
  }],
})
