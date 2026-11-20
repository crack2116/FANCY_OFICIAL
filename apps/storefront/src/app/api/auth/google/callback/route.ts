import { NextRequest, NextResponse } from "next/server"
import { getMedusaAuthConfig, resolveStorefrontOrigin } from "@lib/auth/google-config"
import { setAuthToken } from "@lib/data/cookies"
import { transferCart } from "@lib/data/customer"

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".")
  if (parts.length !== 3) {
    return null
  }
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"))
  } catch {
    try {
      return JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"))
    } catch {
      return null
    }
  }
}

function buildStoreHeaders(token: string, publishableKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    authorization: `Bearer ${token}`,
    ...(publishableKey ? { "x-publishable-api-key": publishableKey } : {}),
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const oauthError = searchParams.get("error")
  const countryCode = "pe"
  const origin = resolveStorefrontOrigin(req)
  const { backendUrl, publishableKey } = getMedusaAuthConfig()

  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/${countryCode}?login=true&auth_error=google_cancelled`, origin)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(`/${countryCode}?login=true&auth_error=google_failed`, origin)
    )
  }

  try {
    const callbackEndpoint = `${backendUrl}/auth/customer/google/callback?code=${encodeURIComponent(
      code
    )}${state ? `&state=${encodeURIComponent(state)}` : ""}`

    const res = await fetch(callbackEndpoint, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error("[Google Auth Callback] Error validating with backend:", errText)
      return NextResponse.redirect(
        new URL(`/${countryCode}?login=true&auth_error=google_failed`, origin)
      )
    }

    const data = await res.json()
    const initialToken: unknown = data?.token
    if (typeof initialToken !== "string" || !initialToken) {
      return NextResponse.redirect(
        new URL(`/${countryCode}?login=true&auth_error=google_failed`, origin)
      )
    }
    let activeToken: string = initialToken

    const customerRes = await fetch(`${backendUrl}/store/customers/me`, {
      method: "GET",
      headers: buildStoreHeaders(activeToken, publishableKey),
      cache: "no-store",
    })

    if (!customerRes.ok) {
      const payload = decodeJwtPayload(activeToken)
      const userMeta = (payload?.user_metadata as Record<string, string> | undefined) || {}
      const email = userMeta.email?.trim()
      const fullName = userMeta.name?.trim() || ""
      const nameParts = fullName ? fullName.split(/\s+/) : []
      const firstName = userMeta.given_name?.trim() || nameParts[0] || "Cliente"
      const lastName = userMeta.family_name?.trim() || nameParts.slice(1).join(" ")

      if (email) {
        const createRes = await fetch(`${backendUrl}/store/customers`, {
          method: "POST",
          headers: buildStoreHeaders(activeToken, publishableKey),
          body: JSON.stringify({
            email,
            first_name: firstName,
            last_name: lastName,
          }),
        })

        if (!createRes.ok) {
          const createErr = await createRes.text()
          console.warn("[Google Auth Callback] Profile create note:", createErr)
        }

        const refreshRes = await fetch(`${backendUrl}/auth/token/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${activeToken}`,
          },
          cache: "no-store",
        })

        if (refreshRes.ok) {
          const refreshed = await refreshRes.json()
          if (refreshed?.token) {
            activeToken = refreshed.token
          }
        }
      }
    }

    await setAuthToken(activeToken)
    await transferCart().catch(() => undefined)

    return NextResponse.redirect(new URL(`/${countryCode}/account`, origin))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected callback error"
    console.error("[Google Auth Callback] Unexpected error:", msg)
    return NextResponse.redirect(
      new URL(`/${countryCode}?login=true&auth_error=google_failed`, origin)
    )
  }
}
