/**
 * ============================================================================
 *  FancyPeru — remove the Medusa starter products (idempotent).
 * ============================================================================
 *
 *   pnpm exec medusa exec ./src/scripts/remove-starter-products.ts
 *
 * WHAT IT REMOVES
 * The four sample products the Medusa starter ships with, matched by their
 * stable handles rather than by title:
 *
 *   t-shirt, sweatshirt, sweatpants, shorts
 *
 * They exist only because `src/migration-scripts/initial-data-seed.ts` created
 * them as demo data. Every real Fancy Pets product is left untouched.
 *
 * WHY THE WORKFLOW AND NOT RAW SQL
 * `deleteProductsWorkflow` (id `delete-products`) is what the admin route
 * `DELETE /admin/products/:id` runs, so it performs the same cascade: product
 * rows, variants, options, option values and their links. A hand-written
 * `UPDATE product SET deleted_at = now()` would leave orphaned variants and
 * option values behind, and the store would keep serving them.
 *
 * Medusa deletes are soft deletes: rows stay in the table with `deleted_at` set
 * and disappear from every read path. That is what the admin "Delete" button
 * does too, so this is reversible from the database if it ever has to be.
 *
 * IDEMPOTENCY
 * Products are looked up by handle before anything is deleted. On a second run
 * the lookup returns nothing, the script logs that and returns without writing.
 *
 * A HANDLE THAT MATCHES NOTHING IS AN ERROR
 * If a handle from the list is missing that means the starter data is not what
 * this script was written against, so something else changed the catalog. That
 * is reported rather than silently ignored.
 */

import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { ExecArgs, IWorkflowEngineService } from "@medusajs/framework/types"

/**
 * The starter handles. Stable identifiers from the seed data, chosen over
 * titles because a title can be edited from the admin while a handle cannot
 * change without re-creating the product.
 */
const STARTER_HANDLES: readonly string[] = [
  "t-shirt",
  "sweatshirt",
  "sweatpants",
  "shorts",
]

/**
 * Narrow shape for the rows `query.graph` returns for `entity: "product"`. The
 * graph result is loosely typed, so each read is narrowed here instead of being
 * cast to `any`.
 */
type ProductRow = {
  id: string
  handle?: string | null
  title?: string | null
}

/**
 * Lists the products whose handle is one of the starter handles.
 *
 * `query.graph` with `entity: "product"` is the same remote-query path the
 * admin products route uses, so this sees exactly what the catalog exposes. The
 * starter data has already been soft-deleted on a repeat run, so the default
 * read path returns nothing for it, which is what makes this idempotent.
 */
const findStarterProducts = async (
  query: { graph: (input: unknown) => Promise<{ data?: unknown }> },
  handles: string[]
): Promise<ProductRow[]> => {
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "title"],
    filters: { handle: handles },
  })

  return (data ?? []) as ProductRow[]
}

export default async function removeStarterProducts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const workflowService =
    container.resolve<IWorkflowEngineService>(Modules.WORKFLOW_ENGINE)

  logger.info("Buscando los productos de ejemplo de Medusa.")

  const starters = await findStarterProducts(query, [...STARTER_HANDLES])
  const foundHandles = new Set(
    starters.map((product) => product.handle?.trim().toLowerCase() ?? "")
  )

  const missing = STARTER_HANDLES.filter((handle) => !foundHandles.has(handle))

  // ---------------------------------------------------------------- no-op ---
  if (!starters.length) {
    logger.info("No hay productos de ejemplo. No se escribió nada.")

    return
  }

  for (const product of starters) {
    logger.info(`  - ${product.title ?? "(sin título)"} [${product.handle}]`)
  }

  // --------------------------------------------------------------- delete ---
  // Resolved by workflow id rather than by importing the workflow factory, to
  // match how this repository already invokes `create-users-workflow` and
  // `update-users-workflow` in `seed-staff-accounts.ts`.
  await workflowService.run("delete-products", {
    input: { ids: starters.map((product) => product.id) },
  })

  logger.info(`Se eliminaron ${starters.length} productos de ejemplo.`)

  // A handle that did not match means the catalog is not what this script
  // expects. It is reported so a silent partial match never passes as success.
  if (missing.length) {
    logger.warn(
      `No se encontraron estos handles de ejemplo: ${missing.join(", ")}. Revisa si el catalogo de Medusa cambio.`
    )
  }
}