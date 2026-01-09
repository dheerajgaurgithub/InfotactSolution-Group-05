import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Document, DocumentChunk } from "@/lib/models"
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

// Get all documents
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const isPublic = searchParams.get("public") === "1"

    await connectDB()

    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const skip = Number.parseInt(searchParams.get("skip") || "0")

    if (isPublic) {
      // Public mode: return minimal, non-sensitive info for selection in chat
      const documents = await Document.find().sort({ createdAt: -1 }).limit(limit).skip(skip)
      const minimal = await Promise.all(
        documents.map(async (doc) => {
          const chunkCount = await DocumentChunk.countDocuments({ documentId: doc._id })
          return { id: String(doc._id), title: doc.title, chunkCount }
        }),
      )
      return NextResponse.json({ documents: minimal })
    }

    // Admin mode: require auth and return full info
    const token = readCookie("auth_token", req.headers.get("cookie"))
    const payload = token ? verifyToken<{ role?: string }>(token) : null
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const documents = await Document.find().sort({ createdAt: -1 }).limit(limit).skip(skip)
    const documentsWithCounts = await Promise.all(
      documents.map(async (doc) => {
        const chunkCount = await DocumentChunk.countDocuments({ documentId: doc._id })
        return {
          id: String(doc._id),
          title: doc.title,
          filePath: doc.filePath,
          fileType: doc.fileType,
          metadata: doc.metadata,
          chunkCount,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        }
      }),
    )
    return NextResponse.json({ documents: documentsWithCounts })
  } catch (error) {
    console.error("[v0] Failed to fetch documents:", error)
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 })
  }
}

// Delete a document
export async function DELETE(req: Request) {
  try {
    const token = readCookie("auth_token", req.headers.get("cookie"))
    const payload = token ? verifyToken<{ role?: string }>(token) : null
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const documentId = searchParams.get("id")

    if (!documentId) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 })
    }

    // Delete document chunks first
    await DocumentChunk.deleteMany({ documentId })

    // Delete document
    await Document.findByIdAndDelete(documentId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Failed to delete document:", error)
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
  }
}
