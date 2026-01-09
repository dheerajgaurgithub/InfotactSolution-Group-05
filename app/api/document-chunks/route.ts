import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { DocumentChunk } from "@/lib/models"
import { verifyToken } from "@/lib/auth"

export const runtime = "nodejs"

function readCookie(name: string, cookieHeader: string | null) {
  if (!cookieHeader) return null
  const parts = cookieHeader.split(/;\s*/)
  for (const part of parts) {
    const [k, ...rest] = part.split("=")
    if (decodeURIComponent(k) === name) return decodeURIComponent(rest.join("="))
  }
  return null
}

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie")
    const token = readCookie("auth_token", cookieHeader)
    const payload = token ? verifyToken<{ role?: string }>(token) : null
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const documentId = searchParams.get("documentId")
    const limit = Number.parseInt(searchParams.get("limit") || "200")

    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 })
    }

    await connectDB()

    const chunks = await DocumentChunk.find({ documentId })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean()

    const results = chunks.map((c: any) => ({
      id: String(c._id),
      content: c.content,
      page: c?.metadata?.page ?? null,
      createdAt: c.createdAt,
    }))

    return NextResponse.json({ chunks: results })
  } catch (error) {
    console.error("[v0] Fetch document chunks error:", error)
    return NextResponse.json({ error: "Failed to fetch chunks" }, { status: 500 })
  }
}
