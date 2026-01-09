import mongoose, { Schema, type Model, type Document as MongooseDocument } from "mongoose"

export interface IDocument extends MongooseDocument {
  title: string
  filePath: string
  fileType?: string
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

const DocumentSchema = new Schema<IDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
)

// Index for faster lookups
DocumentSchema.index({ title: 1 })
DocumentSchema.index({ createdAt: -1 })

const Document: Model<IDocument> = mongoose.models.Document || mongoose.model<IDocument>("Document", DocumentSchema)

export default Document
