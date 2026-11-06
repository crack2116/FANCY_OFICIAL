import { inspectError, publicError } from "@lib/errors/public-error"

/**
 * Handler for a failed Medusa request.
 *
 * This used to throw the backend's own message, capitalised. Callers then read
 * `err.message` and rendered it, which is how a Medusa payload reached a
 * shopper. The thrown message is now Spanish copy chosen by the public-error
 * layer, so the text that travels up the chain is safe by construction.
 *
 * What is logged is deliberately narrower than what it replaced. The old
 * version dumped the response body and the response headers; headers carry
 * `set-cookie` and bearer tokens, and a body can carry SQL, column names or
 * provider payloads. It also logged the request URL, which can carry a token in
 * its query string. We now log the classification code, the HTTP status and
 * the Medusa error type: enough to diagnose the failure, none of it sensitive.
 */
export default function medusaError(error: unknown): never {
  const { code, status, type } = inspectError(error)

  console.error(
    `[medusa] request failed code=${code} status=${status ?? "none"} type=${type ?? "none"}`
  )

  throw publicError(code)
}