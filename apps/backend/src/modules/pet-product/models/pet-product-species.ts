import { model } from "@medusajs/framework/utils"

import PetProductProfile from "./pet-product-profile"

/**
 * A species a pet product can be sold for ("dog", "cat", "other", ...).
 *
 * Species is a real, filterable commercial dimension, so it is a normalised
 * table and not a JSON array on the product or the profile. Storing
 * `["dog", "cat"]` in metadata would make "every product valid for both Perro
 * and Gato" unqueryable without reading and parsing every row.
 *
 * The set is deliberately open: the catalogue is dogs today, but nothing in
 * this model is dogs-only.
 */
const PetProductSpecies = model
  .define("pet_product_species", {
    id: model.id({ prefix: "petspec" }).primaryKey(),
    /**
     * Stable machine key used in filters and in the search index, e.g. `dog`.
     * Globally unique, and it is the only value a client ever sends.
     */
    code: model.text(),
    /** Human-readable name. Display only; never used for matching. */
    name: model.text(),
    is_active: model.boolean().default(true),
    /**
     * Controls facet ordering in the UI. Only used as a tie-breaker next to the
     * localised label, so a missing value must not break anything.
     */
    sort_order: model.number().default(0),
    /**
     * Many-to-many, not a join entity on purpose. The installed model API
     * (`model.manyToMany`, verified in `@medusajs/utils` 2.21.2 and used by core
     * for product<->tag and product<->category) generates a pivot table whose
     * composite primary key IS `(profile_id, species_id)`, so "a profile cannot
     * list the same species twice" is a database guarantee rather than
     * application discipline. A hand-written join model would have had to
     * re-declare that unique index and keep it in sync.
     *
     * This side is the non-owner: `PetProductProfile.species` configures the
     * pivot table, so `pivotTable`/`joinColumn` are declared only there.
     */
    profiles: model.manyToMany(() => PetProductProfile, {
      mappedBy: "species",
    }),
  })
  .indexes([
    {
      name: "IDX_pet_product_species_code_unique",
      on: ["code"],
      unique: true,
    },
  ])

export default PetProductSpecies
