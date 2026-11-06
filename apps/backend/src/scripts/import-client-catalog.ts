/**
 * ============================================================================
 * FancyPeru — Robust Client Catalog Importer (CSV to Medusa 2)
 * ============================================================================
 *
 * Imports the real client catalog from a CSV file into Medusa with:
 *   - Strict input validation (SKU format, positive PEN prices, valid stock).
 *   - Duplicate SKU detection in file.
 *   - Graceful updates for already existing products (price & stock update).
 *   - Automatic brand linkage.
 *   - Comprehensive summary report (created, updated, rejected).
 *   - Non-destructive: Malformed rows are rejected individually without
 *     corrupting valid rows or existing catalog data.
 *
 * Usage:
 *   pnpm exec medusa exec ./src/scripts/import-client-catalog.ts -- /path/to/catalog.csv
 */
import fs from "fs"
import path from "path"
import {
  createInventoryLevelsWorkflow,
  createProductsWorkflow,
  updateInventoryLevelsWorkflow,
  upsertVariantPricesWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

import { toBrandHandle } from "../lib/brand-handle"
import { createBrandWorkflow } from "../workflows/brand-crud"
import { assignBrandToProductWorkflow } from "../workflows/brand-product-link"

export interface CatalogRow {
  marca: string
  sku: string
  titulo: string
  subtitulo?: string
  categoria?: string
  especie?: string
  etapa_vida?: string
  tamano_mascota?: string
  precio_pen: string
  stock_inicial: string
  descripcion?: string
  requiere_receta?: string
}

export interface ValidationResult {
  valid: boolean
  row?: CatalogRow
  lineNumber: number
  errors: string[]
}

export interface ImportSummary {
  totalRows: number
  created: number
  updated: number
  rejected: number
  rejectionDetails: Array<{ lineNumber: number; sku: string; reasons: string[] }>
}

/**
 * Validates a single catalog CSV row.
 */
export function validateCatalogRow(
  raw: Record<string, string>,
  lineNumber: number,
  seenSkus: Set<string>
): ValidationResult {
  const errors: string[] = []
  const sku = (raw.sku || "").trim()
  const title = (raw.titulo || "").trim()
  const priceRaw = (raw.precio_pen || "").trim()
  const stockRaw = (raw.stock_inicial || "").trim()

  if (!sku) {
    errors.push("Missing SKU")
  } else if (!/^[A-Za-z0-9-_.]+$/.test(sku)) {
    errors.push(`Invalid SKU format "${sku}". Must be alphanumeric with hyphens/underscores.`)
  } else if (seenSkus.has(sku.toLowerCase())) {
    errors.push(`Duplicate SKU "${sku}" detected in CSV file.`)
  }

  if (!title || title.length < 3) {
    errors.push(`Title is missing or too short (min 3 chars). Received "${title}".`)
  }

  const price = parseFloat(priceRaw)
  if (isNaN(price) || price <= 0) {
    errors.push(`Invalid price_pen "${priceRaw}". Must be a positive number greater than 0.`)
  }

  const stock = parseInt(stockRaw, 10)
  if (isNaN(stock) || stock < 0) {
    errors.push(`Invalid stock_inicial "${stockRaw}". Must be an integer >= 0.`)
  }

  if (sku) {
    seenSkus.add(sku.toLowerCase())
  }

  if (errors.length > 0) {
    return { valid: false, lineNumber, errors }
  }

  return {
    valid: true,
    lineNumber,
    errors: [],
    row: {
      marca: (raw.marca || "").trim(),
      sku,
      titulo: title,
      subtitulo: (raw.subtitulo || "").trim(),
      categoria: (raw.categoria || "").trim(),
      especie: (raw.especie || "").trim(),
      etapa_vida: (raw.etapa_vida || "").trim(),
      tamano_mascota: (raw.tamano_mascota || "").trim(),
      precio_pen: price.toFixed(2),
      stock_inicial: stock.toString(),
      descripcion: (raw.descripcion || "").trim(),
      requiere_receta: (raw.requiere_receta || "NO").trim().toUpperCase(),
    },
  }
}

/**
 * Parses and validates CSV content into validated rows.
 */
export function parseCatalogCsv(csvContent: string): {
  validRows: Array<{ row: CatalogRow; lineNumber: number }>
  rejectedRows: Array<{ lineNumber: number; sku: string; reasons: string[] }>
} {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length <= 1) {
    return { validRows: [], rejectedRows: [] }
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())
  const validRows: Array<{ row: CatalogRow; lineNumber: number }> = []
  const rejectedRows: Array<{ lineNumber: number; sku: string; reasons: string[] }> = []
  const seenSkus = new Set<string>()

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim())
    const raw: Record<string, string> = {}
    headers.forEach((h, idx) => {
      raw[h] = values[idx] || ""
    })

    const validation = validateCatalogRow(raw, i + 1, seenSkus)
    if (validation.valid && validation.row) {
      validRows.push({ row: validation.row, lineNumber: validation.lineNumber })
    } else {
      rejectedRows.push({
        lineNumber: validation.lineNumber,
        sku: raw.sku || "UNKNOWN",
        reasons: validation.errors,
      })
    }
  }

  return { validRows, rejectedRows }
}

