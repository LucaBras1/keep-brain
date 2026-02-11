"use client"

import { useState, useEffect } from "react"
import { Sparkles, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { SSE_EVENTS } from "@/lib/constants"
import type { ServerEvent } from "@/lib/events"

interface AiStatus {
  state: "idle" | "processing" | "done"
  count: number
  lastIdeaId?: string
  lastIdeaTitle?: string
}

export function AiStatusIndicator() {
  const [status, setStatus] = useState<AiStatus>({
    state: "idle",
    count: 0,
  })

  useEffect(() => {
    if (status.state === "done") {
      const timeout = setTimeout(
        () => setStatus({ state: "idle", count: 0 }),
        5000
      )
      return () => clearTimeout(timeout)
    }
  }, [status.state])

  // This component listens to events via the parent's SSE connection
  // The layout passes events through a callback
  useEffect(() => {
    const handler = (e: CustomEvent<ServerEvent>) => {
      const event = e.detail
      switch (event.type) {
        case SSE_EVENTS.AI_PROCESSING_START:
          setStatus((prev) => ({
            state: "processing",
            count: prev.count + 1,
          }))
          break
        case SSE_EVENTS.AI_PROCESSING_COMPLETE:
          setStatus((prev) => ({
            state: prev.count <= 1 ? "done" : "processing",
            count: Math.max(0, prev.count - 1),
            lastIdeaId: event.data.ideaId as string | undefined,
          }))
          break
        case SSE_EVENTS.AI_PROCESSING_ERROR:
          setStatus((prev) => ({
            ...prev,
            state: prev.count <= 1 ? "idle" : "processing",
            count: Math.max(0, prev.count - 1),
          }))
          break
      }
    }

    window.addEventListener("keepbrain:sse", handler as EventListener)
    return () =>
      window.removeEventListener("keepbrain:sse", handler as EventListener)
  }, [])

  if (status.state === "idle") return null

  if (status.state === "processing") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-purple-500">
        <Sparkles className="h-3.5 w-3.5 animate-pulse" />
        <span className="hidden sm:inline">
          AI zpracovava{status.count > 1 ? ` ${status.count}` : ""}...
        </span>
      </div>
    )
  }

  if (status.state === "done") {
    const content = (
      <div className="flex items-center gap-1.5 text-xs text-green-500 animate-in fade-in duration-300">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Novy napad!</span>
      </div>
    )

    if (status.lastIdeaId) {
      return (
        <Link href={`/ideas/${status.lastIdeaId}`} className="hover:opacity-80">
          {content}
        </Link>
      )
    }

    return content
  }

  return null
}
