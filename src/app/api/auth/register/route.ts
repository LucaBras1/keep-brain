import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hashPassword, createSession, setSessionCookie } from "@/lib/auth"
import { registerSchema, getZodErrorMessage } from "@/lib/validations"
import { rateLimit } from "@/lib/rate-limit"

export async function POST(request: Request) {
  try {
    // Rate limit by IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const limiter = rateLimit(`register:${ip}`, { windowMs: 15 * 60 * 1000, maxRequests: 10 })
    if (!limiter.success) {
      return NextResponse.json(
        { error: "Příliš mnoho pokusů o registraci. Zkuste to později." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((limiter.resetAt - Date.now()) / 1000)) },
        }
      )
    }

    const body = await request.json()

    // Validate input
    const result = registerSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(result.error) },
        { status: 400 }
      )
    }

    const { email, password, name } = result.data

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Uživatel s tímto emailem již existuje" },
        { status: 400 }
      )
    }

    // Create user
    const passwordHash = await hashPassword(password)
    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        name,
      },
    })

    // Create session
    const token = await createSession(user.id)
    await setSessionCookie(token)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Chyba při registraci" },
      { status: 500 }
    )
  }
}
