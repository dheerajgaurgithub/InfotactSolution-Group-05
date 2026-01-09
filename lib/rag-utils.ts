import connectDB from "./mongodb"
import DocumentChunk from "./models/DocumentChunk"
import { Types } from "mongoose"

/**
 * Generate embeddings using OpenAI's API
 * Note: In production, you should use the AI SDK or OpenAI client library
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to generate embedding: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0)
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0))
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0))
  return dotProduct / (magnitudeA * magnitudeB)
}

export interface SearchResult {
  chunkId: string
  documentId: string
  documentTitle: string
  content: string
  similarity: number
  metadata: Record<string, any>
}

/**
 * Perform semantic search on document chunks using vector similarity
 * Updated to explicitly use MongoDB Atlas $vectorSearch and strict thresholding
 */
export async function searchDocuments(
  queryEmbedding: number[],
  options: {
    matchThreshold?: number
    matchCount?: number
    useAtlasSearch?: boolean
    documentIds?: string[]
  } = {},
): Promise<SearchResult[]> {
  await connectDB()

  const { matchThreshold = 0.8, matchCount = 3, useAtlasSearch = true, documentIds = [] } = options

  if (useAtlasSearch) {
    try {
      const matchDocStage = (documentIds && documentIds.length > 0)
        ? [{ $match: { documentId: { $in: documentIds.map((id) => new Types.ObjectId(String(id))) } } }]
        : []

      const results = await DocumentChunk.aggregate([
        {
          $vectorSearch: {
            index: "vector_index",
            path: "embedding",
            queryVector: queryEmbedding,
            numCandidates: matchCount * 10,
            limit: matchCount,
          },
        },
        ...matchDocStage,
        {
          $lookup: {
            from: "documents",
            localField: "documentId",
            foreignField: "_id",
            as: "document",
          },
        },
        {
          $unwind: "$document",
        },
        {
          $project: {
            chunkId: "$_id",
            documentId: "$documentId",
            documentTitle: "$document.title",
            content: 1,
            metadata: 1,
            similarity: { $meta: "vectorSearchScore" },
          },
        },
      ])

      return results.filter((r) => r.similarity >= matchThreshold)
    } catch (error) {
      console.warn("[v0] Atlas Vector Search failed:", error)
      return []
    }
  }

  // Fallback: Manual cosine similarity calculation (for non-Atlas or if Atlas Search fails)
  const findFilter: any = {}
  if (documentIds && documentIds.length > 0) {
    findFilter.documentId = { $in: documentIds.map((id) => new Types.ObjectId(String(id))) }
  }
  const chunks = await DocumentChunk.find(findFilter).limit(1000).populate("documentId")

  const results = chunks
    .map((chunk) => {
      const similarity = cosineSimilarity(queryEmbedding, chunk.embedding)
      return {
        chunkId: chunk._id.toString(),
        documentId: chunk.documentId.toString(),
        documentTitle: (chunk.documentId as any).title || "Unknown",
        content: chunk.content,
        similarity,
        metadata: chunk.metadata,
      }
    })
    .filter((result) => result.similarity >= matchThreshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, matchCount)

  return results
}

/**
 * Format search results as citations for the AI assistant
 */
export function formatCitations(searchResults: SearchResult[]) {
  return (searchResults as any[]).map((result) => {
    const title = result.documentTitle || result.title || "Document"
    const page = (result.metadata && result.metadata.page) || result.page || undefined
    const content = String(result.content || "")
    return {
      title,
      page,
      snippet: content.substring(0, 150) + "...",
    }
  })
}

/**
 * Build RAG context from search results
 * Enhanced "I don't know" logic for better LLM grounding
 */
export function buildRAGContext(searchResults: SearchResult[]): string {
  if (searchResults.length === 0) {
    return "NONE: No relevant documents found. You MUST answer with 'I don't know.'"
  }

  const context = (searchResults as any[])
    .map((result, index) => {
      const title = result.documentTitle || result.title || "Document"
      const page = (result.metadata && result.metadata.page) || result.page
      const source = page ? `[${title}, Page ${page}]` : `[${title}]`
      return `Document ${index + 1} ${source}:\n${result.content}`
    })
    .join("\n\n")

  return context
}
