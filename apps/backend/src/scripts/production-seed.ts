/**
 * ============================================================================
 * FancyPeru / FancyPets — Master Production Seed (Idempotent & Commercial)
 * ============================================================================
 *
 * Executes the clean initialization sequence for production:
 *   1. Peru Localization (Region PE, PEN currency, 4 official commercial shipping options).
 *   2. Official Veterinary Taxonomy (7 official categories: Alimentos, Farmacia y Salud,
 *      Higiene y Cuidado, Accesorios, Juguetes, Snacks y Premios, Cachorros y Senior).
 *   3. Veterinary Commercial Domain (Species: Perros, Gatos, Aves, Pequeños Mamíferos).
 *   4. Dedicated Production Publishable API Key (linked to default sales channel).
 *   5. Production Administrator Account (dedicated credentials from environment).
 *
 * Note:
 *   Does NOT inject demo products or placeholder mock data. The catalog is left
 *   clean for the business's real inventory, prices, and high-resolution photography.
 *
 * Usage:
 *   pnpm exec medusa exec ./src/scripts/production-seed.ts
 */
import {
  createApiKeysWorkflow,
  createUsersWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  ApiKeyType,
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import type {
  ExecArgs,
  IAuthModuleService,
  UserDTO,
} from "@medusajs/framework/types"

import bootstrapPeru from "./bootstrap-peru"
import bootstrapVetTaxonomy from "./bootstrap-vet-taxonomy"
import bootstrapCommercialSpecies from "./bootstrap-species"

const PRODUCTION_KEY_TITLE = "FancyPets Production Publishable Key"

export default async function productionSeed({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  logger.info("============================================================")
  logger.info("  FANCYPETS — STARTING COMMERCIAL PRODUCTION SEED")
  logger.info("============================================================")

  // 1. Peru Localization & Commercial Shipping
  logger.info("[1/5] Running Peru Localization (PEN, PE Region, Configurable Shipping)...")
  await bootstrapPeru({ container, args: args ?? [] })

  // 2. Official Veterinary Taxonomy
  logger.info("[2/5] Running Official Veterinary Taxonomy Bootstrap...")
  await bootstrapVetTaxonomy({ container, args: args ?? [] })

  // 3. Commercial Species
  logger.info("[3/5] Running Commercial Pet Species Bootstrap...")
  await bootstrapCommercialSpecies({ container, args: args ?? [] })

  // 4. Production Publishable API Key
  logger.info("[4/5] Ensuring Dedicated Production Publishable API Key...")
  const { data: existingKeys } = await query.graph({
    entity: "api_key",
    fields: ["id", "token", "title", "type"],
    filters: { title: PRODUCTION_KEY_TITLE },
  })

  let publishableKeyToken = existingKeys?.[0]?.token

  if (!existingKeys || existingKeys.length === 0) {
    const { data: salesChannels } = await query.graph({
      entity: "sales_channel",
      fields: ["id", "name"],
    })

    const defaultChannel = salesChannels?.[0]
    if (!defaultChannel) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "No sales channel found to link publishable API key.")
    }

    const { result: createdKeys } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: PRODUCTION_KEY_TITLE,
            type: ApiKeyType.PUBLISHABLE,
            created_by: "production-seed",
          },
        ],
      },
    })

    const createdKey = createdKeys[0]
    publishableKeyToken = createdKey.token

    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: {
        id: createdKey.id,
        add: [defaultChannel.id],
      },
    })

    logger.info(`[SUCCESS] Created new production publishable key '${PRODUCTION_KEY_TITLE}' (ID: ${createdKey.id}).`)
  } else {
    logger.info(`[EXISTS] Production publishable key already exists (ID: ${existingKeys[0].id}).`)
  }

  // 5. Dedicated Production Administrator Account
  logger.info("[5/5] Ensuring Dedicated Production Administrator Account...")
  const adminEmail = process.env.ADMIN_EMAIL?.trim() || "admin@fancypets.pe"
  const adminPassword = process.env.ADMIN_PASSWORD?.trim()

  const { data: existingUsers } = await query.graph({
    entity: "user",
    fields: ["id", "email", "metadata"],
  })

  const userExists = (existingUsers ?? []).some(
    (u: { email?: string | null }) => u.email?.toLowerCase() === adminEmail.toLowerCase()
  )

  if (!userExists) {
    if (!adminPassword) {
      logger.warn(
        `[WARNING] ADMIN_PASSWORD environment variable is not set. Skipped creating admin ${adminEmail}. Set ADMIN_PASSWORD to seed production admin.`
      )
    } else {
      const authService = container.resolve<IAuthModuleService>(Modules.AUTH)

      const { result: createdUsers } = await createUsersWorkflow(container).run({
        input: {
          users: [
            {
              email: adminEmail,
              first_name: "Administrador",
              last_name: "FancyPets",
              metadata: { role: "owner" },
            },
          ],
        },
      })

      const newUser = (createdUsers as UserDTO[])[0]

      const { authIdentity, error } = await authService.register("emailpass", {
        body: {
          email: adminEmail,
          password: adminPassword,
        },
      })

      if (error || !authIdentity?.id) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Emailpass registration failed for production admin: ${error ?? "No auth identity returned"}`
        )
      }

      await authService.updateAuthIdentities([
        {
          id: authIdentity.id,
          app_metadata: { user_id: newUser.id },
        },
      ])

      logger.info(`[SUCCESS] Created production administrator account '${adminEmail}'. No passwords logged.`)
    }
  } else {
    logger.info(`[EXISTS] Production administrator account '${adminEmail}' already exists. Re-creation skipped.`)
  }

  logger.info("============================================================")
  logger.info("  FANCYPETS — PRODUCTION SEED COMPLETED SUCCESSFULLY")
  logger.info("============================================================")
}
