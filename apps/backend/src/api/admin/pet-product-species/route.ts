import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import type PetProductModuleService from "../../../modules/pet-product/service"
import {
  createPetProductSpeciesWorkflow,
  PET_PRODUCT_MODULE,
} from "../../../workflows/pet-product-species"

/**
 * Admin endpoints for the normalised species list.
 *
 * Under `/admin`, so Medusa's admin auth applies. No `AUTHENTICATE = false`
 * export here, so a Store-API caller cannot create or mutate a species.
 */

const SPECIES_FIELDS = ["id", "code", "name", "is_active", "sort_order"]

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const petProduct =
    req.scope.resolve<PetProductModuleService>(PET_PRODUCT_MODULE)
  const { code, is_active, limit, offset } = req.validatedQuery as {
    code?: string
    is_active?: boolean
    limit: number
    offset: number
  }

  const [species, count] = await petProduct.listAndCountPetProductSpecies(
    {
      ...(code ? { code } : {}),
      ...(is_active === undefined ? {} : { is_active }),
    },
    {
      skip: offset,
      take: limit,
      select: SPECIES_FIELDS,
      order: { sort_order: "ASC" },
    }
  )

  res.status(200).json({ species, count, offset, limit })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.validatedBody as {
    code: string
    name: string
    is_active?: boolean
    sort_order?: number
  }

  const { result } = await createPetProductSpeciesWorkflow(req.scope).run({
    input: {
      species: {
        code: body.code,
        name: body.name,
        ...(body.is_active === undefined ? {} : { is_active: body.is_active }),
        ...(body.sort_order === undefined ? {} : { sort_order: body.sort_order }),
      },
    },
  })

  res.status(200).json({ species: result })
}
