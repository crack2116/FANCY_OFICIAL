import { MedusaError } from "@medusajs/framework/utils"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import type PetProductModuleService from "../../../../modules/pet-product/service"
import {
  PET_PRODUCT_MODULE,
  updatePetProductSpeciesWorkflow,
} from "../../../../workflows/pet-product-species"

const SPECIES_FIELDS = ["id", "code", "name", "is_active", "sort_order"]

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const petProduct =
    req.scope.resolve<PetProductModuleService>(PET_PRODUCT_MODULE)

  const species = await petProduct.retrievePetProductSpecies(req.params.id, {
    select: SPECIES_FIELDS,
  })

  if (!species) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Species "${req.params.id}" was not found`
    )
  }

  res.status(200).json({ species })
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const body = req.validatedBody as {
    name?: string
    is_active?: boolean
    sort_order?: number
  }

  const { result } = await updatePetProductSpeciesWorkflow(req.scope).run({
    input: { species_id: req.params.id, patch: body },
  })

  res.status(200).json({ species: result })
}
