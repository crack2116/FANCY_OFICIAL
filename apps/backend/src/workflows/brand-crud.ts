import { MedusaError } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
  type WorkflowData,
} from "@medusajs/framework/workflows-sdk"

import type BrandModuleService from "../modules/brand/service"

/**
 * Container key of the local Brand Module. Custom modules are not part of the
 * `Modules` enum, so the key string is the only way to resolve the service.
 */
export const BRAND_MODULE = "brand"

export type BrandRow = {
  id: string
  name: string
  handle: string
  description?: string | null
  logo_url?: string | null
  is_active: boolean
}

export type BrandCreateData = {
  name: string
  handle: string
  description?: string | null
  logo_url?: string | null
  is_active?: boolean
}

export type BrandUpdateData = {
  name?: string
  handle?: string
  description?: string | null
  logo_url?: string | null
  is_active?: boolean
}

export type BrandCreateInput = { brand: BrandCreateData }

export type BrandUpdateInput = { brand_id: string; patch: BrandUpdateData }

export type BrandSetActiveInput = { brand_id: string; is_active: boolean }

/**
 * `brand.handle` is globally unique, so two concurrent creates can race. The
 * unique index is the guarantee; translating its violation here is what turns a
 * 500 into a 409 for HTTP callers, workflow callers and scripts alike.
 */
const isHandleCollision = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error)

  return message.includes("brand_handle_unique")
}

const createBrandStep = createStep<
  BrandCreateInput,
  BrandRow[],
  BrandRow[]
>("create-brand", async (input, { container }) => {
  const brandModule = container.resolve<BrandModuleService>(BRAND_MODULE)

  let created: BrandRow[]

  try {
    created = await brandModule.createBrands([input.brand])
  } catch (error) {
    if (isHandleCollision(error)) {
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        `A brand with handle "${input.brand.handle}" already exists`
      )
    }

    throw error
  }

  return new StepResponse(created, created)
}, async (created, { container }) => {
  if (!created?.length) {
    return
  }

  const brandModule = container.resolve<BrandModuleService>(BRAND_MODULE)

  await brandModule.deleteBrands(created.map((brand) => brand.id))
})

/**
 * No compensation: reverting an edit would need the previous row, and silently
 * undoing a deliberate rename is worse than leaving it applied.
 */
const updateBrandStep = createStep<BrandUpdateInput, BrandRow, undefined>(
  "update-brand",
  async (input, { container }) => {
    const brandModule = container.resolve<BrandModuleService>(BRAND_MODULE)

    let updated: BrandRow[]

    try {
      updated = await brandModule.updateBrands([
        { id: input.brand_id, ...input.patch },
      ])
    } catch (error) {
      if (isHandleCollision(error)) {
        throw new MedusaError(
          MedusaError.Types.DUPLICATE_ERROR,
          "That brand handle is already in use"
        )
      }

      throw error
    }

    return new StepResponse(updated[0])
  }
)

/**
 * Separate from `updateBrandStep` so the admin API has an intention-revealing
 * endpoint, and so the one place that decides what a visibility change touches
 * stays obvious.
 */
const setBrandActiveStep = createStep<BrandSetActiveInput, BrandRow, undefined>(
  "set-brand-active",
  async (input, { container }) => {
    const brandModule = container.resolve<BrandModuleService>(BRAND_MODULE)

    const [updated] = await brandModule.updateBrands([
      { id: input.brand_id, is_active: input.is_active },
    ])

    return new StepResponse(updated)
  }
)

export const createBrandWorkflow = createWorkflow<
  BrandCreateInput,
  BrandRow[],
  []
>("create-brand", (input: WorkflowData<BrandCreateInput>) => {
  const brand = createBrandStep(input)

  return new WorkflowResponse(brand)
})

export const updateBrandWorkflow = createWorkflow<
  BrandUpdateInput,
  BrandRow,
  []
>("update-brand", (input: WorkflowData<BrandUpdateInput>) => {
  const brand = updateBrandStep(input)

  return new WorkflowResponse(brand)
})

export const setBrandActiveWorkflow = createWorkflow<
  BrandSetActiveInput,
  BrandRow,
  []
>("set-brand-active", (input: WorkflowData<BrandSetActiveInput>) => {
  const brand = setBrandActiveStep(input)

  return new WorkflowResponse(brand)
})
