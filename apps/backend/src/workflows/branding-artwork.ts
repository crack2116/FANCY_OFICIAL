import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import type { RemoteQueryFunction } from "@medusajs/framework/types"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
  type WorkflowData,
} from "@medusajs/framework/workflows-sdk"
import { updateStoresStep } from "@medusajs/medusa/core-flows"

import {
  ARTWORK_KEY_PATTERN,
  HERO_SLIDE_IDS,
  mergeBrandingMetadata,
  readBranding,
  type StoreBranding,
} from "../lib/store-branding"

/**
 * ============================================================================
 *  Upload branding artwork and merge the URL into the branding document.
 * ============================================================================
 *
 * Serves both artwork targets — category circles and hero slides — because they
 * differ only in WHICH MAP a URL lands in. Two workflows would mean two copies of
 * the ordering guarantee, the compensation and the base64 rationale, and those
 * are exactly the parts that were wrong once already.
 *
 * WHY A WORKFLOW AND NOT A ROUTE HANDLER
 * --------------------------------------
 * Two writes in sequence — the file store, then the store's metadata — each with
 * its own rules. Keeping them here leaves the route thin, per
 * `apps/backend/AGENTS.md`, and means a caller that is not HTTP gets the same
 * ordering and the same compensation.
 *
 * WHY THE FILE IS STORED FIRST
 * ----------------------------
 * The order is deliberate. If the metadata write fails, the bytes are orphaned in
 * `static/` and the slot keeps showing its previous image, which renders. The
 * other order would leave branding pointing at a URL that never exists. An
 * orphaned file is invisible; a dangling URL is a broken image on the home page.
 *
 * WHY THE WRITE GOES THROUGH `updateStoresStep`
 * ---------------------------------------------
 * `update-stores` REPLACES the whole `metadata` object rather than merging into
 * it. Writing only the artwork key would silently drop the colours, the logo and
 * the announcement bar that the same screen owns, so the full document is
 * recomputed here and spread back in by `mergeBrandingMetadata`.
 *
 * WHY NOTHING IS EVER DELETED AFTERWARDS
 * --------------------------------------
 * Re-uploading orphans the previous file. That is accepted on purpose: the file
 * module has no "is this URL referenced anywhere" primitive, and guessing from
 * here could delete a file a product still points at. The one deletion that does
 * happen is the compensation below, which removes a file THIS upload created
 * moments earlier and that nothing can reference yet.
 */

/**
 * 5 MB.
 *
 * Artwork renders at roughly 620px wide on the storefront hero and 440px in a
 * category card, so a sane export is well under a megabyte even at 2x density.
 * The ceiling is generous rather than tight on purpose: this is user input
 * reaching the filesystem, and the request body is held in memory by multer
 * before anything is validated, so the limit has to exist even though almost
 * nothing legitimate reaches it.
 */
export const MAX_ARTWORK_BYTES = 5 * 1024 * 1024

/**
 * Accepted MIME types.
 *
 * A fixed list rather than `image/*`: the prefix also matches `image/svg+xml`,
 * and an SVG is a document that runs script. The local file provider serves
 * `static/` from the SAME origin as the admin, so an uploaded SVG would be a
 * stored-XSS vector against the operator's own session. The shipped demo artwork
 * stays SVG in the repo, where it is reviewed as code rather than uploaded.
 */
export const ALLOWED_ARTWORK_MIME_TYPES: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]

/**
 * Which artwork map a URL belongs to.
 *
 * `"category"` is the default because that is what the endpoint did when it only
 * served category circles; an older admin build sending no `target` keeps
 * working unchanged.
 */
export const ARTWORK_TARGETS = ["category", "hero"] as const

export type ArtworkTarget = (typeof ARTWORK_TARGETS)[number]

export const DEFAULT_ARTWORK_TARGET: ArtworkTarget = "category"

/** What the route hands over after multer has parsed the multipart body. */
export type BrandingArtworkUpload = {
  target: ArtworkTarget
  /**
   * A category handle when `target` is `"category"`, a hero slide id when it is
   * `"hero"`. Normalised and validated by the route before it gets here.
   */
  key: string
  /** Multer's `originalname`, already sanitised of path separators by multer. */
  filename: string
  mimetype: string
  /**
   * The file bytes, ALREADY base64-encoded by the caller.
   *
   * A `Buffer` must never cross into a workflow input. The workflow composer
   * serialises step inputs to store them in the transaction, and a Buffer does
   * not survive that trip: it arrives at the step as a plain object, so
   * `.toString("base64")` yields the literal string `"[object Object]"` and the
   * upload "succeeds" while writing 15 bytes of text where an image belongs.
   * The failure is silent — HTTP 200, a URL back, a broken image on the home
   * page — so the encoding happens at the edge, in the route, exactly as
   * Medusa's own `/admin/uploads` handler does it.
   */
  content: string
}

export type BrandingArtworkResult = {
  target: ArtworkTarget
  key: string
  url: string
}

