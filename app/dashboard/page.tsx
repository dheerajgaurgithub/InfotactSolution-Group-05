import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { verifyToken } from "@/lib/auth"

function readCookie(name: string, cookieHeader: string | null) {
  if (!cookieHeader) return null
  const parts = cookieHeader.split(/;\s*/)
  for (const part of parts) {
    const [k, ...rest] = part.split("=")
    if (decodeURIComponent(k) === name) return decodeURIComponent(rest.join("="))
  }
  return null
}

export default function DashboardRedirectPage() {
  const cookieHeader = headers().get("cookie")
  const token = readCookie("auth_token", cookieHeader)
  if (!token) {
    redirect("/login?next=/dashboard")
  }
  const payload = verifyToken<{ role?: string }>(token!)
  if (payload?.role === "admin") {
    redirect("/admin")
  }
  redirect("/chat")
}
