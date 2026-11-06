import { model } from "@medusajs/framework/utils"

import { LIFE_STAGES, PET_SIZES } from "../constants"
import PetProductSpecies from "./pet-product-species"

/**
 * The commercial description of a pet product: which species it is for, at
 * which life stage and for which size bracket.
 *
 * It is linked 1:1 with a Medusa product through a module link
 * (`src/links/product-pet-product-profile.ts`), NOT through a foreign key:
 * a product may legitimately have no profile, and Medusa must keep working for
 * generic products. Nothing here duplicates a product option — presentation
 * ("8 kg", "M") stays in variants.
 */
const PetProductProfile = model.define("pet_product_profile", {
  id: model.id({ prefix: "petprof" }).primaryKey(),
  /**
   * Canonical enum values only. `model.enum` compiles to a column with a check
   * constraint, so the database rejects a value the API did not allow either.
   * `all` is a real commercial value ("no restriction"), not a null.
   */
  life_stage: model.enum([...LIFE_STAGES]).default("all"),
  pet_size: model.enum([...PET_SIZES]).default("all"),
  /**
   * Owner side of the many-to-many with `PetProductSpecies`. Declaring the
   * pivot here is what makes this side the owner and fixes the pivot table name
   * and column names explicitly, so the generated schema does not depend on
   * alphabetical table-name guessing.
   */
  species: model.manyToMany(() => PetProductSpecies, {
    pivotTable: "pet_product_profile_species",
    joinColumn: "profile_id",
    inverseJoinColumn: "species_id",
  }),
})

export default PetProductProfile
