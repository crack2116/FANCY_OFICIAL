import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { IWorkflowEngineService } from "@medusajs/framework/types"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  mergeBrandingMetadata,
  readBranding,
  updateBrandingValidator,
} from "../../../lib/store-branding"

/**
 * Admin branding endpoint: read and update how the storefront looks.
 *
 * Authorisation: this file lives under `/admin`, and Medusa's `ApiLoader`
 * installs the admin `authenticate("user", ...)` middleware on the whole
 * `/admin` namespace. It deliberately does not export `AUTHENTICATE = false`.
 *
 * The write goes through `updateStoresWorkflow` rather than calling the store
 * module service directly, matching every other write in this project.
 *
 * METADATA IS REPLACED, NOT MERGED
 * `updateStoresWorkflow` replaces the whole `metadata` object. Passing only the
 * branding key would silently drop whatever else the store record carries, so
 * the existing object is spread back in by `mergeBrandingMetadata`.
 */

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "name", "metadata"],
  })

  const store = (stores as { id: string; name: string; metadata?: unknown }[])?.[0]

  if (!store) {
    res.status(404).json({ message: "Store not found" })
    return
  }

  res.json({ branding: readBranding(store.metadata) })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = updateBrandingValidator.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({
      message: "Datos de marca inválidos",
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const workflowService =
    req.scope.resolve<IWorkflowEngineService>(Modules.WORKFLOW_ENGINE)

  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "name", "metadata"],
  })

  const store = (stores as { id: string; metadata?: unknown }[])?.[0]

  if (!store) {
    res.status(404).json({ message: "Store not found" })
    return
  }

  // Only the keys the caller actually sent are written, so a partial save does
  // not blank out a colour the form never showed.
  const current = readBranding(store.metadata)
  const next = {
    ...current,
    logo_url:
      parsed.data.logo_url !== undefined ? parsed.data.logo_url : current.logo_url,
    tagline:
      parsed.data.tagline !== undefined ? parsed.data.tagline : current.tagline,
    announcement_enabled:
      parsed.data.announcement_enabled !== undefined
        ? parsed.data.announcement_enabled
        : current.announcement_enabled,
    announcement_messages:
      parsed.data.announcement_messages !== undefined
        ? parsed.data.announcement_messages
        : current.announcement_messages,
    // The map is written whole, so dropping an entry is how the operator returns
    // one category to its shipped demo artwork. `undefined` means "the form did
    // not touch this field", which is different from an empty map.
    category_artwork:
      parsed.data.category_artwork !== undefined
        ? parsed.data.category_artwork
        : current.category_artwork,
    colors: parsed.data.colors,
  }

  const { result } = await workflowService.run("update-stores", {
    input: {
      selector: { id: store.id },
      update: { metadata: mergeBrandingMetadata(store.metadata, next) },
    },
  })

  const updated = (result as { metadata?: unknown }[])?.[0]

  // Read back through the same validator the storefront uses, so the response
  // proves what a shopper will actually see rather than what was sent.
  res.json({
    branding: updated ? readBranding(updated.metadata) : next,
  })
}