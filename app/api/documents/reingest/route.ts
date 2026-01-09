import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { DocumentChunk } from "@/lib/models"
import { verifyToken } from "@/lib/auth"
import { chunkText } from "@/lib/document-utils"
import { Types } from "mongoose"

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

async function embed(texts: string[]): Promise<number[][]> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured")
  const BATCH = 50
  const out: number[][] = []
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH)
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: "text-embedding-3-small", input: slice }),
    })
    if (!res.ok) {
      const t = await res.text().catch(() => "")
      throw new Error(`Embeddings failed: HTTP ${res.status} ${t}`)
    }
    const data = await res.json()
    const embs = (data.data || []).map((d: any) => d.embedding as number[])
    out.push(...embs)
    // brief delay to be gentle on rate limits
    if (i + BATCH < texts.length) await new Promise((r) => setTimeout(r, 150))
  }
  return out
}

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie")
    const token = readCookie("auth_token", cookieHeader)
    const payload = token ? verifyToken<{ role?: string }>(token) : null
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { documentId, text } = await req.json()
    if (!documentId || !text || String(text).trim().length === 0) {
      return NextResponse.json({ error: "documentId and text are required" }, { status: 400 })
    }

    await connectDB()

    // Remove existing chunks for this document
    let docObjectId: Types.ObjectId
    try {
      docObjectId = new Types.ObjectId(String(documentId))
    } catch {
      return NextResponse.json({ error: "Invalid documentId" }, { status: 400 })
    }
    await DocumentChunk.deleteMany({ documentId: docObjectId })

    const chunks = chunkText(String(text), { maxChunkSize: 1000, overlapSize: 200 })
    if (chunks.length === 0) {
      return NextResponse.json({ error: "No chunks produced from text" }, { status: 400 })
    }

    // Try embeddings; if quota/rate error, store with empty embeddings for keyword fallback
    let docs: any[] = []
    try {
      const embeddings = await embed(chunks)
      docs = chunks.map((content, i) => ({
        documentId: docObjectId,
        content,
        embedding: embeddings[i],
        metadata: { page: null },
      }))
      await DocumentChunk.insertMany(docs)
      return NextResponse.json({ ok: true, chunkCount: docs.length })
    } catch (e: any) {
      const msg = e?.message || "embeddings failed"
      // Fallback: store without embeddings
      docs = chunks.map((content) => ({
        documentId: docObjectId,
        content,
        embedding: [],
        metadata: { page: null, noEmbedding: true },
      }))
      await DocumentChunk.insertMany(docs)
      return NextResponse.json({ ok: true, chunkCount: docs.length, fallback: "no-embeddings", reason: msg })
    }
  } catch (error) {
    console.error("[v0] Re-ingest error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: "Failed to re-ingest document", reason: message }, { status: 500 })
  }
}
