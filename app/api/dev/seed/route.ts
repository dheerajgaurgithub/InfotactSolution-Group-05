export const runtime = "nodejs"

import { NextResponse } from "next/server"
import path from "path"
import fs from "fs/promises"
import connectDB from "@/lib/mongodb"
import { Document, DocumentChunk } from "@/lib/models"
import { chunkText } from "@/lib/document-utils"
import { generateEmbedding } from "@/lib/rag-utils"

export async function POST(req: Request) {
  try {
    const url = new URL(req.url)
    const token = url.searchParams.get("token")
    const allowed = process.env.NODE_ENV !== "production" || (process.env.SEED_TOKEN && token === process.env.SEED_TOKEN)
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await connectDB()

    const root = process.cwd()
    const filePath = path.join(root, "Document.txt")

    // Read the policy document from repository root
    let fileText = ""
    try {
      fileText = await fs.readFile(filePath, "utf8")
    } catch (e) {
      return NextResponse.json({ error: "Document.txt not found at project root" }, { status: 404 })
    }

    const titleFromDoc = (() => {
      const firstLine = (fileText.split(/\r?\n/)[0] || "").trim()
      return firstLine.length > 0 ? firstLine.replace(/^#+\s*/, "") : "Document"
    })()

    // Remove prior ingestions for same title to avoid duplicates
    const existing = await Document.findOne({ title: titleFromDoc })
    if (existing) {
      await DocumentChunk.deleteMany({ documentId: existing._id })
      await existing.deleteOne()
    }

    const doc = await Document.create({
      title: titleFromDoc,
      filePath: "/seed/Document.txt",
      fileType: "text/plain",
      metadata: { seededAt: new Date().toISOString() },
    })

    const chunks = chunkText(fileText, { maxChunkSize: 1000, overlapSize: 200 })

    const batchSize = 5
    let created = 0
    for (let i = 0; i < chunks.length; i += batchSize) {
      const slice = chunks.slice(i, i + batchSize)
      const docs = await Promise.all(
        slice.map(async (content, idx) => {
          try {
            const embedding = await generateEmbedding(content)
            return await DocumentChunk.create({
              documentId: doc._id,
              content,
              embedding,
              metadata: { chunkIndex: i + idx, totalChunks: chunks.length },
            })
          } catch (e) {
            // Store without embedding to allow keyword fallback
            return await DocumentChunk.create({
              documentId: doc._id,
              content,
              embedding: [],
              metadata: { chunkIndex: i + idx, totalChunks: chunks.length, noEmbedding: true },
            })
          }
        }),
      )
      created += docs.length
    }

    return NextResponse.json({ ok: true, documentId: doc._id.toString(), title: doc.title, chunks: created })
  } catch (error) {
    console.error("[v0] Seed error:", error)
    return NextResponse.json({ error: "Failed to seed policies" }, { status: 500 })
  }
}
