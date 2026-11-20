/**
 * Shopper-facing error layer.
 *
 * Every internal failure that can reach a shopper is funnelled through
 * `toPublicError`. It classifies an `unknown` into a small, closed set of codes
 * and returns Spanish copy owned by the translation dictionary, so no caller has
 * to format a message out of an error object. This is the only sanctioned way
 * to turn an error into text a shopper sees.
 *
 * Two rules drive the design.
 *
 * 1. Nothing internal is ever echoed. A backend message, SQL text, table or
 *    column name, an internal id, a token, a cookie or a provider payload never
 *    reaches the returned `message`.
 * 2. A specific cause is only claimed on a signal we trust: an HTTP status, an
 *    allow-listed Medusa error `type`, or a marker we author ourselves through
 *    `publicError`. Free text is never keyword-mined, so an unrelated backend
 *    message degrades to the generic message instead of naming a condition the
 *    shopper may not have hit.
 *
 * Classification is total: it never throws and never returns `undefined`. It
 * tolerates a real `Error`, a Medusa/fetch error object, a plain string, a
 * number, an object with no message, `null` and `undefined`.
 */

import { t, type TranslationKey } from "@lib/i18n/translations"

/**
 * Closed set of causes the storefront is willing to name to a shopper.
 *
 * Anything not in this list maps to `UNKNOWN`, which renders one honest
 * sentence. Codes are part of the internal contract: they are logged, never
 * displayed.
 */
export type PublicErrorCode =
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_SESSION_EXPIRED"
  | "EMAIL_ALREADY_REGISTERED"
  | "OUT_OF_STOCK"
  | "CART_NOT_FOUND"
  | "CART_UPDATE_FAILED"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "UNKNOWN"

/** A shopper-safe error: localised message plus the code that produced it. */
export type PublicError = {
  code: PublicErrorCode
  message: string
}

/** Non-sensitive diagnostics, for the developer console only. */
export type PublicErrorDiagnostics = {
  code: PublicErrorCode
  status: number | null
  type: string | null
}

/**
 * Field that marks an error whose code we authored ourselves. Reading it is a
 * deliberate, unambiguous signal; no text matching is involved. The worst a
 * false positive can do is pick a different safe Spanish sentence.
 */
const PUBLIC_CODE_KEY = "publicCode"

const PUBLIC_ERROR_CODES: readonly PublicErrorCode[] = [
  "AUTH_INVALID_CREDENTIALS",
  "AUTH_SESSION_EXPIRED",
  "EMAIL_ALREADY_REGISTERED",
  "OUT_OF_STOCK",
  "CART_NOT_FOUND",
  "CART_UPDATE_FAILED",
  "RATE_LIMITED",
  "NETWORK_ERROR",
  "UNKNOWN",
]

/** The only strings the error layer is allowed to hand to a shopper. */
const CODE_TO_MESSAGE: Readonly<Record<PublicErrorCode, TranslationKey>> = {
  AUTH_INVALID_CREDENTIALS: "account.login.error.invalidCredentials",
  AUTH_SESSION_EXPIRED: "error.auth.sessionExpired",
  EMAIL_ALREADY_REGISTERED: "error.auth.emailRegistered",
  OUT_OF_STOCK: "error.stock.insufficient",
  CART_NOT_FOUND: "error.cart.notFound",
  CART_UPDATE_FAILED: "error.cart.updateFailed",
  RATE_LIMITED: "error.rateLimited",
  NETWORK_ERROR: "error.network",
  UNKNOWN: "error.generic",
}

/**
 * Medusa error `type` values we recognise, matched by exact equality only.
 *
 * `unauthorized` is intentionally absent: it does not distinguish a mistyped
 * password from an expired session, so the status decides instead and the
 * message stays honest.
 */
const TYPE_TO_CODE: Readonly<Record<string, PublicErrorCode>> = {
  invalid_credentials: "AUTH_INVALID_CREDENTIALS",
  user_already_exists: "EMAIL_ALREADY_REGISTERED",
  insufficient_inventory: "OUT_OF_STOCK",
  insufficient_stock: "OUT_OF_STOCK",
}

/**
 * High-signal snake_case identifiers Medusa emits verbatim, matched as whole
 * tokens rather than as free text.
 *
 * The auth provider surfaces `invalid_credentials` in the error message
 * instead of as a `type`, so a token test is the only way to name a mistyped
 * password. Word boundaries keep it from firing on unrelated prose, and the
 * token cannot plausibly appear in an unrelated backend message. A false
 * positive still yields safe copy, never internal text.
 */
const TOKEN_TO_CODE: ReadonlyArray<readonly [RegExp, PublicErrorCode]> = [
  [/\binvalid_credentials\b/, "AUTH_INVALID_CREDENTIALS"],
  [/\binsufficient_inventory\b/, "OUT_OF_STOCK"],
]

/** Statuses that mean we never got a usable answer from the backend. */
const GATEWAY_STATUSES: readonly number[] = [408, 502, 503, 504]

/** Transport-level failures raised by fetch/undici, not by the backend. */
const NETWORK_FAILURE_PATTERN =
  /\b(failed to fetch|network ?error|failed to load)\b/i

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null
}

