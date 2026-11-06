import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { assignBrandToProductWorkflow } from "../../../../../workflows/brand-product-link"
import { removeBrandFromProductWorkflow } from "../../../../../workflows/brand-product-link"

/**
 * Assigns (or replaces) the single brand of a product.
 *
 * The link is 1:1 by construction (see `src/links/product-brand.ts`), and the
 * workflow dismisses the previous link before creating the new one, so this
 * endpoint can never leave a product with two brands.
 *
 * Under `/admin`: no `AUTHENTICATE = false`, so admin auth applies.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { brand_id } = req.validatedBody as { brand_id: string }

  const { result } = await assignBrandToProductWorkflow(req.scope).run({
    input: { product_id: req.params.id, brand_id },
  })

  res.status(200).json({ product_id: req.params.id, brand: result })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { result } = await removeBrandFromProductWorkflow(req.scope).run({
    input: { product_id: req.params.id },
  })

  res.status(200).json({
    product_id: req.params.id,
    removed_brand: result,
  })
}
