import { formatDistanceToNow } from "date-fns"
import { cs } from "date-fns/locale"

/**
 * Compact Czech date format for mobile screens.
 * Returns "pred 2h", "pred 15m", "pred 3d", or "2. 1." for older dates.
 */
export function formatDateMobile(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return "ted"
  if (diffMin < 60) return `${diffMin}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 30) return `${diffDays}d`

  return `${d.getDate()}. ${d.getMonth() + 1}.`
}

/**
 * Full Czech date format for desktop (wraps date-fns formatDistanceToNow).
 */
export function formatDateDesktop(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: cs })
}
