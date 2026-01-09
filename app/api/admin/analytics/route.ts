import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Message, Document, DocumentChunk } from "@/lib/models"
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

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie")
    const token = readCookie("auth_token", cookieHeader)
    const payload = token ? verifyToken<{ role?: string }>(token) : null
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const now = new Date()
    const days = 14
    const start = new Date(now)
    start.setDate(now.getDate() - (days - 1))

    const topDocuments = await Message.aggregate([
      { $match: { role: "assistant" } },
      { $unwind: "$citations" },
      { $group: { _id: "$citations.title", count: { $sum: 1 } } },
      { $project: { title: "$_id", count: 1, _id: 0 } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ])

    const topPages = await Message.aggregate([
      { $match: { role: "assistant" } },
      { $unwind: "$citations" },
      { $match: { "citations.page": { $ne: null } } },
      { $group: { _id: { title: "$citations.title", page: "$citations.page" }, count: { $sum: 1 } } },
      { $project: { title: "$_id.title", page: "$_id.page", count: 1, _id: 0 } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ])

    const usageTrendRaw = await Message.aggregate([
      { $match: { role: "user", createdAt: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
          count: { $sum: 1 },
        },
      },
      { $project: { day: "$_id", count: 1, _id: 0 } },
      { $sort: { day: 1 } },
    ])

    const byDay: Record<string, number> = Object.fromEntries(usageTrendRaw.map((d: any) => [d.day, d.count]))
    const series: { day: string; count: number }[] = []
    for (let i = 0; i < days; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      series.push({ day: key, count: byDay[key] || 0 })
    }

    const totalQueries = await Message.countDocuments({ role: "user" })
    const totalAnswers = await Message.countDocuments({ role: "assistant" })
    const totalDocuments = await Document.countDocuments({})
    const totalChunks = await DocumentChunk.countDocuments({})
    const since24h = new Date()
    since24h.setHours(since24h.getHours() - 24)
    const queriesLast24h = await Message.countDocuments({ role: "user", createdAt: { $gte: since24h } })

    return NextResponse.json(
      {
        success: true,
        topDocuments,
        topPages,
        usageTrend: series,
        totals: { totalQueries, totalAnswers },
        inventory: { totalDocuments, totalChunks },
        queriesLast24h,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Admin analytics error:", error)
    return NextResponse.json({ success: false, error: "Failed to compute analytics" }, { status: 500 })
  }
}
