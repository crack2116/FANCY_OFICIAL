/**
 * ============================================================================
 * FancyPeru — Master Staging Seed (Idempotent and Isolated)
 * ============================================================================
 *
 * Executes the complete initialization sequence for an isolated staging environment:
 *   1. Peru Localization (Region PE, PEN currency, Demo shipping).
 *   2. Veterinary Taxonomy (Perros, Alimentos, Salud, Farmacia, etc.).
 *   3. Veterinary Catalog (PEN prices, stock inventory, demo products).
 *   4. Commercial Domain (Brands, species, pet product profiles).
 *   5. Staging Publishable API Key (isolated publishable key linked to default sales channel).
 *   6. Staging Admin Account (dedicated credentials from environment, no dev reuse).
 *
 * Usage:
 *   pnpm exec medusa exec ./src/scripts/staging-seed.ts
 *
 * Rules:
 *   - Strictly idempotent: safe to execute multiple times.
 *   - No hardcoded secrets: admin credentials must be provided via env.
 *   - Zero data duplication.
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
import bootstrapVetCatalog from "./bootstrap-vet-catalog"
import bootstrapVetDomain from "./bootstrap-vet-domain"

const STAGING_KEY_TITLE = "FancyPets Staging Publishable Key"

export default async function stagingSeed({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  logger.info("============================================================")
  logger.info("  FANCYPERU — STARTING ISOLATED STAGING SEED")
  logger.info("============================================================")

  // 1. Peru Localization
  logger.info("[1/6] Running Peru Localization Bootstrap...")
  await bootstrapPeru({ container, args: args ?? [] })

  // 2. Veterinary Taxonomy
  logger.info("[2/6] Running Veterinary Taxonomy Bootstrap...")
  await bootstrapVetTaxonomy({ container, args: args ?? [] })

  // 3. Veterinary Demo Catalog
  logger.info("[3/6] Running Veterinary Demo Catalog Bootstrap...")
  await bootstrapVetCatalog({ container, args: args ?? [] })

  // 4. Veterinary Commercial Domain (Brands & Pet Profiles)
  logger.info("[4/6] Running Veterinary Commercial Domain Bootstrap...")
  await bootstrapVetDomain({ container, args: args ?? [] })

  // 5. Staging Publishable API Key
  logger.info("[5/6] Ensuring Dedicated Staging Publishable API Key...")
  const { data: existingKeys } = await query.graph({
    entity: "api_key",
    fields: ["id", "token", "title", "type"],
    filters: { title: STAGING_KEY_TITLE },
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
            title: STAGING_KEY_TITLE,
            type: ApiKeyType.PUBLISHABLE,
            created_by: "staging-seed",
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

    logger.info(`[SUCCESS] Created new staging publishable key '${STAGING_KEY_TITLE}' (ID: ${createdKey.id}).`)
  } else {
    logger.info(`[EXISTS] Staging publishable key already exists (ID: ${existingKeys[0].id}).`)
  }

  // 6. Dedicated Staging Administrator Account
  logger.info("[6/6] Ensuring Dedicated Staging Administrator Account...")
  const stagingEmail = process.env.STAGING_ADMIN_EMAIL?.trim() || "staging-admin@fancyperu.com"
  const stagingPassword = process.env.STAGING_ADMIN_PASSWORD?.trim()

  const { data: existingUsers } = await query.graph({
    entity: "user",
    fields: ["id", "email", "metadata"],
  })

  const userExists = (existingUsers ?? []).some(
    (u: { email?: string | null }) => u.email?.toLowerCase() === stagingEmail.toLowerCase()
  )

  if (!userExists) {
    if (!stagingPassword) {
      logger.warn(
        `[WARNING] STAGING_ADMIN_PASSWORD environment variable is not set. Skipped creating admin ${stagingEmail}. Set STAGING_ADMIN_PASSWORD to seed staging admin.`
      )
    } else {
      const authService = container.resolve<IAuthModuleService>(Modules.AUTH)

      const { result: createdUsers } = await createUsersWorkflow(container).run({
        input: {
          users: [
            {
              email: stagingEmail,
              first_name: "Staging",
              last_name: "Admin",
              metadata: { role: "manager" },
            },
          ],
        },
      })

      const newUser = (createdUsers as UserDTO[])[0]

      const { authIdentity, error } = await authService.register("emailpass", {
        body: {
          email: stagingEmail,
          password: stagingPassword,
        },
      })

      if (error || !authIdentity?.id) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Emailpass registration failed for staging admin: ${error ?? "No auth identity returned"}`
        )
      }

      await authService.updateAuthIdentities([
        {
          id: authIdentity.id,
          app_metadata: { user_id: newUser.id },
        },
      ])

      logger.info(`[SUCCESS] Created staging administrator account '${stagingEmail}'. No passwords logged.`)
    }
  } else {
    logger.info(`[EXISTS] Staging administrator account '${stagingEmail}' already exists. Re-creation skipped.`)
  }

  logger.info("============================================================")
  logger.info("  FANCYPERU — STAGING SEED COMPLETED SUCCESSFULLY")
  logger.info("============================================================")
}
