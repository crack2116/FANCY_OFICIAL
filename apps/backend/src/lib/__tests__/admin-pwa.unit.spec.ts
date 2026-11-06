import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const backendRoot = resolve(__dirname, "../../..")
const publicDir = resolve(backendRoot, "src/admin/public")
const config = (base?: string) =>
  require("../admin-pwa").createAdminPwaConfig({ base }, backendRoot)
const transform = (html: string, base?: string): string =>
  config(base).plugins[0].transformIndexHtml.handler(html)
const page = '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Medusa</title></head><body><div id="medusa"></div></body></html>'

describe("admin PWA metadata", () => {
  it("returns only custom public assets and one additional plugin", () => {
    const result = config()
    expect(result.publicDir).toBe(publicDir)
    expect(Object.keys(result).sort()).toEqual(["plugins", "publicDir"])
    expect(result.plugins).toHaveLength(1)
  })

  it("adds persistent installation metadata without changing the app body", () => {
    const html = transform(page)
    expect(html).toContain('href="/app/manifest-v1.webmanifest"')
    expect(html).toContain('href="/app/icons/apple-touch-icon-v1.png"')
    expect(html).toContain('name="theme-color" content="#0b1930"')
    expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"')
    expect(html).toContain('name="apple-mobile-web-app-title" content="FancyPets Admin"')
    expect(html).toContain('<title>FancyPets Admin</title>')
    expect(html).toContain('<body><div id="medusa"></div></body>')
    expect(html).not.toMatch(/serviceWorker|caches\.|localStorage|<script/i)
  })

  it("keeps exactly one zoom-friendly viewport and supports safe areas", () => {
    const html = transform(page)
    expect(html.match(/name="viewport"/g)).toHaveLength(1)
    expect(html).toContain("width=device-width, initial-scale=1, viewport-fit=cover")
    expect(html).not.toContain("maximum-scale")
    expect(transform(html)).toBe(html)
  })

  it("normalizes duplicate, reordered and unquoted viewport tags", () => {
    const html = transform('<html><head><meta content="width=device-width, viewport-fit=contain" name=viewport><meta name="viewport" content="initial-scale=2"></head></html>')
    expect(html.match(/name="viewport"/g)).toHaveLength(1)
    expect(html).toContain("width=device-width, viewport-fit=cover")
    expect(html).not.toContain("viewport-fit=contain")
  })

  it.each(["/control", "/control/", "https://example.test/control/"])(
    "uses the passed admin base %s",
    (base) => {
      expect(transform(page, base)).toContain('href="/control/manifest-v1.webmanifest"')
      expect(transform(page, base)).toContain('href="/control/icons/apple-touch-icon-v1.png"')
    }
  )

  it("supports an explicit root admin base", () => {
    expect(transform(page, "/")).toContain('href="/manifest-v1.webmanifest"')
  })

  it("adds an app title when the Medusa entry has no title tag", () => {
    expect(transform('<html><head></head><body></body></html>'))
      .toContain('<title>FancyPets Admin</title>')
  })
})

describe("admin PWA public assets", () => {
  it("defines a stable online-only app identity for default and custom paths", () => {
    const manifest = JSON.parse(readFileSync(resolve(publicDir, "manifest-v1.webmanifest"), "utf8"))
    expect(manifest.name).toBe("FancyPets Admin")
    expect(manifest.display).toBe("standalone")
    expect(manifest.lang).toBe("es")
    expect(manifest.orientation).toBeUndefined()
    for (const base of ["/app/", "/control/"]) {
      for (const key of ["id", "scope", "start_url"]) {
        expect(new URL(manifest[key], `https://example.test${base}manifest-v1.webmanifest`).pathname).toBe(base)
      }
    }
    expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(["192x192", "512x512", "512x512"])
    expect(manifest.icons[2].purpose).toBe("maskable")
    expect(manifest.icons[0].purpose).toBe("any")
  })

  it.each([
    ["icon-192-v1.png", 192],
    ["icon-512-v1.png", 512],
    ["icon-maskable-512-v1.png", 512],
    ["apple-touch-icon-v1.png", 180],
  ])("ships an opaque %s PNG at %ipx", (fileName, size) => {
    const png = readFileSync(resolve(publicDir, "icons", fileName))
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a")
    expect(png.subarray(12, 16).toString()).toBe("IHDR")
    expect(png.readUInt32BE(16)).toBe(size)
    expect(png.readUInt32BE(20)).toBe(size)
    expect(png[25]).toBe(2)
  })
})
