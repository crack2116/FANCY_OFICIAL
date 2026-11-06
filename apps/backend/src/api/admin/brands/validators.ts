import { z } from "@medusajs/framework/zod"

import { BRAND_HANDLE_PATTERN } from "../../../modules/pet-product/constants"

/**
 * Brand handles are the URL key of the entity, so the shape is fixed: lowercase
 * words joined by single hyphens. Accepting uppercase or spaces here would
 * produce a handle no router can round-trip.
 */
export const brandHandleSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(BRAND_HANDLE_PATTERN, {
    message:
      "handle must be lowercase alphanumeric words separated by single hyphens",
  })

/** An empty string means "clear this optional field", not "store an empty text". */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value === "" ? null : value))

const optionalUrl = z
  .string()
  .trim()
  .url()
  .max(2048)
  .nullish()
  .transform((value) => (value === "" ? null : value))

export const AdminCreateBrandBody = z.object({
  name: z.string().trim().min(1).max(255),
  /** Optional: derived from `name` when absent. Never optional in the database. */
  handle: brandHandleSchema.optional(),
  description: optionalText(2000),
  logo_url: optionalUrl,
  is_active: z.boolean().optional(),
})

export const AdminUpdateBrandBody = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    handle: brandHandleSchema.optional(),
    description: optionalText(2000),
    logo_url: optionalUrl,
    is_active: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field must be provided",
  })

export const AdminListBrandsQuery = z.object({
  q: z.string().trim().min(1).max(255).optional(),
  handle: brandHandleSchema.optional(),
  is_active: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type AdminCreateBrandBody = z.infer<typeof AdminCreateBrandBody>
export type AdminUpdateBrandBody = z.infer<typeof AdminUpdateBrandBody>
export type AdminListBrandsQuery = z.infer<typeof AdminListBrandsQuery>
