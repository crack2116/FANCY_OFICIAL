import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"

import BrandModule from "../modules/brand"

/**
 * One product -> at most one brand. One brand -> many products.
 *
 * `isList` semantics, verified against the installed implementation rather than
 * assumed (`@medusajs/utils` 2.21.2, `dist/modules-sdk/define-link.js`):
 *
 * `defineLink(left, right)` derives `hasMany` from the argument's OWN `isList`
 * (`prepareServiceConfig`: `hasMany = !!input.isList`), and each of the two
 * `extends` entries pluralises its field alias from the OPPOSITE argument:
 *
 *   - entry 1 extends the LEFT module (product) and pluralises when
 *     `right.isList` is set, so `right.isList: true` would mean "one product has
 *     many brands" (`product.brands`).
 *   - entry 2 extends the RIGHT module (brand) and pluralises when
 *     `left.isList` is set, so `left.isList: true` means "one brand has many
 *     products" (`brand.products`).
 *
 * In other words `isList` describes how the OTHER side is reached, so this link
 * puts `isList: true` on the PRODUCT argument. That yields `product.brand`
 * (singular) and `brand.products` (array).
 *
 * It is also what ENFORCES the 1:N cardinality. `Link.create` in
 * `@medusajs/modules-sdk` 2.21.2 (`dist/link.js`) branches on `hasMany`: with
 * `product.hasMany = true` and `brand.hasMany = false` it takes the
 * `else if (!modB.hasMany)` branch and refuses the insert when a row already
 * exists with the same `product_id` and a different `brand_id`, throwing
 * "Cannot create multiple links between 'product' and 'brand'". Swapping the two
 * `isList` flags would flip that branch to `product_id` and make a brand
 * impossible to link to a second product — the wrong direction entirely.
 *
 * The database half of the guarantee is the composite primary key
 * `(product_id, brand_id)` on the link table (`generate-entity.js`), which stops
 * the same pair being stored twice.
 */
export default defineLink(
  { linkable: ProductModule.linkable.product, isList: true },
  { linkable: BrandModule.linkable.brand },
  {
    database: { table: "product_brand" },
  }
)
