import React, { Suspense } from "react"

import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import { t } from "@lib/i18n/translations"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductTabs from "@modules/products/components/product-tabs"
import RelatedProducts from "@modules/products/components/related-products"
import ProductInfo from "@modules/products/templates/product-info"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"

import ProductActionsWrapper from "./product-actions-wrapper"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({
  product,
  region,
  countryCode,
  images,
}) => {
  if (!product || !product.id) {
    return notFound()
  }

  /*
   * No onboarding banner here. The upstream starter rendered a "your demo product
   * was created" panel on every product page, behind a cookie, in English and with
   * an emoji. It has no place in a shopper's path, so it is gone rather than
   * translated.
   *
   * The page is now two columns: gallery on the left, everything a shopper must
   * read or decide on the right. The previous three-column split put the title in
   * one column, the gallery in another and the buy box in a third, which made the
   * shopper's eye travel across the page to connect a product name to its price.
   */
  return (
    <div className="bg-[var(--surface-warm)]">
      <div
        className="site-container py-6 small:py-10"
        data-testid="product-container"
      >
        <nav
          aria-label={t("product.breadcrumb.label")}
          className="mb-6 flex min-w-0 items-center gap-1.5 text-xs text-fg-muted"
        >
          <LocalizedClientLink
            href="/"
            className="shrink-0 transition-colors hover:text-brand-700"
          >
            {t("product.breadcrumb.home")}
          </LocalizedClientLink>
          <span aria-hidden="true" className="text-[var(--border-strong)]">
            /
          </span>
          <LocalizedClientLink
            href="/store"
            className="shrink-0 transition-colors hover:text-brand-700"
          >
            {t("product.breadcrumb.store")}
          </LocalizedClientLink>
          <span aria-hidden="true" className="text-[var(--border-strong)]">
            /
          </span>
          <span className="truncate text-fg-subtle">{product.title}</span>
        </nav>

        <div className="grid gap-8 small:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] small:items-start small:gap-12 large:gap-16">
          <div className="small:sticky small:top-44">
            <ImageGallery images={images} productTitle={product.title} />
          </div>

          <div className="flex flex-col gap-8">
            <ProductInfo product={product} />

            <Suspense
              fallback={
                <ProductActions
                  disabled={true}
                  product={product}
                  region={region}
                />
              }
            >
              <ProductActionsWrapper id={product.id} region={region} />
            </Suspense>

            <ProductTabs product={product} />
          </div>
        </div>
      </div>

      <div
        className="site-container pb-16 pt-4 small:pb-24 small:pt-8"
        data-testid="related-products-container"
      >
        <Suspense fallback={<SkeletonRelatedProducts />}>
          <RelatedProducts product={product} countryCode={countryCode} />
        </Suspense>
      </div>
    </div>
  )
}

export default ProductTemplate
