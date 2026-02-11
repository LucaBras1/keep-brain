import IORedis from "ioredis"
import { REDIS_CHANNELS, SSE_EVENTS } from "./constants"

// Lazy-load Redis publisher connection
let publisher: IORedis | null = null

function getPublisher(): IORedis {
  if (!publisher) {
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) {
      throw new Error("REDIS_URL environment variable is not set")
    }
    publisher = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
    })
  }
  return publisher
}

export interface ServerEvent {
  type: string
  userId: string
  data: Record<string, unknown>
  timestamp: number
}

/**
 * Publish an event to a user's SSE channel via Redis Pub/Sub
 */
export async function publishEvent(
  userId: string,
  type: string,
  data: Record<string, unknown> = {}
): Promise<void> {
  const event: ServerEvent = {
    type,
    userId,
    data,
    timestamp: Date.now(),
  }

  try {
    const redis = getPublisher()
    await redis.publish(
      REDIS_CHANNELS.userEvents(userId),
      JSON.stringify(event)
    )
  } catch (error) {
    console.error("Failed to publish event:", error)
  }
}

// Convenience methods for common events
export const events = {
  syncStatus(userId: string, status: string, details?: Record<string, unknown>) {
    return publishEvent(userId, SSE_EVENTS.SYNC_STATUS, { status, ...details })
  },

  syncProgress(userId: string, current: number, total: number) {
    return publishEvent(userId, SSE_EVENTS.SYNC_PROGRESS, { current, total })
  },

  syncComplete(userId: string, stats: { notesFound: number; notesCreated: number; notesUpdated: number }) {
    return publishEvent(userId, SSE_EVENTS.SYNC_COMPLETE, stats)
  },

  syncError(userId: string, error: string) {
    return publishEvent(userId, SSE_EVENTS.SYNC_ERROR, { error })
  },

  aiProcessingStart(userId: string, noteId: string) {
    return publishEvent(userId, SSE_EVENTS.AI_PROCESSING_START, { noteId })
  },

  aiProcessingComplete(userId: string, noteId: string, ideaId?: string) {
    return publishEvent(userId, SSE_EVENTS.AI_PROCESSING_COMPLETE, { noteId, ideaId })
  },

  aiProcessingError(userId: string, noteId: string, error: string) {
    return publishEvent(userId, SSE_EVENTS.AI_PROCESSING_ERROR, { noteId, error })
  },

  noteCreated(userId: string, noteId: string) {
    return publishEvent(userId, SSE_EVENTS.NOTE_CREATED, { noteId })
  },

  ideaCreated(userId: string, ideaId: string, noteId?: string) {
    return publishEvent(userId, SSE_EVENTS.IDEA_CREATED, { ideaId, noteId })
  },
}
