import { Module } from "@medusajs/framework/utils"

import BrandModuleService from "./service"

/**
 * Registered in `medusa-config.ts` as `modules.brand`.
 *
 * The module key is `brand`, which is also the container registration key:
 * `container.resolve("brand")`.
 */
export default Module("brand", {
  service: BrandModuleService,
})
