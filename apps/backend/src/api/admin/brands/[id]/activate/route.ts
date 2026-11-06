import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { setBrandActiveWorkflow } from "../../../../../workflows/brand-crud"

/**
 * Explicit activation endpoint.
 *
 * Re-activating a brand can change what the storefront shows, so it gets its own
 * route rather than being folded into PATCH: an operator can grant the write
 * scope for one without the other.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { result: brand } = await setBrandActiveWorkflow(req.scope).run({
    input: { brand_id: req.params.id, is_active: true },
  })

  res.status(200).json({ brand })
}
