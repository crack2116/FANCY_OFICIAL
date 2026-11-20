import { NextRequest, NextResponse } from "next/server"
import {
  getMedusaAuthConfig,
  resolveGoogleOAuthOrigin,
  resolveStorefrontOrigin,
} from "@lib/auth/google-config"

export async function GET(req: NextRequest) {
  const { backendUrl } = getMedusaAuthConfig()
  const origin = resolveStorefrontOrigin(req)
  const oauthOrigin = resolveGoogleOAuthOrigin(origin)
  const rawCountry = req.nextUrl.searchParams.get("countryCode")
  const countryCode =
    rawCountry && /^[a-z]{2}$/i.test(rawCountry)
      ? rawCountry.toLowerCase()
      : process.env.NEXT_PUBLIC_DEFAULT_REGION || "pe"

  if (oauthOrigin !== origin) {
    const redirectUrl = new URL("/api/auth/google", oauthOrigin)
    redirectUrl.searchParams.set("countryCode", countryCode)
    return NextResponse.redirect(redirectUrl)
  }

  const callbackUrl = `${origin}/api/auth/google/callback`

  try {
    const res = await fetch(`${backendUrl}/auth/customer/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_url: callbackUrl }),
      cache: "no-store",
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error("[Google Auth Initiate] Backend returned error:", errText)
      return NextResponse.redirect(
        new URL(`/${countryCode}?login=true&auth_error=google_not_configured`, origin)
      )
    }

    const data = await res.json()
    if (data?.location) {
      return NextResponse.redirect(data.location)
    }

    return NextResponse.redirect(
      new URL(`/${countryCode}?login=true&auth_error=google_not_configured`, origin)
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error initiating Google authentication"
    console.error("[Google Auth Initiate] Network error:", message)
    return NextResponse.redirect(
      new URL(`/${countryCode}?login=true&auth_error=google_unavailable`, origin)
    )
  }
}
