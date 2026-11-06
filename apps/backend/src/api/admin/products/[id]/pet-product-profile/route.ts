import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import type {
  LifeStage,
  PetSize,
} from "../../../../../modules/pet-product/constants"
import {
  removePetProductProfileWorkflow,
  upsertPetProductProfileWorkflow,
} from "../../../../../workflows/pet-product-profile"

/**
 * Creates or replaces the single pet product profile of a product.
 *
 * `life_stage` and `pet_size` are closed sets and species codes are resolved
 * against real rows, both validated in the zod schema and again inside the
 * workflow. A product with no profile keeps working: DELETE simply removes it.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.validatedBody as {
    life_stage: LifeStage
    pet_size: PetSize
    species_codes: string[]
  }

  const { result } = await upsertPetProductProfileWorkflow(req.scope).run({
    input: {
      product_id: req.params.id,
      life_stage: body.life_stage,
      pet_size: body.pet_size,
      species_codes: body.species_codes,
    },
  })

  res.status(200).json({ product: result })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { result } = await removePetProductProfileWorkflow(req.scope).run({
    input: { product_id: req.params.id },
  })

  res.status(200).json({
    product_id: req.params.id,
    removed_profile: result,
  })
}
