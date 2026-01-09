import mongoose, { Schema, type Model, type Document as MongooseDocument, type Types } from "mongoose"

export interface ICitation {
  title: string
  page?: number
  snippet?: string
}

export interface IMessage extends MongooseDocument {
  chatId: Types.ObjectId
  role: "user" | "assistant" | "system"
  content: string
  citations: ICitation[]
  createdAt: Date
}

const MessageSchema = new Schema<IMessage>(
  {
    chatId: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    citations: {
      type: [
        {
          title: { type: String, required: true },
          page: { type: Number },
          snippet: { type: String },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
)

// Indexes for performance
MessageSchema.index({ chatId: 1, createdAt: 1 })

const Message: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema)

export default Message
