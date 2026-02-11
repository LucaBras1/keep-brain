import type { Idea } from "./api"

const STALE_DAYS = 14

export function needsAttention(idea: Idea): boolean {
  if (idea.potential === "HIGH" && idea.status === "NEW") return true
  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(idea.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysSinceUpdate >= STALE_DAYS && idea.status !== "ARCHIVED" && idea.status !== "IMPLEMENTED") return true
  return false
}

export function getAttentionReason(idea: Idea): string | null {
  if (idea.potential === "HIGH" && idea.status === "NEW") {
    return "Vysoky potencial - ceka na zpracovani"
  }
  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(idea.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysSinceUpdate >= STALE_DAYS && idea.status !== "ARCHIVED" && idea.status !== "IMPLEMENTED") {
    return `Neaktualizovano ${daysSinceUpdate} dni`
  }
  return null
}
