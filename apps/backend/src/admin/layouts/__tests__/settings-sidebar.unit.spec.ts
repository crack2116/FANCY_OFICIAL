import React, { Children } from "react"
import {
  filterGeneralSection,
  shouldOmitGeneralEntry,
} from "../../lib/settings-general-filter"

describe("settings-sidebar layout filters", () => {
  it("identifies regions and tax-regions entries by key, id or to prop", () => {
    const regionEntry = React.createElement(
      "div",
      {
        key: "core:settings-nav:/settings/regions",
        id: "settings-nav:/settings/regions",
      },
      React.createElement("a", { href: "/settings/regions" }, "Regiones")
    )
    const taxRegionEntry = React.createElement(
      "div",
      {
        key: "core:settings-nav:/settings/tax-regions",
        id: "settings-nav:/settings/tax-regions",
      },
      React.createElement("a", { href: "/settings/tax-regions" }, "Regiones Impositivas")
    )
    const storeEntry = React.createElement(
      "div",
      {
        key: "core:settings-nav:/settings/store",
        id: "settings-nav:/settings/store",
      },
      React.createElement("a", { href: "/settings/store" }, "Tienda")
    )

    expect(shouldOmitGeneralEntry(regionEntry)).toBe(true)
    expect(shouldOmitGeneralEntry(taxRegionEntry)).toBe(true)
    expect(shouldOmitGeneralEntry(storeEntry)).toBe(false)
  })

  it("filters out regions and tax-regions from general section children", () => {
    const entries = [
      React.createElement(
        "div",
        {
          key: "core:settings-nav:/settings/store",
          id: "settings-nav:/settings/store",
        },
        "Tienda"
      ),
      React.createElement(
        "div",
        {
          key: "core:settings-nav:/settings/users",
          id: "settings-nav:/settings/users",
        },
        "Usuarios"
      ),
      React.createElement(
        "div",
        {
          key: "core:settings-nav:/settings/regions",
          id: "settings-nav:/settings/regions",
        },
        "Regiones"
      ),
      React.createElement(
        "div",
        {
          key: "core:settings-nav:/settings/tax-regions",
          id: "settings-nav:/settings/tax-regions",
        },
        "Regiones Impositivas"
      ),
      React.createElement(
        "div",
        {
          key: "core:settings-nav:/settings/locations",
          id: "settings-nav:/settings/locations",
        },
        "Ubicaciones & Envío"
      ),
    ]

    const filtered = filterGeneralSection(entries)
    const count = Children.count(filtered)
    expect(count).toBe(3)

    const remainingKeys: string[] = []
    Children.forEach(filtered, (child) => {
      if (React.isValidElement(child) && child.key) {
        remainingKeys.push(String(child.key))
      }
    })

    expect(remainingKeys.some((k) => k.includes("regions"))).toBe(false)
    expect(remainingKeys.some((k) => k.includes("tax-regions"))).toBe(false)
    expect(remainingKeys.some((k) => k.includes("store"))).toBe(true)
    expect(remainingKeys.some((k) => k.includes("users"))).toBe(true)
    expect(remainingKeys.some((k) => k.includes("locations"))).toBe(true)
  })

  it("handles null and empty input gracefully", () => {
    expect(filterGeneralSection(null)).toBeNull()
    expect(filterGeneralSection(undefined)).toBeUndefined()
  })
})
