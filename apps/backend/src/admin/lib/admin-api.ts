/**
 * The Admin UI's HTTP client and its safe error layer.
 *
 * WHY PLAIN `fetch` AND NOT `sdk`
 * ------------------------------
 * The dashboard's own client lives in an internal module of `@medusajs/dashboard`
 * and is NOT exported from any of that package's public entry points, so a
 * widget cannot import it. Re-authoring a client is the alternative, and
 * `@medusajs/js-sdk` — which the dashboard depends on — is not a declared
 * dependency of this app, so importing it here would be an undeclared import.
 * The dashboard is served same-origin from the backend and authenticates with a
 * session cookie, so a relative URL plus `credentials: "include"` is the whole
 * requirement. No new dependency, no hidden coupling.
 *
 * WHY THIS FILE OWNS THE ERROR TEXT
 * ----------------------------------
 * A backend `message` can carry an internal id, a field path, a Medusa error
 * `type` or, in the worst case, a stack. None of that is something an operator
 * can act on, and none of it should reach an admin screen. So a failure is
 * reduced to one of a small set of codes here, and the message is looked up in
 * `ADMIN_ERROR_MESSAGES` — Spanish copy this app owns. The raw response body is
 * never returned, never logged and never rendered.
 *
 * The classification mirrors the storefront's `public-error.ts`: only trusted
 * signals (an HTTP status) decide the code, and free text is never keyword
 * mined, so an unrelated backend message degrades to the generic copy instead of
 * claiming a cause the operator may not have hit.
 */

import type {
  AdminBrand,
  AdminSpecies,
  AssignBrandBody,
  UpsertPetProductProfileBody,
} from "./vet-domain"

/**
 * Closed set of causes this UI is willing to name.
 *
 * Codes are internal: they are logged for diagnostics and never displayed.
 */
export type AdminErrorCode =
  | "VALIDATION_FAILED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "FORBIDDEN"
  | "SESSION_EXPIRED"
  | "RATE_LIMITED"
  | "NETWORK"
  | "UNKNOWN"

/** The only strings an admin screen may show for a failure. */
const ADMIN_ERROR_MESSAGES: Readonly<Record<AdminErrorCode, string>> = {
  VALIDATION_FAILED:
    "Revisa los datos del formulario. Hay campos con un formato no válido.",
  NOT_FOUND: "No encontramos ese registro. Puede que se haya eliminado.",
  CONFLICT:
    "Ya existe un registro con ese identificador. Prueba con otro valor.",
  FORBIDDEN: "Tu usuario de administrador no tiene permiso para esta acción.",
  SESSION_EXPIRED: "Tu sesión expiró. Vuelve a iniciar sesión en el panel.",
  RATE_LIMITED: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
  NETWORK: "No pudimos conectar con el servidor. Inténtalo de nuevo.",
  UNKNOWN: "Ocurrió un problema. Inténtalo de nuevo.",
}

/** An admin-safe error: a code plus copy this app owns. */
export class AdminApiError extends Error {
  readonly code: AdminErrorCode

  /** HTTP status, kept for diagnostics only. Never rendered. */
  readonly status: number | null

  constructor(code: AdminErrorCode, status: number | null) {
    super(ADMIN_ERROR_MESSAGES[code])
    this.name = "AdminApiError"
    this.code = code
    this.status = status
  }
}

function classifyStatus(status: number): AdminErrorCode {
  if (status === 400 || status === 422) {
    return "VALIDATION_FAILED"
  }

  if (status === 401) {
    return "SESSION_EXPIRED"
  }

  if (status === 403) {
    return "FORBIDDEN"
  }

  if (status === 404) {
    return "NOT_FOUND"
  }

  if (status === 409) {
    return "CONFLICT"
  }

  if (status === 429) {
    return "RATE_LIMITED"
  }

  return "UNKNOWN"
}

/**
 * Turn an unknown throw into one safe sentence.
 *
 * `AdminApiError` already carries its code; anything else — a `TypeError` from
 * a dropped connection, a string, `undefined` — collapses to `NETWORK` or
 * `UNKNOWN` so no caller has to inspect an error object.
 */
export function toAdminErrorMessage(error: unknown): string {
  if (error instanceof AdminApiError) {
    return error.message
  }

  if (error instanceof TypeError) {
    return ADMIN_ERROR_MESSAGES.NETWORK
  }

  return ADMIN_ERROR_MESSAGES.UNKNOWN
}

/** Non-sensitive diagnostics for the console. Excludes the body and headers. */
export function inspectAdminError(error: unknown): {
  code: AdminErrorCode
  status: number | null
} {
  if (error instanceof AdminApiError) {
    return { code: error.code, status: error.status }
  }

  return { code: error instanceof TypeError ? "NETWORK" : "UNKNOWN", status: null }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
}

/**
 * Issue one admin request and return its parsed JSON.
 *
 * The response body is only ever used to REJECT: a non-2xx status is turned
 * into an `AdminApiError` before the payload is read, so no failure path can
 * leak backend text into an admin screen.
 */
