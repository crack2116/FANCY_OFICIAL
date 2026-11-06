/**
 * FancyPeru — Peru localization bootstrap.
 *
 * Idempotent and versioned: running it twice must converge to the same state
 * without creating duplicate regions, zones, shipping options or prices.
 * "If it exists -> verify/update. If not -> create."
 *
 *   pnpm exec medusa exec ./src/scripts/bootstrap-peru.ts
 *
 * Scope of this script (Phase 1.5): prove that Storefront -> Region Peru ->
 * Product -> PEN price -> PEN cart -> Checkout works end to end.
 *
 * It deliberately does NOT touch the upstream demo Europe region, its EUR
 * prices, or the demo catalogue.
 *
 * Prices and shipping rates created here are DEMONSTRATION VALUES with no
 * business meaning. Real pricing is out of scope.
 *
 * TODO: Peru tax configuration (IGV / SUNAT). No tax region is created for
 * "pe" on purpose. See docs/DECISIONS.md.
 */
import {
  createRegionsWorkflow,
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow,
  updateRegionsWorkflow,
  updateStoresWorkflow,
  upsertVariantPricesWorkflow,
} from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

import { loadApprovedShippingMatrix } from "../lib/shipping-config"

const REGION_NAME = "Perú"
const COUNTRY_CODE = "pe"
const CURRENCY_CODE = "pen"
const ZONE_NAME = "Perú"

/** Factor de referencia retail para inicialización base de variantes. */
const EUR_TO_PEN_BASE_RATE = 4.3

/**
 * Row shapes returned by `query.graph`. The graph API types its result loosely,
 * so each read is narrowed to an explicit local shape instead of being cast to
 * `any`. Nothing here uses `any`, `@ts-ignore` or an eslint-disable.
 */
type CurrencyRow = { currency_code?: string | null; is_default?: boolean | null }
type StoreRow = { id: string; supported_currencies?: (CurrencyRow | null)[] }
type CountryRow = { iso_2?: string | null }
type RegionRow = {
  id: string
  name?: string | null
  currency_code?: string | null
  countries?: (CountryRow | null)[]
}
type ServiceZoneRow = {
  id: string
  name?: string | null
  fulfillment_set_id?: string | null
}
type ShippingProfileRow = { id: string; name?: string | null }
type ShippingOptionRow = {
  id: string
  name?: string | null
  service_zone_id?: string | null
}
type VariantRow = { id: string; product_id: string; title?: string | null }
type VariantPriceSetRow = { variant_id: string; price_set_id?: string | null }
type PriceRow = {
  id: string
  amount: number
  currency_code: string
  price_set_id?: string | null
}

type ExistingPrice = {
  id: string
  currency_code: string
  amount: number
}