function readString(
  source: Record<string, unknown>,
  key: string
): string | null {
  const value = source[key]
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function readNumber(
  source: Record<string, unknown>,
  key: string
): number | null {
  const value = source[key]
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function isPublicErrorCode(value: string): value is PublicErrorCode {
  return (PUBLIC_ERROR_CODES as readonly string[]).includes(value)
}

/**
 * HTTP status from a Medusa/fetch error. The SDK exposes it both on the error
 * and on its response; the response wins because it is the server's answer.
 */
function readStatus(error: unknown): number | null {
  const root = asRecord(error)
  if (!root) {
    return null
  }

  const response = asRecord(root.response)
  const fromResponse = response ? readNumber(response, "status") : null

  return fromResponse ?? readNumber(root, "status")
}

/** Medusa error `type`, from the response payload or from the error itself. */
function readType(error: unknown): string | null {
  const root = asRecord(error)
  if (!root) {
    return null
  }

  const response = asRecord(root.response)
  const data = response ? asRecord(response.data) : null
  const fromData = data ? readString(data, "type") : null
  const type = fromData ?? readString(root, "type")

  return type ? type.toLowerCase() : null
}

/** The message, but only to run token tests against it. Never returned. */
function readMessage(error: unknown): string | null {
  const root = asRecord(error)
  const message = root ? readString(root, "message") : null

  return message ?? (typeof error === "string" ? error.trim() || null : null)
}

function readMarker(error: unknown): PublicErrorCode | null {
  const root = asRecord(error)
  const marker = root ? readString(root, PUBLIC_CODE_KEY) : null

  return marker && isPublicErrorCode(marker) ? marker : null
}

function matchToken(value: string | null): PublicErrorCode | null {
  if (!value) {
    return null
  }

  const normalized = value.toLowerCase()

  for (const [pattern, code] of TOKEN_TO_CODE) {
    if (pattern.test(normalized)) {
      return code
    }
  }

  return null
}

/**
 * A request that never produced an answer: no response at all, or a gateway
 * status. A 500 is excluded on purpose — the backend answered, it just failed,
 * and "we could not connect" would be a lie.
 */
function isNetworkFailure(
  root: Record<string, unknown> | null,
  status: number | null
): boolean {
  if (status !== null) {
    return GATEWAY_STATUSES.includes(status)
  }

  if (!root) {
    return false
  }

  if (root.request !== undefined && root.request !== null) {
    return true
  }

  return (
    root instanceof TypeError &&
    NETWORK_FAILURE_PATTERN.test(readMessage(root) ?? "")
  )
}

/**
 * Classify an internal error into one of the codes above. Pure and total: it
 * never throws and never inspects a payload beyond the three safe signals.
 */
export function classifyError(error: unknown): PublicErrorCode {
  const marker = readMarker(error)
  if (marker) {
    return marker
  }

  const status = readStatus(error)
  const type = readType(error)

  if (type) {
    const byType = TYPE_TO_CODE[type]
    if (byType) {
      return byType
    }
  }

  const byToken = matchToken(type) ?? matchToken(readMessage(error))
  if (byToken) {
    return byToken
  }

  if (status === 401) {
    return "AUTH_SESSION_EXPIRED"
  }

  if (status === 429) {
    return "RATE_LIMITED"
  }

  if (isNetworkFailure(asRecord(error), status)) {
    return "NETWORK_ERROR"
  }

  return "UNKNOWN"
}

/**
 * Turn an internal error into shopper-safe Spanish copy.
 *
 * `fallback` is used only when the cause is `UNKNOWN`, which lets a caller
 * contribute one honest, already-authored sentence for its own context (a promo
 * code, a shipping option) without ever seeing the raw error. A recognised
 * cause always wins over the fallback, because naming the real problem is more
 * useful than describing the operation that failed.
 */
export function toPublicError(error: unknown, fallback?: string): PublicError {
  const code = classifyError(error)
  const message =
    code === "UNKNOWN" && fallback ? fallback : t(CODE_TO_MESSAGE[code])

  return { code, message }
}

/** Convenience for the common case where only the message is needed. */
export function publicErrorMessage(error: unknown, fallback?: string): string {
  return toPublicError(error, fallback).message
}

/**
 * Build an error for a condition we detect ourselves, tagged so the classifier
 * can recognise it without reading any text.
 *
 * `detail` is our own internal note. It is logged in development only and is
 * never part of the message a shopper sees.
 */
export function publicError(code: PublicErrorCode, detail?: string): Error {
  if (detail && process.env.NODE_ENV !== "production") {
    console.error(`[public-error] ${code}`, detail)
  }

  const error = new Error(t(CODE_TO_MESSAGE[code])) as Error & {
    [PUBLIC_CODE_KEY]: PublicErrorCode
  }
  error[PUBLIC_CODE_KEY] = code

  return error
}

/**
 * Safe diagnostics for a failed request: the code, the HTTP status and the
 * Medusa error type. Deliberately excludes the message, the response body and
 * the headers, which can carry SQL, internal ids, tokens and cookies.
 */
export function inspectError(error: unknown): PublicErrorDiagnostics {
  return {
    code: classifyError(error),
    status: readStatus(error),
    type: readType(error),
  }
}