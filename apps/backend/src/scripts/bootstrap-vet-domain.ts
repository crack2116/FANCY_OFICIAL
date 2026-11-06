/**
 * FancyPeru — veterinary commercial domain bootstrap (idempotent).
 *
 * Seeds the two custom modules created for this phase:
 *
 *  - `brand`               — a real Brand entity, at most one per product
 *  - `pet_product_species` — the normalised species filter
 *  - `pet_product_profile` — life stage + size + species, at most one per product
 *
 *   pnpm exec medusa exec ./src/scripts/bootstrap-vet-domain.ts
 *
 * Rules honoured here, the same as bootstrap-vet-catalog.ts:
 *  - Official Medusa workflows and module services only. No SQL, no manual
 *    pivot rows.
 *  - Everything is keyed by a deterministic handle / code / product handle, so a
 *    second run creates nothing.
 *  - Neither the upstream demo data nor the 14 veterinary demo products are
 *    modified.
 *
 * Every brand below is a clearly fictional demo brand: no real manufacturer name
 * appears in this file. There is deliberately no medical data either — no active
 * ingredient, no dosage, no prescription flag. This phase is commercial only.
 */
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

import { toBrandHandle } from "../lib/brand-handle"
import type PetProductModuleService from "../modules/pet-product/service"
import { assignBrandToProductWorkflow } from "../workflows/brand-product-link"
import {
  BRAND_MODULE,
  createBrandWorkflow,
} from "../workflows/brand-crud"
import { PET_PRODUCT_MODULE } from "../workflows/pet-product-species"
import { upsertPetProductProfileWorkflow } from "../workflows/pet-product-profile"

type Row = Record<string, unknown>

/**
 * Fictional demo brands, assigned by top-level category. Four is enough to make
 * the storefront's brand rail and the brand facet meaningful without turning the
 * demo catalogue into a fake manufacturer directory.
 */
const BRANDS = [
  {
    name: "NutriPet Demo",
    description:
      "Demo nutrition brand. Fictional catalogue entry used only to exercise the storefront.",
    category: "alimentos",
  },
  {
    name: "PetCare Demo",
    description:
      "Demo grooming brand. Fictional catalogue entry used only to exercise the storefront.",
    category: "higiene",
  },
  {
    name: "PawPlay Demo",
    description:
      "Demo toy brand. Fictional catalogue entry used only to exercise the storefront.",
    category: "juguetes",
  },
  {
    name: "DailyPet Demo",
    description:
      "Demo accessories brand. Fictional catalogue entry used only to exercise the storefront.",
    category: "accesorios",
  },
] as const

/**
 * Seeded with `cat` and `other` even though every demo product is a dog
 * product: the model must not be dogs-only, and a seed containing only `dog`
 * would not prove that.
 */
const SPECIES = [
  { code: "dog", name: "Perro", sort_order: 0 },
  { code: "cat", name: "Gato", sort_order: 1 },
  { code: "other", name: "Otro", sort_order: 2 },
] as const

type LifeStage = "puppy" | "adult" | "senior" | "all"
type PetSize = "small" | "medium" | "large" | "all"

type ProfileSeed = {
  handle: string
  species: string[]
  life_stage: LifeStage
  pet_size: PetSize
}

/**
 * One profile per veterinary demo product.
 *
 * `life_stage` / `pet_size` are commercial brackets read off what the catalogue
 * title already says (Alimento Cachorro, Alimento Senior, Alimento Adulto Razas
 * Medianas, ...). No medical property is inferred: a chew toy has no life stage,
 * so it is `all`/`all` rather than a guess.
 *
 * Two snacks and a few accessories are deliberately valid for a dog AND a cat.
 * That is the case a normalised species table exists for.
 */
