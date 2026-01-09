import mongoose, { Schema, type Model, type Document as MongooseDocument, type Types } from "mongoose"

export interface IDocumentChunk extends MongooseDocument {
  documentId: Types.ObjectId
  content: string
  embedding: number[] // Vector embedding (1536 dimensions for OpenAI)
  metadata: Record<string, any>
  createdAt: Date
}

const DocumentChunkSchema = new Schema<IDocumentChunk>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
)

// Indexes for performance
DocumentChunkSchema.index({ documentId: 1 })
// Note: For vector search with MongoDB Atlas, you'll need to create a vector search index
// via the MongoDB Atlas UI or mongosh CLI with the following config:
// {
//   "fields": [{
//     "type": "vector",
//     "path": "embedding",
//     "numDimensions": 1536,
//     "similarity": "cosine"
//   }]
// }

const DocumentChunk: Model<IDocumentChunk> =
  mongoose.models.DocumentChunk || mongoose.model<IDocumentChunk>("DocumentChunk", DocumentChunkSchema)

export default DocumentChunk
