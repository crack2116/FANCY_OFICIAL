import { HttpTypes } from "@medusajs/types"

import {
  OFFERS_COLLECTION_HANDLE,
  mainNav,
  type NavItem,
} from "@lib/site-config"

export type ResolvedNavLink = {
  labelKey: NavItem["labelKey"]
  href: string
  /**
   * Carried through untouched from `mainNav`. It is what decides whether the
   * header draws a category icon, so the resolver — which is also what the
   * mobile side menu reads — has to pass it rather than drop it and force the
   * two menus to look the link up again.
   */
  icon: NavItem["icon"]
  /**
   * Submenu entries, or undefined when the entry has none. The header shows a
   * caret only when this is a NON-EMPTY array; see `NavItem.children`.
   */
  children: NavItem["children"]
}

/**
 * Turn `mainNav` into links that are guaranteed to exist.
 *
 * The header and the mobile side menu both render this, which is how the two used
 * to drift: each had its own copy of "no handle means /store", so an entry
 * without a category handle silently pointed at the unfiltered catalogue. That
 * fallback is gone — an entry either names something that really exists, or it is
 * dropped.
 *
 * Two kinds of real destination:
 *  - a category handle, kept only when that category exists in the taxonomy;
 *  - the `ofertas` COLLECTION, kept only when that collection exists. That is
 *    where "Ofertas" goes, and it cannot be a facet on the index's `on_sale_*`
 *    field: the index resolves prices with a currency context only and never sees
 *    the region-scoped price list that produces the real discount.
 */
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

  // `icon` and `children` are copied verbatim onto whatever survives, so an
  // entry keeps its icon whether it resolves through the category branch or the
  // offers branch.
  return mainNav.flatMap((item) => {
    if (item.handle) {
      return categoryHandles.has(item.handle)
        ? [
            {
              labelKey: item.labelKey,
              href: `/categories/${item.handle}`,
              icon: item.icon,
              children: item.children,
            },
          ]
        : []
    }

    if (item.labelKey === "nav.ofertas") {
      return offersExist
        ? [
            {
              labelKey: item.labelKey,
              href: `/collections/${OFFERS_COLLECTION_HANDLE}`,
              icon: item.icon,
              children: item.children,
            },
          ]
        : []
    }

    return []
  })
}