import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Message } from "@/lib/models"
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

    // Build nodes from citation counts per document title
    const nodeAgg = await Message.aggregate([
      { $match: { role: "assistant" } },
      { $unwind: "$citations" },
      { $group: { _id: "$citations.title", count: { $sum: 1 } } },
      { $project: { id: "$_id", count: 1, _id: 0 } },
      { $sort: { count: -1 } },
      { $limit: 100 },
    ])

    // Build co-citation links: for each assistant message, for the set of cited titles, add 1 to every pair
    const coCitations = await Message.aggregate([
      { $match: { role: "assistant" } },
      { $project: { titles: { $map: { input: "$citations", as: "c", in: "$$c.title" } } } },
      { $project: { titles: { $setUnion: ["$titles", []] } } },
      { $match: { $expr: { $gte: [{ $size: "$titles" }, 2] } } },
      // unwind pairs via self-join pattern
      { $unwind: "$titles" },
      { $group: { _id: "$_id", titles: { $addToSet: "$titles" } } },
      { $project: { pairs: { $function: { body: function (arr) {
            const out = []
            for (let i = 0; i < arr.length; i++) {
              for (let j = i + 1; j < arr.length; j++) {
                const a = String(arr[i])
                const b = String(arr[j])
                if (a && b && a !== b) out.push([a, b])
              }
            }
            return out
          }, args: ["$titles"], lang: "js" } } } },
      { $unwind: "$pairs" },
      { $group: { _id: { a: { $arrayElemAt: ["$pairs", 0] }, b: { $arrayElemAt: ["$pairs", 1] } }, weight: { $sum: 1 } } },
      { $project: { source: "$_id.a", target: "$_id.b", weight: 1, _id: 0 } },
      { $sort: { weight: -1 } },
      { $limit: 200 },
    ])

    return NextResponse.json({ success: true, nodes: nodeAgg, links: coCitations })
  } catch (error) {
    console.error("[v0] Knowledge graph error:", error)
    return NextResponse.json({ success: false, error: "Failed to compute knowledge graph" }, { status: 500 })
  }
}
