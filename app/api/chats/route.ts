import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Chat } from "@/lib/models"
import { verifyToken } from "@/lib/auth"

export const runtime = "nodejs"

function readCookie(name: string, cookieHeader: string | null) {
  if (!cookieHeader) return null
  const parts = cookieHeader.split(/;\s*/)
  for (const part of parts) {
    const [k, ...rest] = part.split("=")
    if (decodeURIComponent(k) === name) return decodeURIComponent(rest.join("="))
  }
  return null
}

// List chats for the authenticated user
export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie")
    const token = readCookie("auth_token", cookieHeader)
    const payload = token ? verifyToken<{ sub: string }>(token) : null
    if (!payload?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const chats = await Chat.find({ userId: payload.sub }).sort({ updatedAt: -1 }).limit(50)
    return NextResponse.json({ chats })
  } catch (error) {
    console.error("[v0] Fetch chats error:", error)
    return NextResponse.json({ error: "Failed to fetch chats" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie")
    const token = readCookie("auth_token", cookieHeader)
    const payload = token ? verifyToken<{ sub: string }>(token) : null
    if (!payload?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const chat = await Chat.create({ userId: payload.sub, title: "New Chat" })
    return NextResponse.json({ id: chat._id.toString(), title: chat.title }, { status: 201 })
  } catch (error) {
    console.error("[v0] Create chat error:", error)
    return NextResponse.json({ error: "Failed to create chat" }, { status: 500 })
  }
}
