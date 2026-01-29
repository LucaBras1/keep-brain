import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@/generated/prisma"

declare global {
  var prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL

  // Build-time guard - vrátí proxy místo throw
  // Toto je KRITICKÉ pro Next.js build, protože DATABASE_URL není dostupné při buildu
  if (!connectionString) {
    console.warn(
      "[Prisma] DATABASE_URL not set - database operations will fail at runtime"
    )
    return new Proxy({} as PrismaClient, {
      get: (target, prop) => {
        if (prop === "then" || prop === "catch" || typeof prop === "symbol") {
          return undefined
        }
        // Return a function that throws when called
        return () => {
          throw new Error("DATABASE_URL environment variable is not set")
        }
      },
    })
  }

  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  })
}

// Singleton pattern pro development (HMR)
export const db = globalThis.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = db
}

export { db as prisma }
