import { Module } from "@medusajs/framework/utils"

import PetProductModuleService from "./service"

/**
 * Registered in `medusa-config.ts` as `modules.pet_product`.
 *
 * The module key is `pet_product`, which is also the container registration
 * key: `container.resolve("pet_product")`.
 */
export default Module("pet_product", {
  service: PetProductModuleService,
})
