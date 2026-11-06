import { z } from "@medusajs/framework/zod"

import { LIFE_STAGES, PET_SIZES } from "../../../modules/pet-product/constants"
import { speciesCodeSchema } from "../pet-product-species/validators"

/**
 * Admin payload validators for the veterinary commercial domain.
 *
 * Every entry point that accepts these values parses them with zod first. The
 * client is never trusted: an unknown `life_stage` or a made-up species code is a
 * 400, not a row.
 */

/**
 * `life_stage` and `pet_size` are closed sets and are stored exactly as sent.
 * They are the canonical internal values, NOT UI labels: a store renders
 * "Cachorro" / "Raza mediana" from these, never the other way round.
 */
export const lifeStageSchema = z.enum(LIFE_STAGES)
export const petSizeSchema = z.enum(PET_SIZES)

export const AdminAssignBrandBody = z.object({
  brand_id: z.string().trim().min(1).max(64),
})

export const AdminUpsertPetProductProfileBody = z.object({
  life_stage: lifeStageSchema,
  pet_size: petSizeSchema,
  /**
   * Species CODES, not ids: codes are the stable key a client can read back from
   * `GET /admin/pet-product-species`. Existence is resolved server-side in
   * `resolveSpeciesCodesStep`, so `["dragon"]` is a 400 and never a silent drop.
   */
  species_codes: z.array(speciesCodeSchema).min(1).max(20),
})
