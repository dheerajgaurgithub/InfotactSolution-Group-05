import { NextResponse } from "next/server"
import { AUTH_COOKIE, verifyToken } from "@/lib/auth"

export async function GET(req: Request) {
  try {
    const cookie = (req.headers.get("cookie") || "").split(/;\s*/).find((c) => c.startsWith(`${AUTH_COOKIE}=`))
    if (!cookie) return NextResponse.json({ user: null })
    const token = cookie.split("=")[1]
    const payload = verifyToken<{ sub: string; email: string; role: string }>(token)
    if (!payload) return NextResponse.json({ user: null })
    return NextResponse.json({ user: { id: payload.sub, email: payload.email, role: payload.role } })
  } catch {
    return NextResponse.json({ user: null })
  }
}
