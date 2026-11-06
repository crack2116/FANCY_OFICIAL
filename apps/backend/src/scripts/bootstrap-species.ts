/**
 * FancyPeru — Normalized Species Bootstrap (Commercial Production)
 *
 * Seeds the normalized species for pet products without creating demo brands
 * or demo products.
 */
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import { PET_PRODUCT_MODULE } from "../workflows/pet-product-species"
import type PetProductModuleService from "../modules/pet-product/service"

const COMMERCIAL_SPECIES = [
  { code: "dog", name: "Perro", sort_order: 0 },
  { code: "cat", name: "Gato", sort_order: 1 },
  { code: "bird", name: "Ave", sort_order: 2 },
  { code: "small-pet", name: "Pequeño Mamífero", sort_order: 3 },
  { code: "other", name: "Otro", sort_order: 4 },
]

export default async function bootstrapCommercialSpecies({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const petProductService = container.resolve<PetProductModuleService>(PET_PRODUCT_MODULE)

  logger.info("Ensuring commercial pet species...")

  const { data: existingSpecies } = await query.graph({
    entity: "pet_product_species",
    fields: ["id", "code", "name"],
  })

  const existingCodes = new Set(((existingSpecies ?? []) as { code: string }[]).map((s) => s.code))

  for (const sp of COMMERCIAL_SPECIES) {
    if (!existingCodes.has(sp.code)) {
      await petProductService.createPetProductSpecies([sp])
      logger.info(`Created species '${sp.name}' (${sp.code}).`)
    } else {
      logger.info(`Species '${sp.name}' (${sp.code}) already exists.`)
    }
  }

  logger.info("Commercial species bootstrap completed.")
}

