interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (entry.resetAt < now) {
        store.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

export function rateLimit(
  key: string,
  options: { windowMs: number; maxRequests: number }
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    const resetAt = now + options.windowMs
    store.set(key, { count: 1, resetAt })
    return { success: true, remaining: options.maxRequests - 1, resetAt }
  }

  entry.count++

  if (entry.count > options.maxRequests) {
    return { success: false, remaining: 0, resetAt: entry.resetAt }
  }

  return {
    success: true,
    remaining: options.maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}
