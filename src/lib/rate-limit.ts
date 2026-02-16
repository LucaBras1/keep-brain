import IORedis from "ioredis"

let redis: IORedis | null = null

function getRedis(): IORedis | null {
  if (redis) return redis
  const url = process.env.REDIS_URL
  if (!url) return null
  try {
    redis = new IORedis(url, { maxRetriesPerRequest: null, lazyConnect: true })
    redis.connect().catch(() => {
      redis = null
    })
    return redis
  } catch {
    return null
  }
}

// Fallback in-memory store for when Redis is unavailable
const memStore = new Map<string, { count: number; resetAt: number }>()

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of memStore) {
      if (entry.resetAt < now) {
        memStore.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

export async function rateLimitAsync(
  key: string,
  options: { windowMs: number; maxRequests: number }
): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  const r = getRedis()
  if (r) {
    try {
      return await redisRateLimit(r, key, options)
    } catch {
      // Fallback to in-memory on Redis error
    }
  }
  return rateLimitMemory(key, options)
}

async function redisRateLimit(
  r: IORedis,
  key: string,
  options: { windowMs: number; maxRequests: number }
): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  const redisKey = `ratelimit:${key}`
  const windowSec = Math.ceil(options.windowMs / 1000)

  const count = await r.incr(redisKey)
  if (count === 1) {
    await r.expire(redisKey, windowSec)
  }

  const ttl = await r.ttl(redisKey)
  const resetAt = Date.now() + ttl * 1000

  if (count > options.maxRequests) {
    return { success: false, remaining: 0, resetAt }
  }

  return {
    success: true,
    remaining: options.maxRequests - count,
    resetAt,
  }
}

function rateLimitMemory(
  key: string,
  options: { windowMs: number; maxRequests: number }
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = memStore.get(key)

  if (!entry || entry.resetAt < now) {
    const resetAt = now + options.windowMs
    memStore.set(key, { count: 1, resetAt })
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

// Synchronous in-memory only (for backwards compat where needed)
export function rateLimit(
  key: string,
  options: { windowMs: number; maxRequests: number }
): { success: boolean; remaining: number; resetAt: number } {
  return rateLimitMemory(key, options)
}
