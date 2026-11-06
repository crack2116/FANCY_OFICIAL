import { z } from "@medusajs/framework/zod"

import { SPECIES_CODE_PATTERN } from "../../../modules/pet-product/constants"

/**
 * A species `code` is the machine key clients filter on and the search index
 * stores. The SET of codes is data, not code, so this only validates the SHAPE;
 * existence is checked against `pet_product_species` in
 * `resolveSpeciesCodesStep`, which is what turns `species="dragon"` into a 400
 * with the accepted codes listed.
 */
export const speciesCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(32)
  .regex(SPECIES_CODE_PATTERN, {
    message:
      "code must be lowercase, start with a letter and contain only letters, digits or underscores",
  })

export const AdminCreateSpeciesBody = z.object({
  code: speciesCodeSchema,
  name: z.string().trim().min(1).max(255),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(10_000).optional(),
})

/**
 * `code` is not patchable on purpose: it is what saved URLs and stored facets
 * point at, so changing it in place would silently repoint all of them. Create a
 * new species instead.
 */
export const AdminUpdateSpeciesBody = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    is_active: z.boolean().optional(),
    sort_order: z.number().int().min(0).max(10_000).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field must be provided",
  })

export const AdminListSpeciesQuery = z.object({
  code: speciesCodeSchema.optional(),
  is_active: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
})

export type AdminCreateSpeciesBody = z.infer<typeof AdminCreateSpeciesBody>
export type AdminUpdateSpeciesBody = z.infer<typeof AdminUpdateSpeciesBody>
export type AdminListSpeciesQuery = z.infer<typeof AdminListSpeciesQuery>
