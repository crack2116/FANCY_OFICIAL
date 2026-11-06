import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { updateBrandWorkflow } from "../../../../workflows/brand-crud"

const BRAND_FIELDS = [
  "id",
  "name",
  "handle",
  "description",
  "logo_url",
  "is_active",
]

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: brand } = await query.graph({
    entity: "brand",
    fields: BRAND_FIELDS,
    filters: { id: req.params.id },
  })

  const row = brand[0]

  if (!row) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Brand "${req.params.id}" was not found`
    )
  }

  res.status(200).json({ brand: row })
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const body = req.validatedBody as {
    name?: string
    handle?: string
    description?: string | null
    logo_url?: string | null
    is_active?: boolean
  }

  const { result: brand } = await updateBrandWorkflow(req.scope).run({
    input: { brand_id: req.params.id, patch: body },
  })

  res.status(200).json({ brand })
}
