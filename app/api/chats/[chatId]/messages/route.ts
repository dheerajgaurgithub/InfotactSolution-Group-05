import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Message } from "@/lib/models"

// Get all messages for a specific chat
export async function GET(req: Request, { params }: { params: Promise<{ chatId: string }> }) {
  try {
    await connectDB()

    const { chatId } = await params

    const messages = await Message.find({ chatId }).sort({ createdAt: 1 })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("[v0] Failed to fetch messages:", error)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}
