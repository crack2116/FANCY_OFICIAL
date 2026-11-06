import { MedusaError } from "@medusajs/framework/utils"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  ALLOWED_ARTWORK_MIME_TYPES,
  ARTWORK_TARGETS,
  DEFAULT_ARTWORK_TARGET,
  MAX_ARTWORK_BYTES,
  normalizeCategoryHandle,
  normalizeHeroSlideId,
  uploadBrandingArtworkWorkflow,
  type ArtworkTarget,
} from "../../../../workflows/branding-artwork"

/**
 * Upload one artwork image and merge its URL into branding.
 *
 * ONE ENDPOINT FOR BOTH TARGETS
 * -----------------------------
 * Category circles and hero slides are the same operation with a different key
 * space: one file in, one URL stored under a known key. Splitting them into two
 * routes would mean two multer registrations, two request shapes and two places
 * where the base64 and compensation rules could drift apart — and both of those
 * were wrong once already. The `target` field selects WHICH map is written.
 *
 * SEPARATE FROM `POST /admin/branding` ON PURPOSE
 * -----------------------------------------------
 * That route is JSON and its body is validated by a shared zod contract that the
 * storefront also reads. A multipart body cannot go through it, and bolting an
 * upload onto it would make the one endpoint that saves the branding depend on a
 * content type most of its callers never send. This route writes exactly one
 * thing — one artwork URL — and everything else on the screen still saves
 * through the JSON route.
 *
 * The two-write sequence lives in `uploadBrandingArtworkWorkflow`; this handler
 * only rejects bad input and shapes the response, per `apps/backend/AGENTS.md`.
 *
 * Authorisation: this file lives under `/admin`, and Medusa's `ApiLoader`
 * installs the admin `authenticate("user", ...)` middleware on the whole
 * `/admin` namespace. It deliberately does not export `AUTHENTICATE = false`.
 */

/** The multipart field the file picker sends, mirrored in `api/middlewares.ts`. */
export const ARTWORK_FILE_FIELD = "files"

/**
 * The form field naming WHAT the image is for: a category or a hero slide.
 *
 * Optional and defaulted, so an admin build that predates the hero upload keeps
 * posting the same request it always did.
 */
export const ARTWORK_TARGET_FIELD = "target"

/**
 * The form field naming the specific slot: a category handle or a hero slide id.
 *
 * Still called `handle` even for a hero slide, because renaming it would break
 * the admin client shape that was verified against the running server for the
 * category case, and a hero slide id is close enough to a handle that one wire
 * name for both reads fine at the call site.
 */
export const ARTWORK_KEY_FIELD = "handle"

/**
 * Read the requested target, defaulting rather than rejecting.
 *
 * An unknown value is a 400, not a silent fallback to "category": falling back
 * would write a hero image into a category, which is the kind of mistake that
 * looks correct until somebody reads the home page.
 */
const readTarget = (value: unknown): ArtworkTarget | null => {
  if (value === undefined || value === null || value === "") {
    return DEFAULT_ARTWORK_TARGET
  }

  return (ARTWORK_TARGETS as readonly string[]).includes(String(value))
    ? (String(value) as ArtworkTarget)
    : null
}

/**
 * Read multer's array field into a single file.
 *
 * Returns null rather than throwing so the caller decides the status: a missing
 * file and a malformed file are both operator mistakes, and both are answered
 * with 400 and a sentence an operator can act on rather than a stack trace.
 */
const readUploadedFile = (req: MedusaRequest) => {
  const files = req.files as
    | Record<string, Express.Multer.File[]>
    | Express.Multer.File[]
    | undefined

  const list = Array.isArray(files)
    ? files
    : files && typeof files === "object"
      ? files[ARTWORK_FILE_FIELD] ?? []
      : []

  return list[0]
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const target = readTarget(req.body?.[ARTWORK_TARGET_FIELD])

  if (!target) {
    res.status(400).json({ message: "No sabemos a qué parte de la tienda aplicar la imagen." })
    return
  }

  const rawKey = req.body?.[ARTWORK_KEY_FIELD]

  // Each target validates its own key space: a hero slide id must name a slide
  // that exists, a category handle only has to be shaped like one. Sharing the
  // check would let a slide id land in the category map and never render.
  const key =
    target === "hero"
      ? normalizeHeroSlideId(rawKey)
      : normalizeCategoryHandle(rawKey)

  if (!key) {
    res.status(400).json({
      message:
        target === "hero"
          ? "Esa diapositiva de la portada no existe. Recarga la pantalla e inténtalo de nuevo."
          : "No pudimos saber a qué categoría pertenece la imagen. Recarga la pantalla e inténtalo de nuevo.",
    })
    return
  }

  const file = readUploadedFile(req)

  if (!file?.buffer) {
    res.status(400).json({ message: "No se recibió ninguna imagen." })
    return
  }

  // Rejected here rather than in the workflow: these are transport-level
  // mistakes with a message the operator can act on, and the workflow engine
  // would surface them as a 500 with an opaque stack.
  if (!ALLOWED_ARTWORK_MIME_TYPES.includes(file.mimetype)) {
    res.status(400).json({
      message: "Ese archivo no es una imagen compatible. Usa JPG, PNG, WebP, AVIF o GIF.",
    })
    return
  }

  if (file.size > MAX_ARTWORK_BYTES) {
    res.status(400).json({
      message: `La imagen supera los ${MAX_ARTWORK_BYTES / (1024 * 1024)} MB. Exporta una versión más liviana e inténtalo de nuevo.`,
    })
    return
  }

  const { result } = await uploadBrandingArtworkWorkflow(req.scope).run({
    input: {
      target,
      key,
      filename: file.originalname,
      mimetype: file.mimetype,
      // Encoded HERE, at the edge, and not inside the workflow. A Buffer does
      // not survive the workflow composer's input serialisation: it reaches the
      // step as a plain object, and the step would then store the literal text
      // `[object Object]` as the image. See `BrandingArtworkUpload["content"]`.
      content: file.buffer.toString("base64"),
    },
  })

  if (!result) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "The artwork workflow returned no result"
    )
  }

  res.status(200).json({ artwork: result })
}