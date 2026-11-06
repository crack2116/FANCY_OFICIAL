import { MedusaError } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
  type WorkflowData,
} from "@medusajs/framework/workflows-sdk"

import type PetProductModuleService from "../modules/pet-product/service"

/**
 * Container key of the local Pet Product Module. Custom modules are not part of
 * the `Modules` enum, so the key string is the only way to resolve the service.
 */
export const PET_PRODUCT_MODULE = "pet_product"

export type SpeciesRow = {
  id: string
  code: string
  name: string
  is_active: boolean
  sort_order: number
}

export type SpeciesCreateData = {
  code: string
  name: string
  is_active?: boolean
  sort_order?: number
}

export type SpeciesUpdateData = {
  name?: string
  is_active?: boolean
  sort_order?: number
}

export type SpeciesCreateInput = { species: SpeciesCreateData }

export type SpeciesUpdateInput = {
  species_id: string
  patch: SpeciesUpdateData
}

export type SpeciesCodeInput = { codes: string[] }

/**
 * `pet_product_species.code` is globally unique. Same treatment as the brand
 * handle: the unique index is the guarantee, the translation produces the 4xx.
 */
const isCodeCollision = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error)

  return message.includes("pet_product_species_code_unique")
}

const createSpeciesStep = createStep<
  SpeciesCreateInput,
  SpeciesRow[],
  SpeciesRow[]
>("create-species", async (input, { container }) => {
  const petProduct =
    container.resolve<PetProductModuleService>(PET_PRODUCT_MODULE)

  let created: SpeciesRow[]

  try {
    created = await petProduct.createPetProductSpecies([input.species])
  } catch (error) {
    if (isCodeCollision(error)) {
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        `A species with code "${input.species.code}" already exists`
      )
    }

    throw error
  }

  return new StepResponse(created, created)
}, async (created, { container }) => {
  if (!created?.length) {
    return
  }

  const petProduct =
    container.resolve<PetProductModuleService>(PET_PRODUCT_MODULE)

  await petProduct.deletePetProductSpecies(created.map((row) => row.id))
})

/**
 * `code` is not patchable: it is the value clients send in filters and the one
 * the search index stores, so changing it in place would silently repoint every
 * saved URL and facet. Create a new species instead.
 */
const updateSpeciesStep = createStep<
  SpeciesUpdateInput,
  SpeciesRow,
  undefined
>("update-species", async (input, { container }) => {
  const petProduct =
    container.resolve<PetProductModuleService>(PET_PRODUCT_MODULE)

  const [updated] = await petProduct.updatePetProductSpecies([
    { id: input.species_id, ...input.patch },
  ])

  return new StepResponse(updated)
})

/**
 * Turns species codes into ids.
 *
 * Codes are validated for EXISTENCE here rather than against a hardcoded list,
 * because the set of species is data: a store may legitimately add `rabbit`. An
 * unknown code is a 400 that names the accepted values, never a silent drop.
 */
export const resolveSpeciesCodesStep = createStep<
  SpeciesCodeInput,
  string[],
  undefined
>("resolve-species-codes", async (input, { container }) => {
  const petProduct =
    container.resolve<PetProductModuleService>(PET_PRODUCT_MODULE)

  const rows = await petProduct.listPetProductSpecies(
    { code: input.codes },
    { take: input.codes.length }
  )

  const found = new Map(
    (rows as unknown as { id: string; code: string }[]).map((row) => [
      row.code,
      row.id,
    ])
  )

  const unknown = input.codes.filter((code) => !found.has(code))

  if (unknown.length) {
    // The accepted codes are read separately: the filter above only matched the
    // codes that DO exist, so listing `found` would print nothing useful exactly
    // when the caller most needs the list.
    const all = await petProduct.listPetProductSpecies(
      {},
      { take: 100, select: ["code"] }
    )
    const known = (all as unknown as { code: string }[])
      .map((row) => row.code)
      .sort()

    // `INVALID_DATA`, NOT `INVALID_ARGUMENT`.
    //
    // In @medusajs/framework 2.21.2 the HTTP error handler's switch has
    // `case INVALID_ARGUMENT: break` with NO `statusCode` assignment, so it falls
    // out with the initial 500 and the client gets an opaque failure for what is
    // plainly a bad request. `INVALID_DATA` is the branch that maps to 400, and it
    // is the same type the project's zod validation already produces.
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Unknown species code(s): ${unknown.join(", ")}. Known codes: ${known.join(", ")}`
    )
  }

  return new StepResponse(input.codes.map((code) => found.get(code) as string))
})

export const createPetProductSpeciesWorkflow = createWorkflow<
  SpeciesCreateInput,
  SpeciesRow[],
  []
>("create-pet-product-species", (input: WorkflowData<SpeciesCreateInput>) => {
  const species = createSpeciesStep(input)

  return new WorkflowResponse(species)
})

export const updatePetProductSpeciesWorkflow = createWorkflow<
  SpeciesUpdateInput,
  SpeciesRow,
  []
>("update-pet-product-species", (input: WorkflowData<SpeciesUpdateInput>) => {
  const species = updateSpeciesStep(input)

  return new WorkflowResponse(species)
})
