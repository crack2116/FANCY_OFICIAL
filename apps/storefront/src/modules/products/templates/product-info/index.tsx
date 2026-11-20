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
            className="text-xs uppercase tracking-wide text-fg-muted transition-colors hover:text-brand-700"
          >
            {product.collection.title}
          </LocalizedClientLink>
        ) : null}

        <h1
          className="text-3xl leading-tight tracking-tight text-fg-base"
          data-testid="product-title"
        >
          {product.title}
        </h1>

        {product.subtitle ? (
          <p
            className="text-base text-fg-subtle"
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