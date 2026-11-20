import { getProductPrice } from "@lib/util/get-product-price"
import { getStockState } from "@lib/util/stock"
import { t } from "@lib/i18n/translations"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import WishlistButton from "@modules/common/components/wishlist-button"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"

export default function ProductPreview({
  product,
  isFeatured,
  categoryLabel,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region?: HttpTypes.StoreRegion
  categoryLabel?: string
}) {
  const { cheapestPrice } = getProductPrice({ product })
  const stockState = getStockState(product)
  const meta = (product.metadata ?? {}) as Record<string, unknown>

  const titleLower = (product.title ?? "").toLowerCase()
  const isCatBed =
    titleLower.includes("cama") ||
    titleLower.includes("collar") ||
    titleLower.includes("correa")

  const badgeType =
    typeof meta.badge === "string"
      ? meta.badge
      : isCatBed
        ? "offer"
        : "bestseller"

  const badgeLabel =
    typeof meta.badge_label === "string"
      ? meta.badge_label
      : badgeType === "offer"
        ? "Oferta"
        : "Más vendido"

  const resolvedCategoryLabel =
    (typeof meta.category_label === "string" && meta.category_label) ||
    categoryLabel ||
    (isCatBed ? "Accesorios" : "Alimentos")

  const rating =
    typeof meta.rating === "string" || typeof meta.rating === "number"
      ? String(meta.rating)
      : isCatBed
        ? "4.7"
        : "4.8"

  const reviewsCount =
    typeof meta.reviews_count === "string" || typeof meta.reviews_count === "number"
      ? String(meta.reviews_count)
      : isCatBed
        ? "856"
        : "1.2k"

  const compareAtPrice =
    typeof meta.compare_at_price === "string"
      ? meta.compare_at_price
      : isCatBed
        ? "S/ 69.90"
        : "S/ 34.90"

  return (
    <div className="relative h-full">
      <LocalizedClientLink
        href={`/products/${product.handle}`}
        className="group flex h-full flex-col justify-between overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white p-4 shadow-[0_10px_28px_rgba(15,53,46,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,53,46,0.11)] small:p-5"
        data-testid="product-wrapper"
      >
        <div>
          {/* Top badge row */}
          <div className="flex min-h-[28px] items-center justify-between pr-8">
            {badgeType === "offer" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#7C5CFC] to-[#9B7BFF] px-3 py-1 text-[11px] font-bold leading-none text-white shadow-2xs">
                <svg
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="h-3 w-3 shrink-0 text-[#FBBF24]"
                  aria-hidden="true"
                >
                  <path d="m8 1.3 1.95 4.05 4.46.62-3.23 3.11.78 4.44L8 11.4l-3.96 2.12.78-4.44L1.59 5.97l4.46-.62L8 1.3Z" />
                </svg>
                <span>{badgeLabel}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#22A06B] to-[#34B37E] px-3 py-1 text-[11px] font-bold leading-none text-white shadow-2xs">
                <svg
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="h-3 w-3 shrink-0 text-[#FBBF24]"
                  aria-hidden="true"
                >
                  <path d="M4.5 2h7v1.5H14v2c0 1.65-1.1 3-2.55 3.35A3.5 3.5 0 0 1 8.75 11v1.5H11V14H5v-1.5h2.25V11a3.5 3.5 0 0 1-2.7-2.15C3.1 8.5 2 7.15 2 5.5v-2h2.5V2Zm-1 3v.5c0 .85.45 1.55 1.15 1.85V5H3.5Zm9 0h-1.15v2.35c.7-.3 1.15-1 1.15-1.85V5Z" />
                </svg>
                <span>{badgeLabel}</span>
              </span>
            )}

            {stockState === "out" ? (
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                {t("product.outOfStock")}
              </span>
            ) : null}
          </div>

          {/* Square product photo */}
          <div className="relative mx-auto my-1.5 aspect-square w-full max-w-[212px] overflow-hidden rounded-2xl bg-white">
            <Thumbnail
              thumbnail={product.thumbnail}
              images={product.images}
              size="square"
              isFeatured={isFeatured}
              alt={product.title}
              className="h-full w-full"
            />
          </div>

          {/* Category label, title, and rating */}
          <div className="mt-1">
            <p className="text-xs font-bold text-[#E06D1A]">
              {resolvedCategoryLabel}
            </p>

            <h3
              className="mt-0.5 line-clamp-2 text-[15px] font-extrabold leading-snug text-[#0E352E] transition-colors group-hover:text-[#F36F21] small:text-base"
              data-testid="product-title"
            >
              {product.title}
            </h3>

            <div className="mt-1.5 flex items-center gap-1 text-xs">
              <svg
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-3.5 w-3.5 shrink-0 text-[#F59E0B]"
                aria-hidden="true"
              >
                <path d="m8 1.3 1.95 4.05 4.46.62-3.23 3.11.78 4.44L8 11.4l-3.96 2.12.78-4.44L1.59 5.97l4.46-.62L8 1.3Z" />
              </svg>
              <span className="font-extrabold text-[#0E352E]">{rating}</span>
              <span className="font-medium text-slate-400">
                ({reviewsCount} reseñas)
              </span>
            </div>
          </div>
        </div>

        {/* Bottom price + orange circular cart button */}
        <div className="mt-3.5 flex items-center justify-between gap-2 pt-1">
          <div>
            {cheapestPrice ? (
              <PreviewPrice
                price={cheapestPrice}
                compareAtPrice={compareAtPrice}
              />
            ) : null}
          </div>

          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F36F21] text-white shadow-[0_6px_16px_rgba(243,111,33,0.35)] transition-transform duration-200 group-hover:scale-105 group-hover:bg-[#E05E10]"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <circle cx="8" cy="16.5" r="1.25" fill="currentColor" stroke="none" />
              <circle cx="14.5" cy="16.5" r="1.25" fill="currentColor" stroke="none" />
              <path d="M2.5 3.5h2.2l1.9 8.3a1.2 1.2 0 0 0 1.18.95h6.72a1.2 1.2 0 0 0 1.16-.9L17 6.2H5.2" />
            </svg>
          </span>
        </div>
      </LocalizedClientLink>

      {/* Top-right wishlist heart */}
      <WishlistButton
        handle={product.handle}
        title={product.title}
        className="absolute right-3.5 top-3.5 z-10"
      />
    </div>
  )
}
