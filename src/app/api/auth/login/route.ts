import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  verifyPassword,
  createSession,
  setSessionCookie,
} from "@/lib/auth"
import { loginSchema, getZodErrorMessage } from "@/lib/validations"
import { rateLimit } from "@/lib/rate-limit"

export async function POST(request: Request) {
  try {
    // Rate limit by IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const limiter = rateLimit(`login:${ip}`, { windowMs: 15 * 60 * 1000, maxRequests: 10 })
    if (!limiter.success) {
      return NextResponse.json(
        { error: "Příliš mnoho pokusů o přihlášení. Zkuste to později." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((limiter.resetAt - Date.now()) / 1000)) },
        }
      )
    }

    const body = await request.json()

    // Validate input
    const result = loginSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(result.error) },
        { status: 400 }
      )
    }

    const { email, password } = result.data

    // Find user
    const user = await db.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Neplatné přihlašovací údaje" },
        { status: 401 }
      )
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: "Neplatné přihlašovací údaje" },
        { status: 401 }
      )
    }

    // Create session
    const token = await createSession(user.id)
    await setSessionCookie(token)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        theme: user.theme,
        keepEmail: user.keepEmail,
        syncEnabled: user.syncEnabled,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "Chyba při přihlášení" },
      { status: 500 }
    )
  }
}
