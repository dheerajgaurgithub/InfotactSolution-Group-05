import jwt from "jsonwebtoken"
import type { NextResponse } from "next/server"

export const AUTH_COOKIE = "auth_token"
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7

function getSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error("JWT_SECRET is not set")
  return secret
}

export function signToken(payload: object) {
  return jwt.sign(payload, getSecret(), { expiresIn: MAX_AGE_SECONDS })
}

export function verifyToken<T = any>(token: string): T | null {
  try {
    return jwt.verify(token, getSecret()) as T
  } catch {
    return null
  }
}

export function setAuthCookie(res: NextResponse, token: string) {
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  })
}

export function clearAuthCookie(res: NextResponse) {
  res.cookies.set(AUTH_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 })
}
