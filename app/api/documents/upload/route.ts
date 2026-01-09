export const runtime = "nodejs"
import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Document, DocumentChunk } from "@/lib/models"
import { extractTextFromFile, extractMetadata, chunkText, extractPdfPages, chunkPdfPages } from "@/lib/document-utils"
import { generateEmbedding } from "@/lib/rag-utils"
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

export async function POST(req: Request) {
  try {
    const token = readCookie("auth_token", req.headers.get("cookie"))
    const payload = token ? verifyToken<{ role?: string }>(token) : null
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Extract text/pages from file
    const isPdf = file.type === "application/pdf"
    let text = isPdf ? "" : await extractTextFromFile(file)
    let pages = isPdf ? await extractPdfPages(file) : []

    // OCR fallback for scanned PDFs (no extractable text)
    if (isPdf && pages.every((p) => !p.text || p.text.trim().length === 0)) {
      const ocrKey = process.env.OCR_SPACE_API_KEY
      if (ocrKey) {
        try {
          const ocrForm = new FormData()
          ocrForm.append("apikey", ocrKey)
          ocrForm.append("isOverlayRequired", "false")
          ocrForm.append("isCreateSearchablePdf", "false")
          ocrForm.append("isTable", "true")
          ocrForm.append("OCREngine", "2")
          ocrForm.append("language", "eng")
          ocrForm.append("file", file)

          const ocrRes = await fetch("https://api.ocr.space/parse/image", {
            method: "POST",
            body: ocrForm,
          })
          if (!ocrRes.ok) throw new Error(`OCR.space failed: HTTP ${ocrRes.status}`)
          const ocrData = await ocrRes.json()
          const results = Array.isArray(ocrData?.ParsedResults) ? ocrData.ParsedResults : []
          if (results.length > 0) {
            pages = results.map((r: any, idx: number) => ({ page: idx + 1, text: String(r?.ParsedText || "").trim() }))
          }
        } catch (e) {
          console.warn("[v0] OCR fallback failed:", e)
        }
      }
    }

    if ((isPdf && (pages.length === 0 || pages.every((p) => !p.text || p.text.trim().length === 0))) || (!isPdf && (!text || text.trim().length === 0))) {
      const ocrHint = isPdf
        ? (process.env.OCR_SPACE_API_KEY
            ? "OCR attempted but returned no text. Ensure the PDF pages are clear and not password-protected."
            : "This PDF appears to be scanned (image-based). Set OCR_SPACE_API_KEY in .env.local to enable OCR, then restart and re-upload.")
        : ""
      const reason = isPdf ? `No extractable text from PDF. ${ocrHint}` : "No extractable text from file."
      return NextResponse.json({ error: "Could not extract text from file", reason }, { status: 400 })
    }

    // Extract metadata
    const metadata = extractMetadata(file)

    // Create document record
    const document = await Document.create({
      title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
      filePath: `/uploads/${file.name}`, // In production, store actual file path or blob URL
      fileType: file.type,
      metadata,
    })

    // Chunk the text (page-aware for PDFs)
    const chunks = isPdf
      ? chunkPdfPages(pages, { maxChunkSize: 1000, overlapSize: 200 }).map((c) => ({ content: c.content, page: c.page }))
      : chunkText(text, { maxChunkSize: 1000, overlapSize: 200 }).map((c) => ({ content: c, page: undefined as number | undefined }))

    // Generate embeddings and store chunks (in batches). If embeddings fail (429/quota), store without embeddings for keyword fallback.
    const chunkPromises = chunks.map(async (chunkObj, index) => {
      try {
        const embedding = await generateEmbedding(chunkObj.content)
        return await DocumentChunk.create({
          documentId: document._id,
          content: chunkObj.content,
          embedding,
          metadata: {
            chunkIndex: index,
            totalChunks: chunks.length,
            page: chunkObj.page,
          },
        })
      } catch (error) {
        console.warn(`[v0] Embedding failed for chunk ${index}, storing without embedding:`, error)
        return await DocumentChunk.create({
          documentId: document._id,
          content: chunkObj.content,
          embedding: [],
          metadata: {
            chunkIndex: index,
            totalChunks: chunks.length,
            page: chunkObj.page,
            noEmbedding: true,
          },
        })
      }
    })

    // Process in batches of 5 to avoid overwhelming the API
    const batchSize = 5
    const documentChunks = []
    for (let i = 0; i < chunkPromises.length; i += batchSize) {
      const batch = chunkPromises.slice(i, i + batchSize)
      const results = await Promise.all(batch)
      documentChunks.push(...results)
    }

    return NextResponse.json(
      {
        success: true,
        document: {
          id: document._id,
          title: document.title,
          chunks: documentChunks.length,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[v0] Document upload error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process document" },
      { status: 500 },
    )
  }
}
