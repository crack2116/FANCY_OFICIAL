import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { setBrandActiveWorkflow } from "../../../../../workflows/brand-crud"

/**
 * Deactivation is NOT a delete: the brand keeps its handle, its product links
 * and its history, it just stops being assignable and stops appearing in brand
 * listings. See `assertBrandAssignableStep` in the assignment workflow.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { result: brand } = await setBrandActiveWorkflow(req.scope).run({
    input: { brand_id: req.params.id, is_active: false },
  })

  res.status(200).json({ brand })
}
