/**
 * Utility functions for document processing
 */

/**
 * Split text into chunks for embedding
 * Uses a simple strategy: split by paragraphs, then combine small chunks
 */
export function chunkText(
  text: string,
  options: {
    maxChunkSize?: number
    overlapSize?: number
  } = {},
): string[] {
  const { maxChunkSize = 1000, overlapSize = 200 } = options

  // Split by double newlines (paragraphs) first
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  const chunks: string[] = []
  let currentChunk = ""

  for (const paragraph of paragraphs) {
    // If paragraph itself is too long, split it
    if (paragraph.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk)
        currentChunk = ""
      }

      // Split long paragraph by sentences
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph]
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxChunkSize) {
          if (currentChunk) chunks.push(currentChunk)
          currentChunk = sentence
        } else {
          currentChunk += (currentChunk ? " " : "") + sentence
        }
      }
    } else {
      // Add paragraph to current chunk if it fits
      if (currentChunk.length + paragraph.length > maxChunkSize) {
        chunks.push(currentChunk)
        // Add overlap from previous chunk
        const words = currentChunk.split(" ")
        currentChunk = words.slice(-Math.floor(overlapSize / 5)).join(" ") + " " + paragraph
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + paragraph
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk)
  }

  return chunks
}

/**
 * Extract text from various file types
 * Note: This is a simplified implementation. In production, use libraries like:
 * - pdf-parse for PDFs
 * - mammoth for DOCX
 * - For now, we'll assume text files
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type

  // Text files
  if (
    fileType === "text/plain" ||
    fileType === "text/markdown" ||
    file.name.toLowerCase().endsWith(".md") ||
    file.name.toLowerCase().endsWith(".txt")
  ) {
    return await file.text()
  }

  // PDF files
  if (fileType === "application/pdf") {
    // Parse PDF and return concatenated text (fallback)
    const pages = await extractPdfPages(file)
    return pages.map((p) => p.text).join("\n\n")
  }

  // Word documents (simplified - in production use mammoth)
  if (
    fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.endsWith(".docx")
  ) {
    throw new Error("DOCX parsing requires additional libraries. Please upload text or markdown files for now.")
  }

  // Fallback: if mime is missing/unknown, try reading as text
  try {
    return await file.text()
  } catch {
    throw new Error(`Unsupported file type: ${fileType || "unknown"}`)
  }
}

/**
 * Extract metadata from file
 */
export function extractMetadata(file: File) {
  return {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    lastModified: new Date(file.lastModified),
  }
}

/**
 * Extract per-page text from a PDF on the server using pdf-parse
 * Avoids pdf.js worker issues in browser/edge runtimes
 */
export async function extractPdfPages(file: File): Promise<{ page: number; text: string }[]> {
  const data = Buffer.from(await file.arrayBuffer())
  const pdfParse = (await import("pdf-parse")).default as any

  const pageTexts: Record<number, string> = {}
  const result = await pdfParse(data, {
    pagerender: (pageData: any) => {
      // pageText.items[].str contains strings for the page
      const strings = pageData?.textContent?.items?.map((it: any) => it.str || "") || []
      const text = strings.join(" ").replace(/\s+/g, " ").trim()
      pageTexts[pageData.pageIndex + 1] = text
      return "" // return empty; pdf-parse will concatenate if we return text
    },
  })

  const totalPages = result?.numpages || Object.keys(pageTexts).length || 0
  const pages: { page: number; text: string }[] = []
  for (let i = 1; i <= totalPages; i++) {
    pages.push({ page: i, text: pageTexts[i] || "" })
  }

  // Fallback: if all page texts are empty but aggregate text exists, distribute text across pages
  const allEmpty = pages.length > 0 && pages.every((p) => !p.text || p.text.trim().length === 0)
  const aggregate = typeof result?.text === "string" ? String(result.text).trim() : ""
  if (allEmpty && aggregate) {
    // Try to split on form feed (common page delimiter), else evenly chunk by characters
    let parts = aggregate.split('\f').map((s: string) => s.trim()).filter(Boolean)
    if (parts.length !== totalPages) {
      // Even distribution by characters
      parts = []
      const len = aggregate.length
      const slice = Math.ceil(len / Math.max(totalPages, 1))
      for (let i = 0; i < totalPages; i++) {
        parts.push(aggregate.slice(i * slice, (i + 1) * slice).trim())
      }
    }
    for (let i = 0; i < totalPages; i++) {
      pages[i] = { page: i + 1, text: parts[i] || "" }
    }
  }
  return pages
}

/**
 * Chunk PDF pages while preserving page numbers in output
 */
export function chunkPdfPages(
  pages: { page: number; text: string }[],
  options: { maxChunkSize?: number; overlapSize?: number } = {},
): { content: string; page: number }[] {
  const { maxChunkSize = 1000, overlapSize = 200 } = options
  const results: { content: string; page: number }[] = []

  for (const { page, text } of pages) {
    if (!text) continue
    if (text.length <= maxChunkSize) {
      results.push({ content: text, page })
      continue
    }

    // Sentence-based split with overlap
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
    let chunk = ""
    for (const s of sentences) {
      if (chunk.length + s.length > maxChunkSize) {
        if (chunk) results.push({ content: chunk, page })
        const words = chunk.split(" ")
        const overlap = words.slice(-Math.floor(overlapSize / 5)).join(" ")
        chunk = (overlap ? overlap + " " : "") + s
      } else {
        chunk += (chunk ? " " : "") + s
      }
    }
    if (chunk) results.push({ content: chunk, page })
  }

  return results
}
