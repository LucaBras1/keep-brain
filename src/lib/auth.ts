import crypto from "crypto"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { db } from "./db"

const COOKIE_NAME = "keepbrain_session"

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

  const token = crypto.randomBytes(32).toString("hex")

  await db.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  })

  return token
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value
}

export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getCurrentUser() {
  const token = await getSessionCookie()
  if (!token) return null

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await db.session.delete({ where: { id: session.id } })
    }
    return null
  }

  // Probabilistic cleanup: ~1% chance per request
  if (Math.random() < 0.01) {
    cleanupExpiredSessions().catch(console.error)
  }

  return session.user
}

export async function logout(): Promise<void> {
  const token = await getSessionCookie()
  if (token) {
    await db.session.deleteMany({ where: { token } })
  }
  await deleteSessionCookie()
}

// Clean up expired sessions (call periodically)
export async function cleanupExpiredSessions(): Promise<void> {
  await db.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  })
}
