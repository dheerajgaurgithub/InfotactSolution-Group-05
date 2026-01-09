import mongoose, { Schema, type Model, type Document as MongooseDocument, type Types } from "mongoose"

export interface IChat extends MongooseDocument {
  userId: Types.ObjectId
  title: string
  createdAt: Date
  updatedAt: Date
}

const ChatSchema = new Schema<IChat>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      default: "New Chat",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for performance
ChatSchema.index({ userId: 1, createdAt: -1 })

const Chat: Model<IChat> = mongoose.models.Chat || mongoose.model<IChat>("Chat", ChatSchema)

export default Chat
