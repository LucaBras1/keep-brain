import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hashPassword, createSession, setSessionCookie } from "@/lib/auth"
import { registerSchema, getZodErrorMessage } from "@/lib/validations"
import { rateLimitAsync } from "@/lib/rate-limit"

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const limiter = await rateLimitAsync(`register:${ip}`, { windowMs: 60 * 60 * 1000, maxRequests: 5 })
    if (!limiter.success) {
      return NextResponse.json(
        { error: "Prilis mnoho pokusu o registraci. Zkuste to pozdeji." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((limiter.resetAt - Date.now()) / 1000)) },
        }
      )
    }

    const body = await request.json()

    const result = registerSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(result.error) },
        { status: 400 }
      )
    }

    const { email, password, name } = result.data

    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Uzivatel s timto emailem jiz existuje" },
        { status: 400 }
      )
    }

    const passwordHash = await hashPassword(password)
    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        name,
      },
    })

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
      { error: "Chyba pri registraci" },
      { status: 500 }
    )
  }
}
