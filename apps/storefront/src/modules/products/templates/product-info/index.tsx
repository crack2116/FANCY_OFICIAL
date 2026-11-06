import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductPetInfo from "@modules/products/components/product-pet-info"

/**
 * Title block.
 *
 * Title and subtitle come from the API. The subtitle is rendered only when the
 * product actually has one — a placeholder line under every title would be
 * decoration pretending to be data.
 *
 * "Información del producto" sits under the title rather than in the accordions
 * because brand, species, life stage and size are the facts a shopper scans FOR
 * on a veterinary product. Hiding the brand behind a collapsed "Detalles" panel
 * would bury the one piece of information that identifies what they are buying.
 */
const ProductInfo = ({ product }: { product: HttpTypes.StoreProduct }) => {
  return (
    <div id="product-info">
      <div className="flex flex-col gap-y-4">
        {product.collection ? (
          <LocalizedClientLink
            href={`/collections/${product.collection.handle}`}
            className="inline-flex w-fit items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-700 transition-colors hover:bg-brand-100"
          >
            {product.collection.title}
          </LocalizedClientLink>
        ) : null}

        <h1
          className="font-display text-3xl font-semibold leading-[1.1] tracking-tight text-fg-base small:text-4xl"
          data-testid="product-title"
        >
          {product.title}
        </h1>

        {product.subtitle ? (
          <p
            className="max-w-xl text-base leading-relaxed text-fg-subtle"
            data-testid="product-subtitle"
          >
            {product.subtitle}
          </p>
        ) : null}

        <ProductPetInfo product={product} />
      </div>
    </div>
  )
}

export default ProductInfo