async function request<T>(
  path: string,
  { method = "GET", query, body }: RequestOptions = {}
): Promise<T> {
  const params = new URLSearchParams()

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined) {
      params.set(key, String(value))
    }
  })

  const search = params.toString()
  const url = search ? `${path}?${search}` : path

  let response: Response

  try {
    response = await fetch(url, {
      method,
      // Same-origin as the panel; the admin session travels in this cookie.
      credentials: "include",
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  } catch {
    // fetch only rejects when there was no response at all.
    throw new AdminApiError("NETWORK", null)
  }

  if (!response.ok) {
    throw new AdminApiError(classifyStatus(response.status), response.status)
  }

  // 204 has no body; the caller asked for `T`, so hand back an empty object
  // rather than letting a JSON parse error masquerade as a server fault.
  if (response.status === 204) {
    return {} as T
  }

  try {
    return (await response.json()) as T
  } catch {
    throw new AdminApiError("UNKNOWN", response.status)
  }
}

// --------------------------------------------------------------------------
// Response shapes, exactly as the routes return them.
// --------------------------------------------------------------------------

/**
 * Branding, as `GET|POST /admin/branding` returns it.
 *
 * Mirrors `StoreBranding` in `apps/backend/src/lib/store-branding.ts`. It is
 * declared here rather than imported because that file imports zod, and this
 * module is bundled into the browser.
 */
export type AdminBrandingColors = {
  primary: string
  primaryDark: string
  accent: string
  surface: string
  text: string
}

export type AdminBranding = {
  logo_url: string | null
  tagline: string | null
  announcement_enabled: boolean
  announcement_messages: string[]
  /** Uploaded category artwork, keyed by category handle. */
  category_artwork: Record<string, string>
  /** Uploaded hero artwork, keyed by hero slide id. */
  hero_artwork: Record<string, string>
  colors: AdminBrandingColors
}

export type BrandingResponse = { branding: AdminBranding }

/** Body accepted by `POST /admin/branding`. */
export type UpdateBrandingBody = Partial<AdminBranding> & {
  colors: AdminBrandingColors
}

export const retrieveBranding = () =>
  request<BrandingResponse>("/admin/branding")

export const updateBranding = (body: UpdateBrandingBody) =>
  request<BrandingResponse>("/admin/branding", { method: "POST", body })

/**
 * Which branding map an upload writes into.
 *
 * Mirrored from the backend route on purpose: this is a wire contract between
 * two apps that do not share a build graph.
 */
export type ArtworkTarget = "category" | "hero"

/**
 * The hero slide ids this screen renders a control for.
 *
 * Mirrored from `HERO_SLIDE_IDS` in `src/lib/store-branding.ts`, and duplicated
 * for the reason `AdminBranding` above is: that file imports zod, and this
 * module is bundled into the browser. The contract stays authoritative — it is
 * what validates an upload — so the worst a drift can do is offer a control the
 * backend then refuses, never store an entry nothing reads.
 *
 * Ordering follows `HERO_SLIDE_IDS` so the controls match the slide order the
 * storefront renders, rather than the order the keys happen to sort in.
 */
export const HERO_SLIDE_IDS = ["cuidado-diario", "bienestar-diario"] as const

export type HeroSlideId = (typeof HERO_SLIDE_IDS)[number]

/** `POST /admin/branding/artwork` -> `{ artwork: { target, key, url } }`. */
export type UploadArtworkResponse = {
  artwork: { target: ArtworkTarget; key: string; url: string }
}

/**
 * Upload one artwork image, as multipart.
 *
 * Its own `fetch` rather than the shared `request` helper because that one
 * JSON-encodes the body and sets `content-type: application/json` by hand.
 * Setting the header on a `FormData` body would strip the multipart boundary the
 * browser generated and the backend would receive an unparseable request, so the
 * header has to be left to the browser entirely.
 *
 * The error handling matches `request` exactly: a non-2xx status is turned into
 * an `AdminApiError` BEFORE the body is read, so no backend text — which here
 * could carry a filesystem path — can reach an admin screen.
 */
export async function uploadBrandingArtwork(
  target: ArtworkTarget,
  key: string,
  file: File
): Promise<UploadArtworkResponse> {
  const body = new FormData()
  // Field names are duplicated from the backend route on purpose: this is a wire
  // contract between two apps that do not share a build graph.
  body.append("files", file)
  body.append("target", target)
  body.append("handle", key)

  let response: Response

  try {
    response = await fetch("/admin/branding/artwork", {
      method: "POST",
      credentials: "include",
      body,
    })
  } catch {
    throw new AdminApiError("NETWORK", null)
  }

  if (!response.ok) {
    throw new AdminApiError(classifyStatus(response.status), response.status)
  }

  try {
    return (await response.json()) as UploadArtworkResponse
  } catch {
    throw new AdminApiError("UNKNOWN", response.status)
  }
}

/** `GET /store/product-categories` -> the categories the storefront renders. */
export type CategorySummary = {
  id: string
  handle: string
  name: string
}

export type CategoryListResponse = {
  product_categories: CategorySummary[]
  count: number
}

export const listStoreCategories = () =>
  request<CategoryListResponse>("/store/product-categories", {
    query: { limit: 100 },
  })

/** `GET /admin/brands` -> `{ brands, count, offset, limit }`. No product count. */
export type BrandListResponse = {
  brands: AdminBrand[]
  count: number
  offset: number
  limit: number
}

/** `POST /admin/brands`, `GET|PATCH /admin/brands/:id`, activate, deactivate. */
export type BrandResponse = { brand: AdminBrand }

/** `GET /admin/pet-product-species` -> `{ species, count, offset, limit }`. */
export type SpeciesListResponse = {
  species: AdminSpecies[]
  count: number
  offset: number
  limit: number
}

/** `POST /admin/products/:id/brand` -> `{ product_id, brand }`. */
export type AssignBrandResponse = { product_id: string; brand: AdminBrand }

/** `DELETE /admin/products/:id/brand` -> `{ product_id, removed_brand }`. */
export type RemoveBrandResponse = { product_id: string; removed_brand: AdminBrand }

/**
 * The part of a product that the pet links touch.
 *
 * This is what `POST /admin/products/:id/pet-product-profile` echoes back, and
 * the only shape these widgets need from a product read.
 */
export type ProductPetData = {
  id: string
  brand?: AdminBrand | null
  pet_product_profile?: PetProductProfileData | null
}

export type PetProductProfileData = {
  id?: string
  life_stage: string | null
  pet_size: string | null
  species: { id?: string; code: string; name?: string }[]
}

/** Only ACTIVE brands are assignable; the assignment workflow rejects the rest. */
export const listBrands = (isActive?: boolean) =>
  request<BrandListResponse>("/admin/brands", {
    query: { limit: 200, ...(isActive === undefined ? {} : { is_active: isActive }) },
  })

export const retrieveBrand = (id: string) =>
  request<BrandResponse>(`/admin/brands/${id}`)

export type CreateBrandInput = {
  name: string
  handle?: string
  description?: string | null
  logo_url?: string | null
  is_active?: boolean
}

export type UpdateBrandInput = {
  name?: string
  handle?: string
  description?: string | null
  logo_url?: string | null
  is_active?: boolean
}

export const createBrand = (input: CreateBrandInput) =>
  request<BrandResponse>("/admin/brands", { method: "POST", body: input })

export const updateBrand = (id: string, input: UpdateBrandInput) =>
  request<BrandResponse>(`/admin/brands/${id}`, { method: "PATCH", body: input })

/**
 * Activation and deactivation are separate endpoints on purpose (see
 * `src/api/admin/brands/[id]/activate/route.ts`): they get different write
 * scopes. So this UI calls them rather than folding them into a PATCH.
 */
export const setBrandActive = (id: string, isActive: boolean) =>
  request<BrandResponse>(`/admin/brands/${id}/${isActive ? "activate" : "deactivate"}`, {
    method: "POST",
  })

export const listSpecies = (isActive?: boolean) =>
  request<SpeciesListResponse>("/admin/pet-product-species", {
    query: { limit: 200, ...(isActive === undefined ? {} : { is_active: isActive }) },
  })

export const assignBrandToProduct = (productId: string, body: AssignBrandBody) =>
  request<AssignBrandResponse>(`/admin/products/${productId}/brand`, {
    method: "POST",
    body,
  })

export const removeBrandFromProduct = (productId: string) =>
  request<RemoveBrandResponse>(`/admin/products/${productId}/brand`, {
    method: "DELETE",
  })

export const upsertPetProductProfile = (
  productId: string,
  body: UpsertPetProductProfileBody
) =>
  request<ProductPetData>(`/admin/products/${productId}/pet-product-profile`, {
    method: "POST",
    body,
  })

export const removePetProductProfile = (productId: string) =>
  request<{ product_id: string; removed_profile: PetProductProfileData | null }>(
    `/admin/products/${productId}/pet-product-profile`,
    { method: "DELETE" }
  )

/**
 * Read a product's brand and pet profile.
 *
 * `GET /admin/products/:id` is the standard admin product route. `fields` is
 * requested explicitly rather than with `*` so the response stays small and
 * cannot be widened later by an unrelated field being added to the product.
 */
export const retrieveProductPetData = (productId: string) =>
  request<ProductPetData>(`/admin/products/${productId}`, {
    query: {
      fields:
        "id,+brand.name,+brand.handle,+brand.description,+brand.logo_url,+brand.is_active," +
        "+pet_product_profile.life_stage,+pet_product_profile.pet_size," +
        "+pet_product_profile.species.code,+pet_product_profile.species.name",
    },
  })