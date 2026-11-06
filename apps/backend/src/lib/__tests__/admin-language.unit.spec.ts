import {
  createAdminLanguagePlugin,
  transformAdminLanguageHtml,
} from "../admin-language"

const page =
  '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>FancyPets Admin</title></head><body><div id="medusa"></div></body></html>'

describe("admin default language", () => {
  it("returns exactly one plugin named fancy-pets-admin-language", () => {
    const plugins = createAdminLanguagePlugin()
    expect(plugins).toHaveLength(1)
    expect(plugins[0].name).toBe("fancy-pets-admin-language")
    expect(plugins[0].transformIndexHtml.order).toBe("post")
    expect(typeof plugins[0].transformIndexHtml.handler).toBe("function")
  })

  it("seeds the official lng key only when no preference exists", () => {
    const html = transformAdminLanguageHtml(page)
    expect(html).toContain('document.cookie.split("; ")')
    expect(html).toContain('part.indexOf("lng=") === 0')
    expect(html).toContain('window.localStorage.getItem("lng")')
    expect(html).toContain('window.localStorage.setItem("lng", "es")')
    expect(html).toContain('document.cookie = "lng=es; path=/; max-age=31536000; SameSite=Lax"')
    expect(html).toContain("if (!hasCookie && !stored)")
  })

  it("injects before </head> and preserves the dashboard body", () => {
    const html = transformAdminLanguageHtml(page)
    expect(html.indexOf("<script>")).toBeLessThan(html.indexOf("</head>"))
    expect(html).toContain('<body><div id="medusa"></div></body>')
  })

  it("falls back to injecting before <body> when </head> is absent", () => {
    const headlessPage = '<html><body><div id="medusa"></div></body></html>'
    const html = transformAdminLanguageHtml(headlessPage)
    expect(html.indexOf("<script>")).toBeLessThan(html.indexOf("<body>"))
  })
})
