import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { toBrandHandle } from "../../../lib/brand-handle"
import { createBrandWorkflow } from "../../../workflows/brand-crud"

/**
 * Admin brand endpoints.
 *
 * Authorisation: this file lives under `/admin`, and Medusa's `ApiLoader`
 * installs the admin `authenticate("user", ...)` middleware on the whole
 * `/admin` namespace. A route only opts OUT by exporting
 * `AUTHENTICATE = false`, which this file deliberately does not do. A
 * Store-API caller therefore cannot reach any handler here.
 *
 * Reads go through `query.graph` and writes go through workflows, so no route
 * mutates a module service directly.
 */

/** Explicit allow-list: a new internal column cannot leak by accident. */
const BRAND_FIELDS = [
  "id",
  "name",
  "handle",
  "description",
  "logo_url",
  "is_active",
]

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { q, handle, is_active, limit, offset } = req.validatedQuery as {
    q?: string
    handle?: string
    is_active?: boolean
    limit: number
    offset: number
  }

  const { data: brands, metadata } = await query.graph({
    entity: "brand",
    fields: BRAND_FIELDS,
    filters: {
      ...(handle ? { handle } : {}),
      ...(is_active === undefined ? {} : { is_active }),
      ...(q ? { name: { $ilike: `%${q}%` } } : {}),
    },
    pagination: { skip: offset, take: limit },
  })

  res.status(200).json({
    brands,
    count: metadata?.count ?? brands.length,
    offset,
    limit,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.validatedBody as {
    name: string
    handle?: string
    description?: string | null
    logo_url?: string | null
    is_active?: boolean
  }

  const handle = body.handle ?? toBrandHandle(body.name)

  if (!handle) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "name must contain at least one letter or digit, or an explicit handle must be provided"
    )
  }

  const { result: brand } = await createBrandWorkflow(req.scope).run({
    input: {
      brand: {
        name: body.name,
        handle,
        description: body.description ?? null,
        logo_url: body.logo_url ?? null,
        ...(body.is_active === undefined ? {} : { is_active: body.is_active }),
      },
    },
  })

  res.status(200).json({ brand })
}