const PROFILES: ProfileSeed[] = [
  {
    handle: "alimento-adulto-razas-medianas",
    species: ["dog"],
    life_stage: "adult",
    pet_size: "medium",
  },
  {
    handle: "alimento-cachorro",
    species: ["dog"],
    life_stage: "puppy",
    pet_size: "all",
  },
  {
    handle: "alimento-senior",
    species: ["dog"],
    life_stage: "senior",
    pet_size: "all",
  },
  {
    handle: "snack-dental-demo",
    species: ["dog", "cat"],
    life_stage: "all",
    pet_size: "all",
  },
  {
    handle: "snacks-croquetas-artesanales",
    species: ["dog", "cat"],
    life_stage: "all",
    pet_size: "all",
  },
  {
    handle: "shampoo-suave-para-perros",
    species: ["dog"],
    life_stage: "all",
    pet_size: "all",
  },
  {
    handle: "toallitas-de-higiene",
    species: ["dog", "cat"],
    life_stage: "all",
    pet_size: "all",
  },
  {
    handle: "cepillo-dental-para-perros",
    species: ["dog"],
    life_stage: "all",
    pet_size: "all",
  },
  {
    handle: "correa-ajustable",
    species: ["dog"],
    life_stage: "all",
    pet_size: "all",
  },
  {
    handle: "collar-reflectivo",
    species: ["dog", "cat"],
    life_stage: "all",
    pet_size: "all",
  },
  {
    handle: "cama-acolchada",
    species: ["dog", "cat"],
    life_stage: "all",
    pet_size: "all",
  },
  {
    handle: "bebedero-portatil",
    species: ["dog"],
    life_stage: "all",
    pet_size: "all",
  },
  {
    handle: "juguete-mordedor",
    species: ["dog"],
    life_stage: "all",
    pet_size: "all",
  },
  {
    handle: "pelota-interactiva",
    species: ["dog", "cat"],
    life_stage: "all",
    pet_size: "all",
  },
]

const sameCodes = (left: (string | null | undefined)[], right: string[]) => {
  const a = [...left].filter(Boolean).sort()
  const b = [...right].sort()

  return a.length === b.length && a.every((code, index) => code === b[index])
}

