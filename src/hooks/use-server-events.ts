"use client"

import { useEffect, useRef, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { SSE_EVENTS } from "@/lib/constants"
import type { ServerEvent } from "@/lib/events"

interface UseServerEventsOptions {
  enabled?: boolean
  onEvent?: (event: ServerEvent) => void
}

/**
 * Hook that connects to the SSE endpoint and automatically invalidates
 * relevant React Query caches when server events arrive.
 */
export function useServerEvents(options: UseServerEventsOptions = {}) {
  const { enabled = true, onEvent } = options
  const queryClient = useQueryClient()
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource("/api/events/stream")
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const data: ServerEvent = JSON.parse(event.data)

        // Call custom handler
        onEvent?.(data)

        // Auto-invalidate relevant queries based on event type
        switch (data.type) {
          case SSE_EVENTS.SYNC_STATUS:
          case SSE_EVENTS.SYNC_PROGRESS:
            queryClient.invalidateQueries({ queryKey: ["user"] })
            break

          case SSE_EVENTS.SYNC_COMPLETE:
            queryClient.invalidateQueries({ queryKey: ["user"] })
            queryClient.invalidateQueries({ queryKey: ["notes"] })
            queryClient.invalidateQueries({ queryKey: ["dashboard"] })
            break

          case SSE_EVENTS.SYNC_ERROR:
            queryClient.invalidateQueries({ queryKey: ["user"] })
            break

          case SSE_EVENTS.AI_PROCESSING_COMPLETE:
            queryClient.invalidateQueries({ queryKey: ["notes"] })
            queryClient.invalidateQueries({ queryKey: ["ideas"] })
            queryClient.invalidateQueries({ queryKey: ["dashboard"] })
            break

          case SSE_EVENTS.AI_PROCESSING_START:
          case SSE_EVENTS.AI_PROCESSING_ERROR:
            queryClient.invalidateQueries({ queryKey: ["notes"] })
            break

          case SSE_EVENTS.NOTE_CREATED:
            queryClient.invalidateQueries({ queryKey: ["notes"] })
            queryClient.invalidateQueries({ queryKey: ["dashboard"] })
            break

          case SSE_EVENTS.IDEA_CREATED:
            queryClient.invalidateQueries({ queryKey: ["ideas"] })
            queryClient.invalidateQueries({ queryKey: ["dashboard"] })
            break

          case "connected":
            // Initial connection established
            break
        }
      } catch {
        // Ignore parse errors (e.g. heartbeat comments)
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
      eventSourceRef.current = null

      // Reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        if (enabled) {
          connect()
        }
      }, 5000)
    }
  }, [enabled, onEvent, queryClient])

  useEffect(() => {
    if (!enabled) {
      return
    }

    connect()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [enabled, connect])
}
