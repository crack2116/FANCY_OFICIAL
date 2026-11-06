import {
  createAdminUserMenuPlugin,
  transformAdminUserMenuHtml,
} from "../admin-user-menu"

const page =
  '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>FancyPets Admin</title></head><body><div id="medusa"></div></body></html>'

describe("admin user menu customization", () => {
  it("returns exactly one plugin named fancy-pets-admin-user-menu", () => {
    const plugins = createAdminUserMenuPlugin()
    expect(plugins).toHaveLength(1)
    expect(plugins[0].name).toBe("fancy-pets-admin-user-menu")
    expect(plugins[0].transformIndexHtml.order).toBe("post")
    expect(typeof plugins[0].transformIndexHtml.handler).toBe("function")
  })

  it("injects scoped style and script before </head>", () => {
    const html = transformAdminUserMenuHtml(page)
    expect(html).toContain("docs.medusajs.com")
    expect(html).toContain("medusajs.com/changelog")
    expect(html).toContain("display: none !important")
    expect(html).toContain("MutationObserver")
    expect(html).toContain("</head>")
    expect(html.indexOf("<style>")).toBeLessThan(html.indexOf("</head>"))
    expect(html.indexOf("<script>")).toBeLessThan(html.indexOf("</head>"))
  })

  it("targets documentation, changelog, and redundant separator in CSS", () => {
    const html = transformAdminUserMenuHtml(page)
    expect(html).toContain('a[href*="docs.medusajs.com"]')
    expect(html).toContain('a[href*="medusajs.com/changelog"]')
    expect(html).toContain('a[href*="medusajs.com/changelog"] + [role="separator"]')
  })

  it("falls back to injecting before <body> when </head> is absent", () => {
    const headlessPage = '<html><body><div id="medusa"></div></body></html>'
    const html = transformAdminUserMenuHtml(headlessPage)
    expect(html).toContain("docs.medusajs.com")
    expect(html.indexOf("<style>")).toBeLessThan(html.indexOf("<body>"))
  })
})
