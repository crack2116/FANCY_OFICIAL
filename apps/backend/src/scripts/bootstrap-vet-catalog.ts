/**
 * FancyPeru — veterinary demo catalogue (idempotent).
 *
 * Creates a small, clearly-labelled demo catalogue used to exercise the
 * storefront: rails, category pages, search, cart and checkout in PEN.
 *
 *   pnpm exec medusa exec ./src/scripts/bootstrap-vet-catalog.ts
 *
 * Rules honoured here:
 *  - Official Medusa workflows only. No raw SQL, no manual inventory_level rows.
 *  - Upstream demo data is never modified or removed.
 *  - Re-running creates nothing: every product is keyed by a deterministic
 *    handle and skipped when it already exists.
 *  - Prices are created directly in PEN. No EUR conversion.
 *  - "Ofertas" is a real Medusa **price list**, so the discount the storefront
 *    shows is computed by Medusa rather than hardcoded in the UI.
 *  - "Farmacia" is intentionally left EMPTY: no prescription products, no
 *    medical claims. The storefront renders a proper empty state for it.
 *
 * TODO: Peru stock location migration (currently "European Warehouse").
 * Demo inventory is placed in the existing stock location on purpose, to keep
 * checkout working. Do not migrate inventory in this script.
 */
import {
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createPriceListsWorkflow,
  updatePriceListsWorkflow,
  createProductOptionsWorkflow,
  createProductsWorkflow,
  deleteProductOptionsWorkflow,
  removePriceListPricesWorkflow,
  batchLinkProductsToCollectionWorkflow,
  batchPriceListPricesWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

const CURRENCY = "pen"
const COUNTRY_CODE = "pe"

/** Demo artwork is served by the storefront; absolute so Admin can render it too. */
const STOREFRONT_URL = process.env.STOREFRONT_URL ?? "http://localhost:8000"
const image = (name: string) => `${STOREFRONT_URL}/demo/${name}.svg`

type VariantSeed = { title: string; price: number; stock: number }
type ProductSeed = {
  handle: string
  title: string
  subtitle: string
  description: string
  category: string
  image: string
  weight: number
  variants: VariantSeed[]
  /** When true, the variant is also offered at a discount through a price list. */
  onSale?: boolean
}

/**
 * Prices are realistic Peruvian retail figures used only to exercise the UI.
 * They are not business prices.
 */
const PRODUCTS: ProductSeed[] = [
  {
    handle: "alimento-adulto-razas-medianas",
    title: "Alimento Adulto Razas Medianas",
    subtitle: "Datos demo",
    description:
      "Alimento seco para perros adultos de raza mediana. Producto de demostración para probar la tienda; no es un producto real ni cuenta con respaldo veterinario.",
    category: "alimentos",
    image: "alimento",
    weight: 3000,
    variants: [
      { title: "3 kg", price: 89, stock: 50 },
      { title: "8 kg", price: 189, stock: 30 },
      { title: "15 kg", price: 329, stock: 20 },
    ],
  },
  {
    handle: "alimento-cachorro",
    title: "Alimento Cachorro",
    subtitle: "Datos demo",
    description:
      "Alimento seco para puppies. Producto de demostración; no es un producto real.",
    category: "alimentos",
    image: "alimento",
    weight: 2000,
    variants: [
      { title: "2 kg", price: 69, stock: 50 },
      { title: "5 kg", price: 139, stock: 30 },
    ],
  },
  {
    handle: "alimento-senior",
    title: "Alimento Senior",
    subtitle: "Datos demo",
    description:
      "Alimento seco para perros mayores. Producto de demostración; no es un producto real.",
    category: "alimentos",
    image: "alimento",
    weight: 3000,
    variants: [
      { title: "3 kg", price: 95, stock: 30 },
      { title: "8 kg", price: 199, stock: 20 },
    ],
  },
  {
    handle: "snack-dental-demo",
    title: "Snack Dental Demo",
    subtitle: "Datos demo",
    description:
      "Snack de demostración para uso diario. Producto de demostración; no es un producto real.",
    category: "alimentos",
    image: "snack",
    weight: 120,
    variants: [{ title: "120 g", price: 24, stock: 50 }],
  },
  {
    handle: "snacks-croquetas-artesanales",
    title: "Snacks Croquetas Artesanales",
    subtitle: "Datos demo",
    description:
      "Croquetas de demostración para premio o acompañamiento. Producto de demostración; no es un producto real.",
    category: "alimentos",
    image: "snack",
    weight: 250,
    variants: [{ title: "250 g", price: 32, stock: 40 }],
  },
  {
    handle: "shampoo-suave-para-perros",
    title: "Shampoo Suave para Perros",
    subtitle: "Datos demo",
    description:
      "Shampoo de uso cosmético para el baño routine. Producto de demostración; no es un producto real ni un medicamento.",
    category: "higiene",
    image: "higiene",
    weight: 500,
    variants: [
      { title: "250 ml", price: 28, stock: 50 },
      { title: "500 ml", price: 45, stock: 30 },
    ],
    onSale: true,
  },
  {
    handle: "toallitas-de-higiene",
    title: "Toallitas de Higiene",
    subtitle: "Datos demo",
    description:
      "Toallitas de demostración para la limpieza diaria. Producto de demostración; no es un producto real.",
    category: "higiene",
    image: "higiene",
    weight: 80,
    variants: [{ title: "Paquete 80 u", price: 18, stock: 50 }],
  },
  {
    handle: "cepillo-dental-para-perros",
    title: "Cepillo Dental para Perros",
    subtitle: "Datos demo",
    description:
      "Cepillo de demostración para el cuidado dental routine. Producto de demostración; no es un producto real ni tiene indicación veterinaria.",
    category: "salud",
    image: "salud",
    weight: 90,
    variants: [{ title: "Unidad", price: 21, stock: 40 }],
  },
  {
    handle: "correa-ajustable",
    title: "Correa Ajustable",
    subtitle: "Datos demo",
    description:
      "Correa de demostración con ajuste manual. Producto de demostración; no es un producto real.",
    category: "accesorios",
    image: "accesorio",
    weight: 200,
    variants: [
      { title: "S", price: 35, stock: 30 },
      { title: "M", price: 42, stock: 50 },
      { title: "L", price: 49, stock: 30 },
    ],
    onSale: true,
  },
  {
    handle: "collar-reflectivo",
    title: "Collar Reflectivo",
    subtitle: "Datos demo",
    description:
      "Collar de demostración con detalle reflectante. Producto de demostración; no es un producto real.",
    category: "accesorios",
    image: "accesorio",
    weight: 120,
    variants: [
      { title: "S", price: 29, stock: 30 },
      { title: "M", price: 34, stock: 50 },
      { title: "L", price: 39, stock: 30 },
    ],
  },
  {
    handle: "cama-acolchada",
    title: "Cama Acolchada",
    subtitle: "Datos demo",
    description:
      "Cama de demostración con acolchado. Producto de demostración; no es un producto real.",
    category: "accesorios",
    image: "accesorio",
    weight: 1500,
    variants: [
      { title: "Mediana", price: 129, stock: 20 },
      { title: "Grande", price: 179, stock: 20 },
    ],
    onSale: true,
  },
  {
    handle: "bebedero-portatil",
    title: "Bebedero Portátil",
    subtitle: "Datos demo",
    description:
      "Bebedero de demostración para paseos. Producto de demostración; no es un producto real.",
    category: "accesorios",
    image: "accesorio",
    weight: 300,
    variants: [{ title: "Unidad", price: 39, stock: 40 }],
  },
  {
    handle: "juguete-mordedor",
    title: "Juguete Mordedor",
    subtitle: "Datos demo",
    description:
      "Juguete de demostración para mordida supervised. Producto de demostración; no es un producto real.",
    category: "juguetes",
    image: "juguete",
    weight: 150,
    variants: [
      { title: "Chico", price: 19, stock: 50 },
      { title: "Mediano", price: 25, stock: 40 },
    ],
    onSale: true,
  },
  {
    handle: "pelota-interactiva",
    title: "Pelota Interactiva",
    subtitle: "Datos demo",
    description:
      "Pelota de demostración para juego. Producto de demostración; no es un producto real.",
    category: "juguetes",
    image: "juguete",
    weight: 200,
    variants: [{ title: "Unidad", price: 22, stock: 50 }],
  },
]

/** Discount applied to the products flagged `onSale`, as a percentage. */
const SALE_PERCENTAGE = 15
const PRICE_LIST_TITLE = "Ofertas (demo)"

/**
 * Shared option title for every demo variant.
 *
 * `variant.options` must be keyed by the option TITLE, not its id: the product
 * module resolves variant values with `options.find((o) => o.title === key)`
 * (see @medusajs/product product-module-service `assignOptionsToVariants`).
 * Keying by id fails with "Option value <x> does not exist for option <id>".
 */
const OPTION_TITLE = "Presentación"

const COLLECTIONS = [
  { handle: "destacados", title: "Destacados" },
  { handle: "nuevos", title: "Nuevos" },
  { handle: "ofertas", title: "Ofertas" },
]

const FEATURED = [
  "alimento-adulto-razas-medianas",
  "shampoo-suave-para-perros",
  "correa-ajustable",
  "cama-acolchada",
  "juguete-mordedor",
  "toallitas-de-higiene",
]

const NEW = [
  "pelota-interactiva",
  "cepillo-dental-para-perros",
  "bebedero-portatil",
  "collar-reflectivo",
  "snacks-croquetas-artesanales",
]

type Row = Record<string, unknown>

export default async function bootstrapVetCatalog({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  logger.info("Bootstrapping veterinary demo catalogue")

  // ---------------------------------------------------------------- setup ---
  const [{ data: categories }, { data: salesChannels }, { data: profiles }, { data: locations }, { data: regions }] =
    await Promise.all([
      query.graph({
        entity: "product_category",
        fields: ["id", "handle", "name", "parent_category"],
      }),
      query.graph({ entity: "sales_channel", fields: ["id", "name"] }),
      query.graph({ entity: "shipping_profile", fields: ["id", "name"] }),
      query.graph({ entity: "stock_location", fields: ["id", "name"] }),
      query.graph({ entity: "region", fields: ["id", "name", "currency_code"] }),
    ])

  const topLevelCategories = (categories ?? []).filter(
    (category: Row) => !category.parent_category
  ) as unknown as { id: string; handle: string; name: string }[]
  const categoryByHandle = new Map(
    topLevelCategories.map((category) => [category.handle, category])
  )

  const missingCategories = [
    ...new Set(PRODUCTS.map((product) => product.category)),
  ].filter((handle) => !categoryByHandle.has(handle))

  if (missingCategories.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Missing top-level categories: ${missingCategories.join(", ")}. Run bootstrap-vet-taxonomy.ts first.`
    )
  }

  const salesChannel = (salesChannels ?? [])[0] as { id: string } | undefined
  const shippingProfile = (profiles ?? [])[0] as { id: string } | undefined
  const stockLocation = (locations ?? [])[0] as { id: string; name: string } | undefined
  const peruRegion = (regions ?? []).find(
    (region: Row) => region.currency_code === CURRENCY
  ) as { id: string } | undefined

  if (!salesChannel || !shippingProfile || !stockLocation || !peruRegion) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Missing sales channel, shipping profile, stock location or Peru region. Run bootstrap-peru.ts first."
    )
  }

  logger.info(
    `Using stock location "${stockLocation.name}" (TODO: Peru stock location migration is a separate phase).`
  )

  // -------------------------------------------------------------- options ---
  // One shared "Presentación" option keeps variant labelling consistent.
  // Its values must exist, otherwise variants end up with no options and the
  // product page cannot render a selector.
  const presentationValues = [
    ...new Set(PRODUCTS.flatMap((product) => product.variants.map((v) => v.title))),
  ]

  const { data: optionRows } = await query.graph({
    entity: "product_option",
    fields: ["id", "title", "values.value"],
  })
  const existingOptions = (optionRows ?? []) as {
    id: string
    title: string
    values?: { value: string }[]
  }[]

  let presentacion = existingOptions.find(
    (option) => option.title.toLowerCase() === OPTION_TITLE.toLowerCase()
  )

  if (presentacion && !(presentacion.values?.length ?? 0)) {
    // A previous run created the option without values. Recreate it cleanly
    // instead of patching a half-configured option.
    await deleteProductOptionsWorkflow(container).run({
      input: { ids: [presentacion.id] },
    })
    presentacion = undefined
    logger.info(`Removed an empty "${OPTION_TITLE}" option from a previous run.`)
  }

  if (!presentacion) {
    const { result } = await createProductOptionsWorkflow(container).run({
      input: {
        product_options: [
          {
            title: OPTION_TITLE,
            values: presentationValues,
          },
        ],
      },
    })
    presentacion = result?.[0]
    logger.info(
      `Created product option "${OPTION_TITLE}" with ${presentationValues.length} values (${presentacion?.id})`
    )
  }

  const presentacionId = presentacion!.id

  // ----------------------------------------------------------- products ---
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "title"],
  })
  const existingHandles = new Set(
    ((existingProducts ?? []) as { handle: string }[]).map((product) => product.handle)
  )

  const toCreate = PRODUCTS.filter(
    (product) => !existingHandles.has(product.handle)
  )

  if (toCreate.length) {
    await createProductsWorkflow(container).run({
      input: {
        products: toCreate.map((product) => {
          const thumbnail = image(product.image)
          const category = categoryByHandle.get(product.category)
          return {
            title: product.title,
            handle: product.handle,
            subtitle: product.subtitle,
            description: product.description,
            status: ProductStatus.PUBLISHED,
            thumbnail,
            images: [{ url: thumbnail }],
            weight: product.weight,
            shipping_profile_id: shippingProfile.id,
            category_ids: category ? [category.id] : [],
            sales_channels: [{ id: salesChannel.id }],
            options: [{ id: presentacionId }],
            variants: product.variants.map((variant) => ({
              title: variant.title,
              sku: buildSku(product.handle, variant.title),
              manage_inventory: true,
              allow_backorder: false,
              options: { [OPTION_TITLE]: variant.title },
              prices: [{ amount: variant.price, currency_code: CURRENCY }],
            })),
          }
        }) as never,
      },
    })
    logger.info(`Created ${toCreate.length} demo products`)
  } else {
    logger.info("All demo products already exist. Products: nothing to create.")
  }

  // ------------------------------------------------------------ inventory ---
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "sku", "location_levels.location_id"],
  })

  const items = (inventoryItems ?? []) as {
    id: string
    sku?: string | null
    location_levels?: { location_id: string }[]
  }[]

  const stockedAtLocation = new Set(
    items.flatMap((item) =>
      (item.location_levels ?? []).map((level) => `${item.id}:${level.location_id}`)
    )
  )

  const levelsBySku = new Map(
    PRODUCTS.flatMap((product) =>
      product.variants.map((variant) => [
        buildSku(product.handle, variant.title),
        variant.stock,
      ])
    )
  )

  const levelsToCreate = items
    .filter((item) => {
      if (!item.sku || !levelsBySku.has(item.sku)) {
        return false
      }
      return !stockedAtLocation.has(`${item.id}:${stockLocation.id}`)
    })
    .map((item) => ({
      location_id: stockLocation.id,
      stocked_quantity: levelsBySku.get(item.sku!),
      inventory_item_id: item.id,
    }))

  if (levelsToCreate.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: { inventory_levels: levelsToCreate },
    })
    logger.info(
      `Created ${levelsToCreate.length} inventory levels (DEMO SKUs only)`
    )
  } else {
    logger.info("All demo inventory levels already exist.")
  }

  // ---------------------------------------------------------- collections ---
  const { data: collectionRows } = await query.graph({
    entity: "product_collection",
    fields: ["id", "handle", "title"],
  })
  const existingCollections = (collectionRows ?? []) as {
    id: string
    handle: string
  }[]
  const collectionByHandle = new Map(
    existingCollections.map((collection) => [collection.handle, collection])
  )

  const missingCollections = COLLECTIONS.filter(
    (collection) => !collectionByHandle.has(collection.handle)
  )

  if (missingCollections.length) {
    const { result } = await createCollectionsWorkflow(container).run({
      input: {
        collections: missingCollections.map((collection) => ({
          title: collection.title,
          handle: collection.handle,
        })),
      },
    })
    for (const collection of result ?? []) {
      collectionByHandle.set(collection.handle, {
        id: collection.id,
        handle: collection.handle,
      })
    }
    logger.info(
      `Created ${missingCollections.length} collections: ${missingCollections
        .map((collection) => collection.handle)
        .join(", ")}`
    )
  } else {
    logger.info("All merchandising collections already exist.")
  }

  // ------------------------------------------------- merchandising links ---
  const { data: productRows } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
  })
  const productIdByHandle = new Map(
    ((productRows ?? []) as { id: string; handle: string }[]).map((product) => [
      product.handle,
      product.id,
    ])
  )

  const merchandising: { collection: string; handles: string[] }[] = [
    { collection: "destacados", handles: FEATURED },
    { collection: "nuevos", handles: NEW },
    // Mirrors the products that receive a price-list discount, so the offers
    // rail is backed by real data instead of a hand-written discount badge.
    {
      collection: "ofertas",
      handles: PRODUCTS.filter((product) => product.onSale).map(
        (product) => product.handle
      ),
    },
  ]

  for (const entry of merchandising) {
    const collection = collectionByHandle.get(entry.collection)
    if (!collection) {
      continue
    }
    const wanted = entry.handles
      .map((handle) => productIdByHandle.get(handle))
      .filter((id): id is string => Boolean(id))

    const { data: linked } = await query.graph({
      entity: "product_collection",
      fields: ["id", "products.id"],
      filters: { id: collection.id },
    })
    const alreadyLinked = new Set(
      (((linked ?? [])[0] as { products?: { id: string }[] })?.products ?? []).map(
        (product) => product.id
      )
    )
    const toAdd = wanted.filter((id) => !alreadyLinked.has(id))

    if (toAdd.length) {
      await batchLinkProductsToCollectionWorkflow(container).run({
        input: { id: collection.id, add: toAdd },
      })
      logger.info(`Linked ${toAdd.length} products to "${entry.collection}"`)
    } else {
      logger.info(`Collection "${entry.collection}" already linked.`)
    }
  }

  // ------------------------------------------------------------ price list ---
  // "Ofertas" is a real Medusa price list scoped to the Peru region, so the
  // discount the storefront renders is computed by Medusa from these prices
  // rather than hardcoded in the UI.
  const { data: priceListRows } = await query.graph({
    entity: "price_list",
    fields: ["id", "title", "status"],
  })

  type PriceListRow = {
    id: string
    title: string
    status?: string
  }

  let offersPriceList = ((priceListRows ?? []) as unknown as PriceListRow[]).find(
    (list) => list.title === PRICE_LIST_TITLE
  )

  if (!offersPriceList) {
    const { result } = await createPriceListsWorkflow(container).run({
      input: {
        price_lists_data: [
          {
            title: PRICE_LIST_TITLE,
            description:
              "Precio de demostración para la sección Ofertas. No es un precio comercial.",
            // A draft price list is ignored when prices are calculated, so the
            // storefront would never see the discount. It must be active.
            status: "active",
            rules: { region_id: [peruRegion.id] },
          },
        ],
      },
    })
    offersPriceList = result?.[0] as unknown as PriceListRow
    logger.info(
      `Created price list "${PRICE_LIST_TITLE}" (${offersPriceList?.id})`
    )
  } else if (offersPriceList.status !== "active") {
    // A list left in draft by an earlier run silently disables every offer price.
    await updatePriceListsWorkflow(container).run({
      input: {
        price_lists_data: [{ id: offersPriceList.id, status: "active" }],
      },
    })
    const previous = offersPriceList.status
    offersPriceList.status = "active"
    logger.info(
      `Activated existing price list "${PRICE_LIST_TITLE}" (was "${previous}").`
    )
  }

  // Re-running must not duplicate offer prices. There is no `price_list_price`
  // link table, `price_list.prices` does not resolve and `price_rule` is not a
  // queryable entity, so rather than trying to detect which variants are already
  // priced we remove the previously applied rows and re-apply the demo prices.
  // Idempotent by construction, official workflows only.
  const { data: existingOfferPrices } = await query.graph({
    entity: "price",
    fields: ["id"],
    filters: { price_list_id: offersPriceList!.id },
  })
  const existingOfferPriceIds = (
    (existingOfferPrices ?? []) as { id: string }[]
  ).map((price) => price.id)

  if (existingOfferPriceIds.length) {
    await removePriceListPricesWorkflow(container).run({
      input: { ids: existingOfferPriceIds },
    })
    logger.info(
      `Removed ${existingOfferPriceIds.length} previously applied offer price(s) before re-applying.`
    )
  }

  const saleSeeds = PRODUCTS.filter((product) => product.onSale)
  const saleLines: {
    variant_id: string
    amount: number
    currency_code: string
  }[] = []

  for (const product of saleSeeds) {
    const { data: variantRows } = await query.graph({
      entity: "product_variant",
      fields: ["id", "title", "sku"],
      filters: { product_id: productIdByHandle.get(product.handle) ?? "__none__" },
    })

    for (const variant of (variantRows ?? []) as {
      id: string
      title: string
    }[]) {
      const seed = product.variants.find((entry) => entry.title === variant.title)
      if (!seed) {
        continue
      }
      saleLines.push({
        variant_id: variant.id,
        amount: Math.round(seed.price * (1 - SALE_PERCENTAGE / 100)),
        currency_code: CURRENCY,
      })
    }
  }

  if (saleLines.length && offersPriceList) {
    await batchPriceListPricesWorkflow(container).run({
      input: {
        data: {
          id: offersPriceList.id,
          create: saleLines,
          update: [],
          delete: [],
        },
      },
    })
    logger.info(
      `Applied ${SALE_PERCENTAGE}% demo discount to ${saleLines.length} variants`
    )
  } else {
    logger.info("Offer prices already exist. Nothing to apply.")
  }

  // ------------------------------------------------------- search index ---
  // The storefront catalogue is powered by the search module, and
  // `product.created` is handled asynchronously on the local event bus.
  // When running standalone before server start, active index may not be initialized yet.
  try {
    const search = container.resolve(Modules.SEARCH)
    const { data: allProducts } = await query.graph({
      entity: "product",
      fields: ["id"],
    })

    for (const product of (allProducts ?? []) as { id: string }[]) {
      await search.ingest({
        name: "product.created",
        data: [{ id: product.id }],
      } as never)
    }

    logger.info(
      `Search index refreshed for ${(allProducts ?? []).length} product(s).`
    )
  } catch (searchErr) {
    logger.warn(
      `Search index ingestion skipped (index is filled when application starts): ${searchErr instanceof Error ? searchErr.message : String(searchErr)}`
    )
  }
  logger.info("Veterinary demo catalogue finished.")
}

/** Mirrors the SKU construction used when creating variants. */
function buildSku(handle: string, variantTitle: string) {
  return `DEMO-${handle.toUpperCase().replace(/-/g, "").slice(0, 42)}-${variantTitle
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 10)}`
}