import { model } from "@medusajs/framework/utils"

/**
 * A commercial brand a product can belong to.
 *
 * A brand is a first-class entity on purpose: `product.metadata.brand` and
 * `product.tags` are both unqueryable as a facet, and neither gives a brand its
 * own URL or its own lifecycle.
 *
 * `handle` uniqueness is GLOBAL, not "unique among active brands":
 *
 *  - `handle` is the stable, URL-facing key of the entity. If uniqueness were
 *    scoped to `is_active = true`, deactivating a brand would silently release
 *    its handle, and a second brand could claim it while the first one still
 *    holds every product link and every bookmarked URL. Re-activating the first
 *    brand would then fail on data that was already public.
 *  - A partial unique index on `is_active` would also let two rows share a
 *    handle while one is inactive, which makes `/brands/<handle>` ambiguous
 *    the moment the inactive one is reactivated.
 *
 * The database is the source of truth: the unique index below is a real
 * constraint (partial on `deleted_at IS NULL`, so a soft-deleted row releases
 * its handle). `BrandModuleService` also checks the handle before inserting so
 * the API answers with a 4xx instead of a constraint violation.
 */
const Brand = model
  .define("brand", {
    id: model.id({ prefix: "brand" }).primaryKey(),
    name: model.text(),
    /**
     * Stable, URL-friendly identifier. Generated from `name` on create when the
     * caller does not send one; never renamed by an update.
     */
    handle: model.text(),
    description: model.text().nullable(),
    /**
     * Optional plain string. There is no upload pipeline: a caller that wants
     * managed assets stores them through the File Module and passes the URL.
     */
    logo_url: model.text().nullable(),
    is_active: model.boolean().default(true),
  })
  .indexes([
    {
      name: "IDX_brand_handle_unique",
      on: ["handle"],
      unique: true,
    },
  ])

export default Brand
