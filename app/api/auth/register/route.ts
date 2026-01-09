import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import connectDB from "@/lib/mongodb"
import { User } from "@/lib/models"
import { setAuthCookie, signToken } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    await connectDB()
    let { email, password, name } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }
    email = String(email).trim().toLowerCase()
    name = name ? String(name).trim() : undefined

    const existing = await User.findOne({ email })
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await User.create({ email, passwordHash, name })

    const token = signToken({ sub: user._id.toString(), email: user.email, role: user.role })
    const res = NextResponse.json({ user: { id: user._id, email: user.email, name: user.name, role: user.role } }, { status: 201 })
    setAuthCookie(res, token)
    return res
  } catch (error) {
    console.error("[auth] register error:", error)
    return NextResponse.json({ error: "Failed to register" }, { status: 500 })
  }
}