export default async function bootstrapPeru({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  logger.info(`Bootstrapping Peru localization (${COUNTRY_CODE} / ${CURRENCY_CODE})`)

  // ---------------------------------------------------------------- store ---
  // The store must support PEN, otherwise no PEN price can ever be resolved.
  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "supported_currencies.*"],
  })

  const store = stores[0] as StoreRow | undefined
  if (!store) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No store found. Run the initial data seed first."
    )
  }

  const currentCurrencies: CurrencyRow[] = (store.supported_currencies ?? []).filter(
    (currency): currency is CurrencyRow => Boolean(currency?.currency_code)
  )

  const hasPen = currentCurrencies.some(
    (currency) => currency.currency_code === CURRENCY_CODE
  )

  // PEN becomes the primary currency; eur/usd are preserved.
  const nextCurrencies: { currency_code: string; is_default: boolean }[] = [
    // `currentCurrencies` only contains rows with a non-empty currency_code.
    ...currentCurrencies
      .filter((currency) => currency.currency_code !== CURRENCY_CODE)
      .map((currency) => ({
        currency_code: currency.currency_code as string,
        is_default: false,
      })),
    { currency_code: CURRENCY_CODE, is_default: true },
  ]

  if (hasPen && currentCurrencies.find((c) => c.is_default)?.currency_code === CURRENCY_CODE) {
    logger.info("Store already supports PEN as default currency. Skipping update.")
  } else {
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: { supported_currencies: nextCurrencies },
      },
    })
    logger.info(
      `Store currencies updated -> ${nextCurrencies.map((c) => `${c.currency_code}${c.is_default ? " (default)" : ""}`).join(", ")}`
    )
  }

  // --------------------------------------------------------------- region ---
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2"],
  })

  const regionRows = regions as RegionRow[]

  const existingPeru = regionRows.find(
    (region) =>
      region.name === REGION_NAME ||
      region.countries?.some((country) => country?.iso_2 === COUNTRY_CODE)
  )

  let peruRegion: RegionRow | undefined = existingPeru

  if (!existingPeru) {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: REGION_NAME,
            currency_code: CURRENCY_CODE,
            countries: [COUNTRY_CODE],
            // Keep the development/manual provider only. No real gateway yet.
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    })
    peruRegion = result[0]
    if (!peruRegion) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to create the "${REGION_NAME}" region.`
      )
    }
    logger.info(`Region "${REGION_NAME}" created (${peruRegion.id}).`)
  } else {
    const needsUpdate =
      existingPeru.currency_code !== CURRENCY_CODE ||
      !existingPeru.countries?.some((country) => country?.iso_2 === COUNTRY_CODE)

    if (needsUpdate) {
      await updateRegionsWorkflow(container).run({
        input: {
          selector: { id: existingPeru.id },
          update: {
            name: REGION_NAME,
            currency_code: CURRENCY_CODE,
            countries: [COUNTRY_CODE],
          },
        },
      })
      logger.info(`Region "${REGION_NAME}" updated (${existingPeru.id}).`)
    } else {
      logger.info(`Region "${REGION_NAME}" already correct (${existingPeru.id}).`)
    }

    peruRegion = existingPeru
  }

  if (!peruRegion) {
    throw new MedusaError(
    MedusaError.Types.NOT_FOUND,
    `The "${REGION_NAME}" region could not be resolved.`
  )
  }

  // ---------------------------------------------------------------- prices ---
  // Variant prices live in price sets linked to the variant. To upsert without
  // destroying other currencies we must send the complete desired price list
  // and list the variant as "previous" so the workflow updates instead of
  // creating a second price set.
  const { data: variantLinks } = await query.graph({
    entity: "product_variant_price_set",
    fields: ["variant_id", "price_set_id"],
  })

  const variantLinkRows = (variantLinks ?? []) as VariantPriceSetRow[]

  const priceSetIds = variantLinkRows
    .map((link) => link.price_set_id)
    .filter((id): id is string => Boolean(id))

  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "product_id", "title"],
  })

  const { data: priceRows } = await query.graph({
    entity: "price",
    fields: ["id", "amount", "currency_code", "price_set_id"],
    filters: priceSetIds.length ? { price_set_id: priceSetIds } : { id: "__none__" },
  })

  const pricesBySet = new Map<string, ExistingPrice[]>()
  for (const price of (priceRows ?? []) as PriceRow[]) {
    if (!price.price_set_id) {
      continue
    }
    const list = pricesBySet.get(price.price_set_id) ?? []
    list.push({
      id: price.id,
      currency_code: price.currency_code,
      amount: price.amount,
    })
    pricesBySet.set(price.price_set_id, list)
  }

  const priceSetByVariant = new Map<string, string>()
  for (const link of variantLinkRows) {
    if (link.price_set_id) {
      priceSetByVariant.set(link.variant_id, link.price_set_id)
    }
  }

  const variantPrices = ((variants ?? []) as VariantRow[])
    .filter((variant) => priceSetByVariant.has(variant.id))
    .map((variant) => {
      const priceSetId = priceSetByVariant.get(variant.id)!
      const existing = pricesBySet.get(priceSetId) ?? []

      const withoutPen = existing.filter(
        (price) => price.currency_code !== CURRENCY_CODE
      )
      const existingPen = existing.find(
        (price) => price.currency_code === CURRENCY_CODE
      )

      // Demo conversion: derive PEN from the cheapest existing non-PEN price.
      const reference =
        withoutPen.find((price) => price.currency_code === "eur") ??
        withoutPen[0]
      const demoPenAmount = existingPen
        ? existingPen.amount
        : Math.round((reference?.amount ?? 0) * EUR_TO_PEN_BASE_RATE)

      return {
        variant_id: variant.id,
        product_id: variant.product_id,
        prices: [
          // Preserve every existing price, then set/replace the PEN one.
          ...withoutPen,
          { ...(existingPen ? { id: existingPen.id } : {}), currency_code: CURRENCY_CODE, amount: demoPenAmount },
        ],
      }
    })

  if (variantPrices.length) {
    await upsertVariantPricesWorkflow(container).run({
      input: {
        variantPrices,
        previousVariantIds: variantPrices.map((entry) => entry.variant_id),
      },
    })
    logger.info(
      `PEN demo prices ensured for ${variantPrices.length} variants (EUR prices preserved).`
    )
  } else {
    logger.warn("No variants with a price set found. Run the seed first.")
  }

  // ------------------------------------------------- service zone + shipping ---
  // The upstream demo zone only covers EU countries, so a Peruvian address
  // matches no shipping option and checkout cannot complete. Peru needs its
  // own service zone plus a temporary flat-rate option.
  const { data: zones } = await query.graph({
    entity: "service_zone",
    fields: ["id", "name", "fulfillment_set_id"],
  })

  const zoneRows = zones as ServiceZoneRow[]

  const fulfillmentSetId = zoneRows.find((zone) => zone.fulfillment_set_id)
    ?.fulfillment_set_id

  if (!fulfillmentSetId) {
    logger.warn("No fulfillment set found. Skipping Peru shipping setup.")
    return
  }

  let peruZone: ServiceZoneRow | undefined = (zones as ServiceZoneRow[]).find(
    (zone) => zone.name === ZONE_NAME
  )

  if (!peruZone) {
    const { result } = await createServiceZonesWorkflow(container).run({
      input: {
        data: [
          {
            name: ZONE_NAME,
            fulfillment_set_id: fulfillmentSetId,
            geo_zones: [{ type: "country", country_code: COUNTRY_CODE }],
          },
        ],
      },
    })
    peruZone = result[0]
    if (!peruZone) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to create the "${ZONE_NAME}" service zone.`
      )
    }
    logger.info(`Service zone "${ZONE_NAME}" created (${peruZone.id}).`)
  } else {
    logger.info(`Service zone "${ZONE_NAME}" already exists (${peruZone.id}).`)
  }

  const peruZoneId = peruZone.id

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "name"],
  })

  const shippingProfile = (shippingProfiles as ShippingProfileRow[])[0]
  if (!shippingProfile) {
    logger.warn("No shipping profile found. Skipping Peru shipping option.")
    return
  }

  const { data: shippingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "service_zone_id"],
  })

  const approvedOptions = loadApprovedShippingMatrix()
  if (approvedOptions.length === 0) {
    logger.warn(
      "[SHIPPING] No client-approved shipping options configured in config/shipping-matrix.json. Skipping shipping option creation to avoid publishing unapproved delivery rates."
    )
  } else {
    for (const opt of approvedOptions) {
      const existingOption = (shippingOptions as ShippingOptionRow[]).find(
        (option) =>
          option.name === opt.name &&
          option.service_zone_id === peruZoneId
      )

      if (existingOption) {
        logger.info(
          `Shipping option "${opt.name}" already exists (${existingOption.id}).`
        )
      } else {
        await createShippingOptionsWorkflow(container).run({
          input: [
            {
              name: opt.name,
              service_zone_id: peruZoneId,
              shipping_profile_id: shippingProfile.id,
              provider_id: "manual_manual",
              type: {
                label: opt.label,
                description: opt.description,
                code: opt.code,
              },
              price_type: "flat",
              prices: [{ amount: opt.amount, currency_code: CURRENCY_CODE }],
            },
          ],
        })
        logger.info(`Shipping option "${opt.name}" created (${opt.amount} PEN).`)
      }
    }
  }

  logger.info("Peru bootstrap finished.")
  logger.info(`Next step: set NEXT_PUBLIC_DEFAULT_REGION=${COUNTRY_CODE} in apps/storefront/.env.local`)
}