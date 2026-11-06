import { getProductPrice } from "@lib/util/get-product-price"
import { getStockState } from "@lib/util/stock"
import { t } from "@lib/i18n/translations"
import { readProductPetData } from "@lib/pet-product"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import WishlistButton from "@modules/common/components/wishlist-button"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"

/**
 * Product card.
 *
 * The ONE product card in the project: `/store`, category pages, collection pages,
 * brand pages, search results and the related-products block all render this, so a
 * price, a stock badge or a brand name can never disagree between two listings.
 *
 * Renders only fields the backend actually returns. Rating and presentation are
 * deliberately absent: rating does not exist in the data model, and presentation
 * (`3 kg`, `M`) lives in the variants, not here. The quick-add button is deferred
 * until variant selection exists on the card.
 *
 * THE BRAND IS TEXT, NOT A LINK
 * -----------------------------
 * The whole card is already one link to the product, and an anchor inside an
 * anchor is invalid HTML that screen readers and middle-click both get wrong. So
 * the brand reads as plain text here and the link to its page lives on the
 * product detail, which has room for a properly labelled one.
 *
 * The row is OMITTED ENTIRELY when the product has no brand — no empty line, no
 * placeholder dash. Five of eighteen products carry no brand, and a reserved slot
 * on every card would imply the data is missing rather than absent.
 *
 * Price and stock come from the Store API variants, through `getProductPrice` and
 * the shared `getStockState` in `@lib/util/stock`. They deliberately do NOT come
 * from the search index: the index resolves prices with a currency context only,
 * so it cannot see a region-scoped price list and would report `on_sale: false`
 * for a product the API genuinely discounts.
 *
 * THE WISHLIST HEART IS A SIBLING OF THE LINK
 * -------------------------------------------
 * The card is one anchor. A button inside an anchor is invalid HTML, and the
 * click would navigate to the product before the toggle ever ran — so the heart
 * is positioned against this wrapper instead of living in the link. The plate
 * overlays the image and the click stops at the button, which is a stronger
 * guarantee than a `pointer-events` dance inside the anchor would be.
 */
export default function ProductPreview({
  product,
  isFeatured,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region?: HttpTypes.StoreRegion
}) {
  const { cheapestPrice } = getProductPrice({ product })
  const stockState = getStockState(product)
  const collectionTitle = product.collection?.title
  const brand = readProductPetData(product).brand
  const discount =
  cheapestPrice?.price_type === "sale" && cheapestPrice.percentage_diff
    ? `-${cheapestPrice.percentage_diff}%`
    : null

  /* Badges sit over the image, as on the live store, where the percentage is a
     corner badge rather than another line of text under the price.
     `percentage_diff` comes from the backend, so the card cannot claim a
     discount the price block does not also show. */
  const variants = colorVariants(product)

  return (
    <div className="relative h-full">
      <LocalizedClientLink
        href={`/products/${product.handle}`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#eadfce] bg-white shadow-[var(--shadow-card)] outline-none transition-all duration-200 hover:-translate-y-1 hover:border-[#e0cfb6] hover:shadow-[var(--shadow-lift)] focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        data-testid="product-wrapper"
      >
        <div className="relative overflow-hidden">
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            size="full"
            isFeatured={isFeatured}
            alt={product.title}
          />

          {/* Badges sit over the image, as on the live store. */}
          <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
            {discount ? (
              <span className="rounded-full bg-accent-700 px-2.5 py-1 text-[10px] font-bold leading-none text-white shadow-sm">
                {discount}
              </span>
            ) : null}
            {stockState === "out" ? (
              <span className="rounded-full bg-fg-base/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                {t("product.outOfStock")}
              </span>
            ) : null}
            {stockState === "low" ? (
              <span className="rounded-full border border-brand-200 bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-700 shadow-sm">
                {t("product.lowStock")}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1.5 px-4 pb-4 pt-3">
          {brand ? (
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-700"
              data-testid="product-brand"
            >
              {brand.name}
            </p>
          ) : null}

          {collectionTitle ? (
            <p className="text-[10px] uppercase tracking-[0.14em] text-fg-muted">
              {collectionTitle}
            </p>
          ) : null}

          <h3
            className="line-clamp-2 text-[15px] font-semibold leading-snug text-fg-base transition-colors group-hover:text-brand-700"
            data-testid="product-title"
          >
            {product.title}
          </h3>

          <div className="mt-1 flex items-baseline gap-2">
            {cheapestPrice ? <PreviewPrice price={cheapestPrice} /> : null}
          </div>

          {/* Colour swatches */}
          {variants.length > 0 ? (
            <p className="mt-0.5 truncate text-[11px] font-medium text-fg-subtle">
              {variants.map((variant) => variant.name).join(" ")}
            </p>
          ) : null}

          <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-[11px] font-semibold text-brand-700">
            {t("product.viewProduct")}
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            >
              <path d="M4 10h11M11 5l5 5-5 5" />
            </svg>
          </span>
        </div>
      </LocalizedClientLink>

      {/* Top-right, over the photo */}
      <WishlistButton
        handle={product.handle}
        title={product.title}
        className="absolute right-2.5 top-2.5 z-10"
      />
    </div>
  )
}

/**
 * Distinct option values of type `color`, read off the real variants.
 *
 * A colour lives in an OPTION VALUE, not on the variant, so the swatch line is
 * derived by collecting every variant's color option value and removing
 * duplicates. Products with no colour option return an empty list and the line
 * is omitted, which is why this is not a fixed-height placeholder.
 */
function colorVariants(product: HttpTypes.StoreProduct): { name: string }[] {
  const seen = new Set<string>()

  for (const variant of product.variants ?? []) {
    for (const option of variant.options ?? []) {
      if (option.id !== "color") {
        continue
      }

      const name = option.value?.trim()

      if (name) {
        seen.add(name)
      }
    }
  }

  return Array.from(seen).slice(0, 6).map((name) => ({ name }))
}