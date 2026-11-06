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
import type BrandModuleService from "../modules/brand/service"
import { BRAND_MODULE } from "./brand-crud"
import { reindexProductsStep } from "./steps/reindex-products"

export type ProductBrandRow = {
  id: string
  handle?: string | null
  is_active?: boolean | null
}

export type AssignBrandInput = { product_id: string; brand_id: string }

export type ProductIdInput = { product_id: string }

/**
 * `link.dismiss` needs BOTH foreign keys (`Link.getLinkDataConfig` reads
 * `Object.keys(link[moduleB])` to discover the key name), so the current brand
 * has to be read before the row can be dismissed.
 *
 * This read is also the NO-N+1 evidence for the admin path: the product and its
 * brand come back from ONE `query.graph` call, resolved by the remote joiner from
 * the module link.
 */
const readProductBrandStep = createStep<
  ProductIdInput,
  ProductBrandRow | null,
  undefined
>("read-product-brand", async (input, { container }) => {
  const query = container.resolve<RemoteQueryFunction>(
    ContainerRegistrationKeys.QUERY
  )

  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "brand.id", "brand.handle", "brand.is_active"],
    filters: { id: input.product_id },
  })

  const product = data[0] as { brand?: ProductBrandRow | null } | undefined

  return new StepResponse(product?.brand ?? null)
})

/**
 * The brand must exist and be active before it is linked: an inactive brand is
 * not sellable, and linking one would publish a brand the storefront hides.
 */
const assertBrandAssignableStep = createStep<
  { brand_id: string },
  { id: string; handle: string | null },
  undefined
>("assert-brand-assignable", async (input, { container }) => {
  const brandModule = container.resolve<BrandModuleService>(BRAND_MODULE)

  const brand = (await brandModule.retrieveBrand(input.brand_id, {
    select: ["id", "handle", "is_active"],
  })) as ProductBrandRow | undefined

  if (!brand) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Brand "${input.brand_id}" was not found`
    )
  }

  if (brand.is_active === false) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Brand "${brand.handle}" is inactive and cannot be assigned`
    )
  }

  return new StepResponse({ id: brand.id, handle: brand.handle ?? null })
})

type ReplaceInput = {
  product_id: string
  brand_id: string
  previous_brand: ProductBrandRow | null
}

type ReplaceCompensationData = ReplaceInput

/**
 * Replaces whatever brand the product had with the new one.
 *
 * `Link.create` refuses to add a second brand to a product (see
 * `src/links/product-brand.ts` for the verified `hasMany` branch), so replacing
 * means dismissing the current row first. Doing it in this order means the
 * product is never linked to two brands at once, not even transiently.
 */
const replaceProductBrandStep = createStep<
  ReplaceInput,
  LinkRow,
  ReplaceCompensationData
>("replace-product-brand", async (input, { container }) => {
  const link = container.resolve<MedusaLinkService>(ContainerRegistrationKeys.LINK)

  if (input.previous_brand) {
    await link.dismiss({
      [Modules.PRODUCT]: { product_id: input.product_id },
      brand: { brand_id: input.previous_brand.id },
    })
  }

  const [created] = await link.create({
    [Modules.PRODUCT]: { product_id: input.product_id },
    brand: { brand_id: input.brand_id },
  })

  return new StepResponse(created, input)
}, async (previous, { container }) => {
  if (!previous) {
    return
  }

  const link = container.resolve<MedusaLinkService>(ContainerRegistrationKeys.LINK)

  // Undo in the reverse of the forward path: drop the brand that was added, then
  // put back the one that was removed.
  await link.dismiss({
    [Modules.PRODUCT]: { product_id: previous.product_id },
    brand: { brand_id: previous.brand_id },
  })

  if (!previous.previous_brand) {
    return
  }

  await link.create({
    [Modules.PRODUCT]: { product_id: previous.product_id },
    brand: { brand_id: previous.previous_brand.id },
  })
})

type RemoveInput = {
  product_id: string
  previous_brand: ProductBrandRow | null
}

type RemoveCompensationData = {
  product_id: string
  previous_brand: ProductBrandRow
}

const removeProductBrandStep = createStep<
  RemoveInput,
  ProductBrandRow | null,
  RemoveCompensationData | null
>("remove-product-brand", async (input, { container }) => {
  if (!input.previous_brand) {
    return new StepResponse(null, null)
  }

  const link = container.resolve<MedusaLinkService>(ContainerRegistrationKeys.LINK)

  await link.dismiss({
    [Modules.PRODUCT]: { product_id: input.product_id },
    brand: { brand_id: input.previous_brand.id },
  })

  return new StepResponse(input.previous_brand, {
    product_id: input.product_id,
    previous_brand: input.previous_brand,
  })
}, async (previous, { container }) => {
  if (!previous) {
    return
  }

  const link = container.resolve<MedusaLinkService>(ContainerRegistrationKeys.LINK)

  await link.create({
    [Modules.PRODUCT]: { product_id: previous.product_id },
    brand: { brand_id: previous.previous_brand.id },
  })
})

export const assignBrandToProductWorkflow = createWorkflow<
  AssignBrandInput,
  { id: string; handle: string | null },
  []
>("assign-brand-to-product", (input: WorkflowData<AssignBrandInput>) => {
  const previousBrand = readProductBrandStep(input)
  const brand = assertBrandAssignableStep(input)

  replaceProductBrandStep({
    product_id: input.product_id,
    brand_id: input.brand_id,
    previous_brand: previousBrand,
  })

  reindexProductsStep({ product_id: input.product_id })

  return new WorkflowResponse(brand)
})

export const removeBrandFromProductWorkflow = createWorkflow<
  ProductIdInput,
  ProductBrandRow | null,
  []
>("remove-brand-from-product", (input: WorkflowData<ProductIdInput>) => {
  const previousBrand = readProductBrandStep(input)

  removeProductBrandStep({
    product_id: input.product_id,
    previous_brand: previousBrand,
  })

  reindexProductsStep({ product_id: input.product_id })

  return new WorkflowResponse(previousBrand)
})
