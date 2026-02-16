import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {}

  // Check database
  const dbStart = Date.now()
  try {
    await db.$queryRaw`SELECT 1`
    checks.database = { status: "ok", latencyMs: Date.now() - dbStart }
  } catch (error) {
    checks.database = {
      status: "error",
      latencyMs: Date.now() - dbStart,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }

  // Check Redis
  const redisStart = Date.now()
  try {
    const { getConnection } = await import("@/lib/queue")
    const redis = getConnection()
    await redis.ping()
    checks.redis = { status: "ok", latencyMs: Date.now() - redisStart }
  } catch (error) {
    checks.redis = {
      status: "error",
      latencyMs: Date.now() - redisStart,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }

  const allHealthy = Object.values(checks).every((c) => c.status === "ok")

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  )
}
