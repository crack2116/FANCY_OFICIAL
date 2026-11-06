import { NextResponse } from "next/server"

export async function GET() {
  const backendUrl =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
    process.env.MEDUSA_BACKEND_URL ||
    "http://localhost:9000"

  try {
    const res = await fetch(`${backendUrl}/auth/customer/google`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error("[Google Auth Initiate] Backend returned error:", errText)
      return NextResponse.redirect(
        new URL("/pe/account?error=google_not_configured", "http://localhost:8000")
      )
    }

    const data = await res.json()
    if (data?.location) {
      return NextResponse.redirect(data.location)
    }

    return NextResponse.json({ error: "No location returned from auth service" }, { status: 500 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error initiating Google authentication"
    console.error("[Google Auth Initiate] Network error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
