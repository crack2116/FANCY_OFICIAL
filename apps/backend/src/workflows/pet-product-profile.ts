import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import type { RemoteQueryFunction } from "@medusajs/framework/types"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
  type WorkflowData,
} from "@medusajs/framework/workflows-sdk"

import type { MedusaLinkService, LinkRow } from "../links/link-service"
import type PetProductModuleService from "../modules/pet-product/service"
import type { LifeStage, PetSize } from "../modules/pet-product/constants"
import {
  PET_PRODUCT_MODULE,
  resolveSpeciesCodesStep,
} from "./pet-product-species"
import { reindexProductsStep } from "./steps/reindex-products"

export type ProfileRow = {
  id: string
  life_stage?: string | null
  pet_size?: string | null
}

export type ProfileData = {
  life_stage: LifeStage
  pet_size: PetSize
}

export type UpsertPetProductProfileInput = ProfileData & {
  product_id: string
  species_codes: string[]
}

export type ProductIdInput = { product_id: string }

export type ProductRef = { id: string; handle: string | null }

/**
 * Reads the profile currently linked to the product, so the workflow can replace
 * it instead of adding a second one.
 *
 * `product.pet_product_profile` is a 1:1 link alias, so `query.graph` resolves it
 * in the same call as the product: one read for the product, not one hop per
 * relation from the caller.
 */
const readProductProfileStep = createStep<
  ProductIdInput,
  ProfileRow | null,
  undefined
>("read-product-profile", async (input, { container }) => {
  const query = container.resolve<RemoteQueryFunction>(
    ContainerRegistrationKeys.QUERY
  )

  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "pet_product_profile.id", "pet_product_profile.life_stage"],
    filters: { id: input.product_id },
  })

  const product = data[0] as
    | { pet_product_profile?: ProfileRow | null }
    | undefined

  return new StepResponse(product?.pet_product_profile ?? null)
})

/**
 * The product must exist: linking a profile to a product id that does not exist
 * would leave an orphan link row. A product with NO profile is a legitimate
 * state, and it is what this workflow creates.
 */
const assertProductExistsStep = createStep<
  ProductIdInput,
  ProductRef,
  undefined