export default async function bootstrapVetDomain({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const petProductModule =
    container.resolve<PetProductModuleService>(PET_PRODUCT_MODULE)

  logger.info("Bootstrapping veterinary commercial domain (brand + pet product)")

  // ------------------------------------------------------------- species ---
  const { data: existingSpecies } = await query.graph({
    entity: "pet_product_species",
    fields: ["id", "code"],
  })

  const speciesByCode = new Map(
    ((existingSpecies ?? []) as Row[]).map((row) => [
      row.code as string,
      row.id as string,
    ])
  )

  let speciesCreated = 0

  for (const seed of SPECIES) {
    if (speciesByCode.has(seed.code)) {
      continue
    }

    const [created] = await petProductModule.createPetProductSpecies([
      { code: seed.code, name: seed.name, sort_order: seed.sort_order },
    ])

    speciesByCode.set(seed.code, created.id)
    speciesCreated += 1
    logger.info(`Created species "${seed.code}" (${created.id})`)
  }

  logger.info(
    `Species created: ${speciesCreated}. Total now: ${speciesByCode.size} (${[
      ...speciesByCode.keys(),
    ]
      .sort()
      .join(", ")})`
  )

  // -------------------------------------------------------------- brands ---
  const { data: categoryRows } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle"],
  })

  const categoryHandleById = new Map(
    ((categoryRows ?? []) as Row[]).map((row) => [
      row.id as string,
      row.handle as string,
    ])
  )

  const { data: existingBrands } = await query.graph({
    entity: "brand",
    fields: ["id", "handle"],
  })

  const brandIdByCategory = new Map<string, string>()
  let brandsCreated = 0

  for (const seed of BRANDS) {
    const handle = toBrandHandle(seed.name)
    let brandId = ((existingBrands ?? []) as Row[]).find(
      (row) => row.handle === handle
    )?.id as string | undefined

    if (!brandId) {
      const { result } = await createBrandWorkflow(container).run({
        input: {
          brand: {
            name: seed.name,
            handle,
            description: seed.description,
            logo_url: null,
          },
        },
      })

      brandId = result[0].id
      brandsCreated += 1
      logger.info(`Created brand "${seed.name}" (${handle}, ${brandId})`)
    }

    brandIdByCategory.set(seed.category, brandId)
  }

  logger.info(
    `Brands created: ${brandsCreated}. Total now: ${brandIdByCategory.size}`
  )

  // ------------------------------------------------------------ products ---
  const { data: productRows } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "categories.id", "brand.id"],
  })

  const products = (productRows ?? []) as {
    id: string
    handle: string
    categories?: { id: string }[] | null
    brand?: { id?: string | null } | null
  }[]

  const productByHandle = new Map(products.map((product) => [product.handle, product]))

  const missing = PROFILES.filter((seed) => !productByHandle.has(seed.handle))

  if (missing.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Missing demo products: ${missing
        .map((seed) => seed.handle)
        .join(", ")}. Run bootstrap-vet-catalog.ts first.`
    )
  }

  // ------------------------------------- brand per product, by top category ---
  let brandsAssigned = 0
  let brandsUnchanged = 0

  for (const product of products) {
    const categoryHandles = (product.categories ?? [])
      .map((category) => categoryHandleById.get(category.id))
      .filter((handle): handle is string => Boolean(handle))

    const matched = BRANDS.find((seed) => categoryHandles.includes(seed.category))

    if (!matched) {
      continue
    }

    const brandId = brandIdByCategory.get(matched.category)

    if (!brandId) {
      continue
    }

    if (product.brand?.id === brandId) {
      brandsUnchanged += 1
      continue
    }

    await assignBrandToProductWorkflow(container).run({
      input: { product_id: product.id, brand_id: brandId },
    })

    brandsAssigned += 1
    logger.info(`Assigned "${matched.name}" to "${product.handle}"`)
  }

  logger.info(
    `Brands assigned: ${brandsAssigned}, already correct: ${brandsUnchanged}`
  )

  // ------------------------------------------------- pet product profiles ---
  let profilesWritten = 0
  let profilesUnchanged = 0

  for (const seed of PROFILES) {
    const product = productByHandle.get(seed.handle)!

    const { data: current } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "pet_product_profile.id",
        "pet_product_profile.life_stage",
        "pet_product_profile.pet_size",
        "pet_product_profile.species.code",
      ],
      filters: { id: product.id },
    })

    const profile = (current[0] as
      | {
          pet_product_profile?: {
            life_stage?: string | null
            pet_size?: string | null
            species?: { code?: string | null }[] | null
          } | null
        }
      | undefined)?.pet_product_profile

    if (
      profile &&
      profile.life_stage === seed.life_stage &&
      profile.pet_size === seed.pet_size &&
      sameCodes(
        (profile.species ?? []).map((entry) => entry.code),
        seed.species
      )
    ) {
      profilesUnchanged += 1
      continue
    }

    await upsertPetProductProfileWorkflow(container).run({
      input: {
        product_id: product.id,
        life_stage: seed.life_stage,
        pet_size: seed.pet_size,
        species_codes: seed.species,
      },
    })

    profilesWritten += 1
    logger.info(
      `Profile "${seed.handle}": ${seed.species.join("+")} / ${seed.life_stage} / ${seed.pet_size}`
    )
  }

  logger.info(
    `Profiles written: ${profilesWritten}, already correct: ${profilesUnchanged}`
  )

  // -------------------------------------------------------------- totals ---
  const { data: brandRows } = await query.graph({
    entity: "brand",
    fields: ["id"],
  })
  const { data: speciesRows } = await query.graph({
    entity: "pet_product_species",
    fields: ["id"],
  })
  const { data: profileRows } = await query.graph({
    entity: "pet_product_profile",
    fields: ["id"],
  })

  logger.info(
    `Totals -> brands: ${(brandRows ?? []).length}, species: ${(speciesRows ?? [])
      .length}, profiles: ${(profileRows ?? []).length}`
  )

  // -------------------------------------------------------------- search ---
  // The v3 index reads `brand.*` and `pet_product_profile.*` through the module
  // links. Writing a link emits no product event, so the products are replayed
  // here exactly like bootstrap-vet-catalog.ts already does. Idempotent.
  const search = container.resolve(Modules.SEARCH)
  const { data: allProducts } = await query.graph({
    entity: "product",
    fields: ["id"],
  })

  try {
    for (const product of (allProducts ?? []) as { id: string }[]) {
      await search.ingest({
        name: "product.updated",
        data: { id: product.id },
      } as never)
    }

    logger.info(
      `Search index refreshed for ${(allProducts ?? []).length} product(s).`
    )
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    if (errorMsg.includes("no active version yet")) {
      logger.warn(
        `Search index ingestion skipped (index is filled when application starts): ${errorMsg}`
      )
    } else {
      throw err
    }
  }
  logger.info("Veterinary commercial domain finished.")
}
