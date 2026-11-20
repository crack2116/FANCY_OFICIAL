import { HttpTypes } from "@medusajs/types"

import {
  OFFERS_COLLECTION_HANDLE,
  mainNav,
  type NavItem,
} from "@lib/site-config"

export type ResolvedNavLink = {
  labelKey: NavItem["labelKey"]
  href: string
  icon: NavItem["icon"]
  children: NavItem["children"]
}

export function resolveNavLinks(
  categories: HttpTypes.StoreProductCategory[],
  collections: HttpTypes.StoreCollection[]
): ResolvedNavLink[] {
  const categoryHandles = new Set(
    categories
      .filter((category) => !category.parent_category)
      .map((category) => category.handle)
  )

  const offersExist = collections.some(
    (collection) => collection.handle === OFFERS_COLLECTION_HANDLE
  )

  return mainNav.flatMap((item) => {
    if (item.handle) {
      return [
        {
          labelKey: item.labelKey,
          href: categoryHandles.has(item.handle)
            ? `/categories/${item.handle}`
            : "/store",
          icon: item.icon,
          children: item.children,
        },
      ]
    }

    if (item.labelKey === "nav.ofertas") {
      return [
        {
          labelKey: item.labelKey,
          href: offersExist
            ? `/collections/${OFFERS_COLLECTION_HANDLE}`
            : "/store",
          icon: item.icon,
          children: item.children,
        },
      ]
    }

    return []
  })
}