/**
 * Key normalisation, shared by the route and any non-HTTP caller.
 *
 * Lowercased because every key that reaches this workflow — Medusa category
 * handles and hero slide ids alike — is lowercase by definition, so an operator
 * typing "Alimentos" and a seed writing "alimentos" must land on one entry
 * rather than two, of which only one would ever render.
 */
const normalizeKey = (raw: unknown): string | null => {
  if (typeof raw !== "string") {
    return null
  }

  const normalized = raw.trim().toLowerCase()

  return ARTWORK_KEY_PATTERN.test(normalized) ? normalized : null
}

/**
 * Normalise a category handle, or null when it is not one.
 *
 * Category handles are pattern-checked only: a shop may add categories the
 * storefront has no card for yet, and refusing those uploads would be a limit
 * with no upside — an unread entry is inert, not broken.
 */
export const normalizeCategoryHandle = (handle: unknown): string | null =>
  normalizeKey(handle)

/**
 * Normalise a hero slide id, or null when it names no slide.
 *
 * Stricter than a category handle on purpose: a hero slide id names a piece of
 * landing composition, so an unknown one can only ever produce an entry nothing
 * reads. `HERO_SLIDE_IDS` is the authoritative list; see the contract for why it
 * is duplicated rather than derived.
 */
export const normalizeHeroSlideId = (slideId: unknown): string | null => {
  const normalized = normalizeKey(slideId)

  return normalized && (HERO_SLIDE_IDS as readonly string[]).includes(normalized)
    ? normalized
    : null
}

const uploadArtworkStep = createStep<
  BrandingArtworkUpload,
  { url: string },
  { file_id: string } | undefined
>("upload-artwork", async (input, { container }) => {
  const fileModule = container.resolve(Modules.FILE)

  // `access: "public"` is explicit because the file module DEFAULTS to private.
  // The local provider writes both into the same served directory but prefixes
  // the private key, and a `private-` key is not fetchable by the storefront.
  // Omitting it produces URLs that 404 from the home page.
  const file = await fileModule.createFiles({
    filename: input.filename,
    mimeType: input.mimetype,
    // Already a base64 STRING by the time it gets here — see the comment on
    // `BrandingArtworkUpload["content"]`. `LocalFileService` round-trips this
    // through `Buffer.from(content, "base64")`, so encoding it twice, or
    // handing it a Buffer, is what corrupts the image.
    content: input.content,
    access: "public",
  })

  const created = Array.isArray(file) ? file[0] : file

  if (!created?.url) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "The file module returned no URL for the uploaded artwork"
    )
  }

  return new StepResponse({ url: created.url }, { file_id: created.id })
},
/**
 * Removes the uploaded file when a LATER step fails, so a failed merge does not
 * leave the bytes in `static/` forever. Nothing else can reference this file
 * yet: it was created seconds ago and its URL has not been written anywhere.
 */
async (uploaded, { container }) => {
  if (!uploaded?.file_id) {
    return
  }

  const fileModule = container.resolve(Modules.FILE)

  try {
    await fileModule.deleteFiles(uploaded.file_id)
  } catch {
    // A compensation that fails must not mask the ORIGINAL error, which is the
    // one that explains why the upload was rolled back at all.
  }
})

type MergedStoreInput = {
  target: ArtworkTarget
  key: string
  url: string
}

type MergedStoreOutput = {
  store_id: string
  metadata: Record<string, unknown>
}

/**
 * Recompute the whole branding document with one artwork URL merged in.
 *
 * Split from the store write so the merge happens on real, resolved values
 * inside a step rather than on workflow proxies in the composer.
 */
const mergeArtworkMetadataStep = createStep<
  MergedStoreInput,
  MergedStoreOutput,
  undefined
>("merge-artwork-metadata", async (input, { container }) => {
  const query = container.resolve<RemoteQueryFunction>(ContainerRegistrationKeys.QUERY)

  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "metadata"],
  })

  const store = (stores as { id: string; metadata?: unknown }[])?.[0]

  if (!store) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No store record was found to merge artwork into"
    )
  }

  const current = readBranding(store.metadata)

  const next: StoreBranding =
    input.target === "hero"
      ? {
          ...current,
          hero_artwork: { ...current.hero_artwork, [input.key]: input.url },
        }
      : {
          ...current,
          category_artwork: { ...current.category_artwork, [input.key]: input.url },
        }

  return new StepResponse({
    store_id: store.id,
    metadata: mergeBrandingMetadata(store.metadata, next),
  })
})

export const uploadBrandingArtworkWorkflow = createWorkflow<
  BrandingArtworkUpload,
  BrandingArtworkResult,
  []
>("upload-branding-artwork", (input: WorkflowData<BrandingArtworkUpload>) => {
  const uploaded = uploadArtworkStep(input)

  const merged = mergeArtworkMetadataStep({
    target: input.target,
    key: input.key,
    url: uploaded.url,
  })

  updateStoresStep({
    selector: { id: merged.store_id },
    update: { metadata: merged.metadata },
  })

  return new WorkflowResponse({
    target: input.target,
    key: input.key,
    url: uploaded.url,
  })
})