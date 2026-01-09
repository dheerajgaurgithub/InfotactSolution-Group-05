import { NextResponse, type NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const url = req.nextUrl
  const isProtected = url.pathname.startsWith("/admin")
  if (!isProtected) return NextResponse.next()

  const token = req.cookies.get("auth_token")?.value || ""
  if (!token) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("next", url.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Decode JWT payload without verification for UI gating
  try {
    const parts = token.split(".")
    if (parts.length === 3) {
      // Edge-safe base64url decode
      const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
      const padded = b64 + "===".slice((b64.length + 3) % 4)
      const json = atob(padded)
      const payloadJson = JSON.parse(json)
      if (payloadJson?.role === "admin") {
        return NextResponse.next()
      }
    }
  } catch {
    // fallthrough to redirect
  }

  const chatUrl = req.nextUrl.clone()
  chatUrl.pathname = "/chat"
  return NextResponse.redirect(chatUrl)
}

export const config = {
  matcher: ["/admin/:path*"],
}
