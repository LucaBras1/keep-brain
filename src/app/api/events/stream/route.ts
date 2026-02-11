import { NextRequest } from "next/server"
import IORedis from "ioredis"
import { getCurrentUser } from "@/lib/auth"
import { REDIS_CHANNELS } from "@/lib/constants"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    return new Response("Redis not configured", { status: 503 })
  }

  const encoder = new TextEncoder()
  const channel = REDIS_CHANNELS.userEvents(user.id)

  const stream = new ReadableStream({
    start(controller) {
      // Create a dedicated subscriber connection
      const subscriber = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
      })

      // Send initial connection event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", userId: user.id })}\n\n`)
      )

      // Send heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {
          // Stream closed
          clearInterval(heartbeat)
        }
      }, 30000)

      // Subscribe to user's event channel
      subscriber.subscribe(channel).catch((err) => {
        console.error("SSE subscribe error:", err)
      })

      subscriber.on("message", (_ch: string, message: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${message}\n\n`))
        } catch {
          // Stream closed
        }
      })

      // Cleanup on abort
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat)
        subscriber.unsubscribe(channel).catch(() => {})
        subscriber.disconnect()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
