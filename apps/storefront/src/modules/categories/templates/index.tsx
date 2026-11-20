import { notFound } from "next/navigation"

import {
  categoryHasChildren,
  categoryHasProducts,
} from "@lib/util/home-merchandising"
import { t } from "@lib/i18n/translations"
import { HttpTypes } from "@medusajs/types"
import EmptyState from "@modules/common/components/empty-state"
import InteractiveLink from "@modules/common/components/interactive-link"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import type { CatalogueSearchParams } from "@modules/store/templates/catalogue-results"
import CatalogueResults from "@modules/store/templates/catalogue-results"

export default function CategoryTemplate({
  category,
  countryCode,
  searchParams,
}: {
  category: HttpTypes.StoreProductCategory
  countryCode: string
  searchParams: CatalogueSearchParams
}) {
  if (!category || !countryCode) {
    notFound()
  }

  const parents: HttpTypes.StoreProductCategory[] = []

  const collectParents = (current: HttpTypes.StoreProductCategory) => {
    if (current.parent_category) {
      parents.unshift(current.parent_category)
      collectParents(current.parent_category)
    }
  }

  collectParents(category)

  const hasProducts = categoryHasProducts(category)
  const hasChildren = categoryHasChildren(category)

  return (
    <div className="site-container py-8" data-testid="category-container">
      <header className="mb-8">
        {parents.length ? (
          <nav
            aria-label={t("nav.categories")}
            className="mb-2 flex flex-wrap items-center gap-x-2 text-sm text-fg-subtle"
          >
            {parents.map((parent) => (
              <LocalizedClientLink
                key={parent.id}
                href={`/categories/${parent.handle}`}
                className="transition-colors hover:text-brand-700"
                data-testid="category-breadcrumb-link"
              >
                {parent.name}
              </LocalizedClientLink>
            ))}
          </nav>
        ) : null}

        <h1
          className="text-3xl font-semibold tracking-tight text-fg-base"
          data-testid="category-page-title"
        >
          {category.name}
        </h1>

        {category.description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-subtle">
            {category.description}
          </p>
        ) : null}
      </header>

      {hasChildren ? (
        <div className="mb-8">
          <h2 className="mb-3 text-base font-semibold text-fg-base">
            {t("nav.categories")}
          </h2>
          <ul className="grid grid-cols-1 gap-2 xsmall:grid-cols-2">
            {category.category_children?.map((child) => (
              <li key={child.id}>
                <InteractiveLink href={`/categories/${child.handle}`}>
                  {child.name}
                </InteractiveLink>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasProducts ? (
        <CatalogueResults
          countryCode={countryCode}
          searchParams={searchParams}
          scopeIds={category.products?.map((product) => product.id)}
          hideCategoryFilter
        />
      ) : (
        /*
         * An empty category is a normal state, not a failure. `farmacia` is
         * intentionally empty, and taxonomy parents such as `perros` have no
         * products of their own, so both get an explanation instead of a blank
         * grid — and no filter controls, because there is nothing to refine.
         */
        <EmptyState
          title={t("empty.state.title")}
          description={t(
            hasChildren
              ? "empty.state.categoryWithChildren"
              : "empty.state.category"
          )}
          actionLabel={hasChildren ? undefined : t("empty.state.browseStore")}
          actionHref={hasChildren ? undefined : "/store"}
          data-testid="category-empty"
        />
      )}
    </div>
  )
}