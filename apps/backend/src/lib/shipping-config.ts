/**
 * ============================================================================
 * FancyPeru — Configurable Shipping Matrix Architecture
 * ============================================================================
 *
 * Provides a structured, client-configurable delivery matrix.
 * No delivery rates, origin cities, or coverage zones are assumed or invented.
 * Rates must be loaded from an approved configuration file or environment.
 */
import fs from "fs"
import path from "path"

export interface ShippingOptionConfig {
  name: string
  label: string
  description: string
  code: string
  amount: number
  is_active: boolean
  coverage?: {
    origin_city?: string
    departments?: string[]
    provinces?: string[]
    districts?: string[]
    estimated_delivery?: string
  }
}

export function loadApprovedShippingMatrix(): ShippingOptionConfig[] {
  // Check for environment override
  if (process.env.SHIPPING_MATRIX_JSON) {
    try {
      const parsed = JSON.parse(process.env.SHIPPING_MATRIX_JSON)
      if (Array.isArray(parsed)) {
        return parsed.filter((opt) => opt.is_active === true)
      }
    } catch {
      // Fall through to file check
    }
  }

  // Check for local config file (supports both `apps/backend` and `.medusa/server` cwd)
  const candidatePaths = [
    path.resolve(process.cwd(), "config/shipping-matrix.json"),
    path.resolve(process.cwd(), "../../config/shipping-matrix.json"),
    path.resolve(__dirname, "../../config/shipping-matrix.json"),
    path.resolve(__dirname, "../../../../config/shipping-matrix.json"),
  ]
  const configPath = candidatePaths.find((candidate) => fs.existsSync(candidate))
  if (configPath) {
    try {
      const raw = fs.readFileSync(configPath, "utf-8")
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.filter((opt) => opt.is_active === true)
      }
    } catch {
      // Fall through
    }
  }

  // Default: Return empty list if no approved rates have been provided by the client.
  // We do NOT assume origin city, coverage, or prices without client confirmation.
  return []
}
