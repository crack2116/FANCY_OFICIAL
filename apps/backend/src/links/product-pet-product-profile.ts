import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"

import PetProductModule from "../modules/pet-product"

/**
 * One product -> at most one pet product profile. One profile -> at most one
 * product.
 *
 * `isList` semantics, verified in `@medusajs/utils` 2.21.2
 * (`dist/modules-sdk/define-link.js`): each `extends` entry pluralises its field
 * alias from the OPPOSITE argument's `isList`. Both arguments omit `isList`
 * here, which is exactly the 1:1 shape — `product.pet_product_profile` and
 * `pet_product_profile.product` both resolve to a single object, never an array.
 *
 * Omitting `isList` is also what makes it a real 1:1 rather than a shape
 * convention. `Link.create` in `@medusajs/modules-sdk` 2.21.2 (`dist/link.js`)
 * branches on `hasMany`, and with `hasMany = false` on BOTH sides it takes the
 * `!modA.hasMany && !modB.hasMany` branch: the insert is refused when a row
 * already exists with either the same `product_id` or the same
 * `pet_product_profile_id`. The composite primary key
 * `(product_id, pet_product_profile_id)` on the link table stops the same pair
 * being stored twice.
 *
 * A product with no profile keeps working: the link table simply has no row for
 * it and `product.pet_product_profile` resolves to `undefined`. Nothing in the
 * Product Module is modified, so generic (non-pet) products are unaffected.
 */
export default defineLink(
  { linkable: ProductModule.linkable.product },
  { linkable: PetProductModule.linkable.petProductProfile },
  {
    database: { table: "product_pet_product_profile" },
  }
)