>("assert-product-exists", async (input, { container }) => {
  const productModule = container.resolve<{
    retrieveProduct: (
      id: string,
      config?: Record<string, unknown>
    ) => Promise<{ id: string; handle?: string | null } | undefined>
  }>(Modules.PRODUCT)

  const product = await productModule.retrieveProduct(input.product_id, {
    select: ["id", "handle"],
  })

  if (!product) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product "${input.product_id}" was not found`
    )
  }

  return new StepResponse({ id: product.id, handle: product.handle ?? null })
})

type WriteInput = {
  profile: ProfileData
  species_ids: string[]
  previous_profile: ProfileRow | null
}

type WriteCompensationData = {
  profile_id: string
  previous_profile: ProfileRow | null
}

/**
 * Creates the profile when the product has none and updates it in place when it
 * has one.
 *
 * The pivot table's primary key is `(profile_id, species_id)`, so writing the
 * same species twice is impossible; passing the full species list is therefore
 * idempotent and needs no diffing.
 */
const writeProductProfileStep = createStep<
  WriteInput,
  { id: string },
  WriteCompensationData
>("write-product-profile", async (input, { container }) => {
  const petProduct =
    container.resolve<PetProductModuleService>(PET_PRODUCT_MODULE)

  const payload = {
    ...input.profile,
    species: input.species_ids,
  }

  if (input.previous_profile) {
    const [updated] = await petProduct.updatePetProductProfiles([
      { id: input.previous_profile.id, ...payload },
    ])

    return new StepResponse(updated, {
      profile_id: input.previous_profile.id,
      previous_profile: input.previous_profile,
    })
  }

  const [created] = await petProduct.createPetProductProfiles([payload])

  return new StepResponse(created, {
    profile_id: created.id,
    previous_profile: null,
  })
}, async (previous, { container }) => {
  if (!previous) {
    return
  }

  const petProduct =
    container.resolve<PetProductModuleService>(PET_PRODUCT_MODULE)

  if (previous.previous_profile) {
    // Put the previous bracket back. The species rows are not restored: a failed
    // link write leaves the product unlinked, and the operator re-runs the
    // upsert, which rewrites the whole list.
    await petProduct.updatePetProductProfiles([
      {
        id: previous.previous_profile.id,
        life_stage: (previous.previous_profile.life_stage ??
          "all") as LifeStage,
        pet_size: (previous.previous_profile.pet_size ?? "all") as PetSize,
        species: [],
      },
    ])

    return
  }

  await petProduct.deletePetProductProfiles([previous.profile_id])
})

type LinkInput = {
  product_id: string
  profile_id: string
  previous_profile: ProfileRow | null
}

/**
 * The 1:1 link means the old link must go before the new one can be created
 * (`Link.create` refuses a second row for the same product or the same profile).
 */
const replaceProductProfileLinkStep = createStep<
  LinkInput,
  LinkRow,
  LinkInput
>("replace-product-profile-link", async (input, { container }) => {
  const link = container.resolve<MedusaLinkService>(ContainerRegistrationKeys.LINK)

  if (input.previous_profile) {
    await link.dismiss({
      [Modules.PRODUCT]: { product_id: input.product_id },
      pet_product: { pet_product_profile_id: input.previous_profile.id },
    })
  }

  const [created] = await link.create({
    [Modules.PRODUCT]: { product_id: input.product_id },
    pet_product: { pet_product_profile_id: input.profile_id },
  })

  return new StepResponse(created, input)
}, async (previous, { container }) => {
  if (!previous) {
    return
  }

  const link = container.resolve<MedusaLinkService>(ContainerRegistrationKeys.LINK)

  await link.dismiss({
    [Modules.PRODUCT]: { product_id: previous.product_id },
    pet_product: { pet_product_profile_id: previous.profile_id },
  })

  if (!previous.previous_profile) {
    return
  }

  await link.create({
    [Modules.PRODUCT]: { product_id: previous.product_id },
    pet_product: { pet_product_profile_id: previous.previous_profile.id },
  })
})

type UnlinkInput = {
  product_id: string
  previous_profile: ProfileRow | null
}

type UnlinkCompensationData = {
  product_id: string
  previous_profile: ProfileRow
}

const removeProductProfileLinkStep = createStep<
  UnlinkInput,
  ProfileRow | null,
  UnlinkCompensationData | null
>("remove-product-profile-link", async (input, { container }) => {
  if (!input.previous_profile) {
    return new StepResponse(null, null)
  }

  const link = container.resolve<MedusaLinkService>(ContainerRegistrationKeys.LINK)

  await link.dismiss({
    [Modules.PRODUCT]: { product_id: input.product_id },
    pet_product: { pet_product_profile_id: input.previous_profile.id },
  })

  return new StepResponse(input.previous_profile, {
    product_id: input.product_id,
    previous_profile: input.previous_profile,
  })
}, async (previous, { container }) => {
  if (!previous) {
    return
  }

  const link = container.resolve<MedusaLinkService>(ContainerRegistrationKeys.LINK)

  await link.create({
    [Modules.PRODUCT]: { product_id: previous.product_id },
    pet_product: { pet_product_profile_id: previous.previous_profile.id },
  })
})

export const upsertPetProductProfileWorkflow = createWorkflow<
  UpsertPetProductProfileInput,
  ProductRef,
  []
>(
  "upsert-pet-product-profile",
  (input: WorkflowData<UpsertPetProductProfileInput>) => {
    const product = assertProductExistsStep(input)
    const speciesIds = resolveSpeciesCodesStep({ codes: input.species_codes })
    const previousProfile = readProductProfileStep(input)

    const profile = writeProductProfileStep({
      profile: {
        life_stage: input.life_stage,
        pet_size: input.pet_size,
      },
      species_ids: speciesIds,
      previous_profile: previousProfile,
    })

    replaceProductProfileLinkStep({
      product_id: input.product_id,
      profile_id: profile.id,
      previous_profile: previousProfile,
    })

    reindexProductsStep({ product_id: input.product_id })

    return new WorkflowResponse(product)
  }
)

export const removePetProductProfileWorkflow = createWorkflow<
  ProductIdInput,
  ProfileRow | null,
  []
>("remove-pet-product-profile", (input: WorkflowData<ProductIdInput>) => {
  const previousProfile = readProductProfileStep(input)

  removeProductProfileLinkStep({
    product_id: input.product_id,
    previous_profile: previousProfile,
  })

  reindexProductsStep({ product_id: input.product_id })

  return new WorkflowResponse(previousProfile)
})
