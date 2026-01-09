import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import connectDB from "@/lib/mongodb"
import { User } from "@/lib/models"
import { setAuthCookie, signToken } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    await connectDB()
    let { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }
    email = String(email).trim().toLowerCase()

    const user = await User.findOne({ email })
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const token = signToken({ sub: user._id.toString(), email: user.email, role: user.role })
    const res = NextResponse.json({ user: { id: user._id, email: user.email, name: user.name, role: user.role } })
    setAuthCookie(res, token)
    return res
  } catch (error) {
    console.error("[auth] login error:", error)
    return NextResponse.json({ error: "Failed to login" }, { status: 500 })
  }
}
