import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { readBranding } from "../../../lib/store-branding"

/**
 * PUBLIC storefront branding endpoint.
 *
 * Returns only what a shopper may see: colours, logo and tagline. No internal
 * column, no store id beyond what the storefront already has.
 *
 * This is the contract the storefront reads on the server, so the values arrive
 * before first paint and the CSS variables can be written inline rather than
 * applied after hydration. It is the reason the storefront never has to embed
 * brand colours at build time.
 */

const STORE_FIELDS = ["id", "name", "metadata"]

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: stores } = await query.graph({
    entity: "store",
    fields: STORE_FIELDS,
  })

  const store = (stores as { id: string; name: string; metadata?: unknown }[])?.[0]

  if (!store) {
    res.status(404).json({ message: "Store not found" })
    return
  }

  res.json({
    store: { name: store.name },
    branding: readBranding(store.metadata),
  })
}