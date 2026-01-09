import type { ReactNode } from "react"

export default function AdminLayout({ children }: { children: ReactNode }) {
  // Access control is enforced by middleware and API route checks.
  // Keep layout simple to avoid runtime issues with request headers in Turbopack.
  return <>{children}</>
}
