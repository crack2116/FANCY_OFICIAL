import { Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

/**
 * Replays `product.updated` for one product so the product search index is
 * rebuilt from it.
 *
 * Why this exists: the v3 index reads `brand.*` and `pet_product_profile.*`
 * through module links. Writing a link emits a `Link_*.ATTACHED` event and NOT a
 * product event, and the Product Module emits nothing when a brand's own row
 * changes. None of that reaches the index's `events` list, so without an
 * explicit replay the document would keep the previous brand forever.
 *
 * It is the same mechanism `src/scripts/bootstrap-vet-catalog.ts` already uses to
 * refresh the index from a script, so there is no new concept here.
 *
 * Idempotent, so it needs no compensation.
 */
export const reindexProductsStep = createStep<
  { product_id: string },
  string,
  undefined
>("reindex-products", async (input, { container }) => {
  const search = container.resolve(Modules.SEARCH)

  try {
    await search.ingest({
      name: "product.updated",
      data: { id: input.product_id },
    } as never)
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    if (errorMsg.includes("no active version yet")) {
      // Offline seed or script execution before medusa start has activated search indexes
      return new StepResponse(input.product_id)
    }
    throw err
  }

  return new StepResponse(input.product_id)
})
