/**
 * FancyPeru — veterinary top-level taxonomy bootstrap (idempotent).
 *
 * Creates the store's top-level categories so the storefront navigation can
 * link to real category pages. Runs alongside bootstrap-peru.ts; both are safe
 * to re-run at any time.
 *
 *   pnpm exec medusa exec ./src/scripts/bootstrap-vet-taxonomy.ts
 *
 * Existing categories (including the upstream apparel demo) are never
 * modified or removed. If a handle already exists its name is left untouched.
 *
 * TODO: subcategories per line of business (Phase 3).
 */
import { createProductCategoriesWorkflow } from "@medusajs/medusa/core-flows"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

type CreatedCategory = { id: string; handle?: string | null }

type CategoryRow = { id: string; handle?: string | null; name?: string | null }

/**
 * Top-level categories. Handles match src/lib/site-config.ts on the storefront
 * — if one side changes, the other must follow or the nav will skip the item.
 */
const CATEGORIES = [
  { name: "Perros", handle: "perros" },
  { name: "Alimentos", handle: "alimentos" },
  { name: "Salud", handle: "salud" },
  { name: "Farmacia", handle: "farmacia" },
  { name: "Higiene", handle: "higiene" },
  { name: "Accesorios", handle: "accesorios" },
  { name: "Juguetes", handle: "juguetes" },
] as const

export default async function bootstrapVetTaxonomy({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  logger.info("Bootstrapping veterinary top-level taxonomy")

  const { data: existingRows } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle", "name"],
  })

  const existing = (existingRows ?? []) as CategoryRow[]
  const existingHandles = new Set(
    existing.map((category) => category.handle).filter(Boolean)
  )

  const missing = CATEGORIES.filter(
    (category) => !existingHandles.has(category.handle)
  )

  if (missing.length === 0) {
    logger.info("All veterinary categories already exist. Nothing to do.")
    return
  }

  const { result } = await createProductCategoriesWorkflow(container).run({
    input: {
      product_categories: missing.map((category) => ({
        name: category.name,
        handle: category.handle,
        description: "",
        is_active: true,
        is_internal: false,
        rank: 0,
      })),
    },
  })

  const created = (result ?? []) as CreatedCategory[]

  logger.info(
    `Created ${created.length} categories: ${created
      .map((category) => category.handle)
      .join(", ")}`
  )

  logger.info(
    `Total categories now: ${
      existing.length + created.length
    } (upstream demo categories are preserved)`
  )
}