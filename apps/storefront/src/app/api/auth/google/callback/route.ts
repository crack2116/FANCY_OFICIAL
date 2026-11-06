import { NextRequest, NextResponse } from "next/server"
import { setAuthToken } from "@lib/data/cookies"

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const countryCode = "pe"

  if (!code) {
    return NextResponse.redirect(new URL(`/${countryCode}/account?error=missing_code`, req.url))
  }

  const backendUrl =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
    process.env.MEDUSA_BACKEND_URL ||
    "http://localhost:9000"

  try {
    // 1. Validate callback with Medusa backend
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
      return NextResponse.redirect(new URL(`/${countryCode}/account?error=auth_failed`, req.url))
    }

    const { token } = await res.json()
    if (!token) {
      return NextResponse.redirect(new URL(`/${countryCode}/account?error=no_token`, req.url))
    }

    // 2. Set Medusa JWT auth cookie
    await setAuthToken(token)

    // 3. Ensure customer record exists in Customer Module
    try {
      const customerRes = await fetch(`${backendUrl}/store/customers/me`, {
        method: "GET",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      })

      if (!customerRes.ok) {
        // First-time login: create customer in Medusa database using token user_metadata
        const parts = token.split(".")
        let userMeta: Record<string, string> = {}
        if (parts.length === 3) {
          try {
            const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"))
            userMeta = payload.user_metadata || {}
          } catch {
            // ignore decode failure
          }
        }

        if (userMeta.email) {
          await fetch(`${backendUrl}/store/customers`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              email: userMeta.email,
              first_name: userMeta.given_name || userMeta.name || "Cliente",
              last_name: userMeta.family_name || "",
            }),
          }).catch((err) => {
            console.warn("[Google Auth Callback] Profile create warning:", err.message)
          })
        }
      }
    } catch (profileErr: unknown) {
      const msg = profileErr instanceof Error ? profileErr.message : "Profile check error"
      console.warn("[Google Auth Callback] Profile sync note:", msg)
    }

    return NextResponse.redirect(new URL(`/${countryCode}/account`, req.url))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected callback error"
    console.error("[Google Auth Callback] Unexpected error:", msg)
    return NextResponse.redirect(new URL(`/${countryCode}/account?error=unexpected`, req.url))
  }
}
