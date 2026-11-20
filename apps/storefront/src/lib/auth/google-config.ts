import { NextRequest } from "next/server"

export function getMedusaAuthConfig() {
  const backendUrl =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
    process.env.MEDUSA_BACKEND_URL ||
    "http://localhost:9000"

  const publishableKey =
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
    process.env.MEDUSA_PUBLISHABLE_KEY ||
    ""

  return { backendUrl, publishableKey }
}

export function resolveStorefrontOrigin(req: NextRequest): string {
  const forwardedHost = req.headers.get("x-forwarded-host")
  const host = forwardedHost?.split(",")[0].trim() || req.headers.get("host")
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim()
  const proto = forwardedProto || req.nextUrl.protocol.replace(":", "") || "http"

  if (host) {
    return `${proto}://${host}`
  }

  return process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin
}

const IPV4_HOSTNAME_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/

export function resolveGoogleOAuthOrigin(origin: string): string {
  try {
    const parsed = new URL(origin)
    const portSuffix = parsed.port ? `:${parsed.port}` : ""
    if (parsed.hostname === "127.0.0.1") {
      return `${parsed.protocol}//localhost${portSuffix}`
    }
    if (IPV4_HOSTNAME_RE.test(parsed.hostname)) {
      return `${parsed.protocol}//shop.${parsed.hostname}.nip.io${portSuffix}`
    }
    return origin
  } catch {
    return origin
  }
}