export default async function importClientCatalog({ container, args }: ExecArgs): Promise<ImportSummary> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const csvPath =
    process.env.CATALOG_CSV_PATH ||
    args?.[0] ||
    path.resolve(process.cwd(), "../../docs/PLANTILLA_CATALOGO_CLIENTE.csv")

  const summary: ImportSummary = {
    totalRows: 0,
    created: 0,
    updated: 0,
    rejected: 0,
    rejectionDetails: [],
  }

  if (!fs.existsSync(csvPath)) {
    logger.error(`CSV file not found at: ${csvPath}`)
    return summary
  }

  logger.info(`Starting client catalog import from: ${csvPath}`)
  const content = fs.readFileSync(csvPath, "utf-8")
  const { validRows, rejectedRows } = parseCatalogCsv(content)

  summary.totalRows = validRows.length + rejectedRows.length
  summary.rejected = rejectedRows.length
  summary.rejectionDetails = rejectedRows

  if (rejectedRows.length > 0) {
    logger.warn(`Rejected ${rejectedRows.length} invalid rows in CSV:`)
    rejectedRows.forEach((r) => {
      logger.warn(`  Line ${r.lineNumber} (SKU: ${r.sku}): ${r.reasons.join(", ")}`)
    })
  }

  if (validRows.length === 0) {
    logger.warn("No valid rows to process.")
    return summary
  }

  // Resolve Stock Location
  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  })
  const stockLocation = stockLocations?.[0]

  // Resolve Shipping Profile
  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "name"],
  })
  const shippingProfile = shippingProfiles?.[0]

  for (const { row } of validRows) {
    const handle = row.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    const pricePen = parseFloat(row.precio_pen)
    const stock = parseInt(row.stock_inicial, 10)

    // Check if product exists
    const { data: existingProducts } = await query.graph({
      entity: "product",
      fields: ["id", "handle", "variants.id", "variants.sku"],
      filters: { handle },
    })

    const existing = existingProducts?.[0]

    if (existing) {
      // UPDATE MODE: Update price and stock without creating duplicate product
      const variant = existing.variants?.[0]
      if (variant) {
        await upsertVariantPricesWorkflow(container).run({
          input: {
            previousVariantIds: [variant.id],
            variantPrices: [
              {
                variant_id: variant.id,
                product_id: existing.id,
                prices: [{ currency_code: "pen", amount: pricePen }],
              },
            ],
          },
        })

        if (stockLocation && stock >= 0) {
          const { data: inventoryItems } = await query.graph({
            entity: "inventory_item",
            fields: ["id", "sku", "location_levels.id", "location_levels.location_id"],
            filters: { sku: row.sku },
          })

          const invItem = inventoryItems?.[0]
          if (invItem?.id) {
            const levels = (invItem.location_levels ?? []) as { id: string; location_id: string }[]
            const existingLevel = levels.find((l) => l.location_id === stockLocation.id)

            if (existingLevel) {
              await updateInventoryLevelsWorkflow(container).run({
                input: {
                  updates: [
                    {
                      inventory_item_id: invItem.id,
                      location_id: stockLocation.id,
                      stocked_quantity: stock,
                    },
                  ],
                },
              })
            } else {
              await createInventoryLevelsWorkflow(container).run({
                input: {
                  inventory_levels: [
                    {
                      inventory_item_id: invItem.id,
                      location_id: stockLocation.id,
                      stocked_quantity: stock,
                    },
                  ],
                },
              })
            }
          }
        }
      }

      summary.updated++
      logger.info(`[UPDATED] Product '${row.titulo}' (${row.sku}) updated. Price: S/ ${pricePen}, Stock: ${stock}.`)
      continue
    }

    // CREATE MODE:
    const { result: createdProducts } = await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: row.titulo,
            subtitle: row.subtitulo,
            description: row.descripcion,
            handle,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile?.id,
            options: [{ title: "Presentación", values: ["Unidad"] }],
            variants: [
              {
                title: "Unidad",
                sku: row.sku,
                manage_inventory: true,
                options: { Presentación: "Unidad" },
                prices: [{ currency_code: "pen", amount: pricePen }],
              },
            ],
          },
        ],
      },
    })

    const product = createdProducts[0]

    // Create / Link Brand
    if (row.marca) {
      const brandHandle = toBrandHandle(row.marca)
      const { data: brands } = await query.graph({
        entity: "brand",
        fields: ["id", "handle", "name"],
        filters: { handle: brandHandle },
      })

      let brandId = brands?.[0]?.id
      if (!brandId) {
        const { result: newBrand } = await createBrandWorkflow(container).run({
          input: {
            brand: {
              name: row.marca,
              handle: brandHandle,
            },
          },
        })
        brandId = newBrand[0]?.id
      }

      if (brandId) {
        await assignBrandToProductWorkflow(container).run({
          input: { product_id: product.id, brand_id: brandId },
        })
      }
    }

    // Set stock
    if (stockLocation && stock >= 0 && product.variants?.[0]?.id) {
      const { data: inventoryItems } = await query.graph({
        entity: "inventory_item",
        fields: ["id", "sku"],
        filters: { sku: row.sku },
      })

      if (inventoryItems?.[0]?.id) {
        await createInventoryLevelsWorkflow(container).run({
          input: {
            inventory_levels: [
              {
                inventory_item_id: inventoryItems[0].id,
                location_id: stockLocation.id,
                stocked_quantity: stock,
              },
            ],
          },
        })
      }
    }

    summary.created++
    logger.info(`[CREATED] Product '${row.titulo}' (${row.sku}) created. Price: S/ ${pricePen}, Stock: ${stock}.`)
  }

  logger.info("============================================================")
  logger.info(`  CATALOG IMPORT SUMMARY: Total=${summary.totalRows}, Created=${summary.created}, Updated=${summary.updated}, Rejected=${summary.rejected}`)
  logger.info("============================================================")

  return summary
}
