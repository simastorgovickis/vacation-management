/**
 * Rate limiting utility
 * 
 * Note: This is a simple in-memory rate limiter suitable for single-instance deployments.
 * For production with multiple instances, use Redis-based rate limiting (e.g., Upstash Redis, Vercel KV)
 */

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
}

interface RequestRecord {
  count: number
  resetTime: number
}

// In-memory store (use Redis in production)
const requestStore = new Map<string, RequestRecord>()

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of requestStore.entries()) {
    if (record.resetTime < now) {
      requestStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

export function createRateLimiter(config: RateLimitConfig) {
  return (identifier: string): { allowed: boolean; remaining: number; resetAt: number } => {
    const now = Date.now()
    const key = identifier
    const record = requestStore.get(key)

    if (!record || record.resetTime < now) {
      // Create new window
      const newRecord: RequestRecord = {
        count: 1,
        resetTime: now + config.windowMs,
      }
      requestStore.set(key, newRecord)
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: newRecord.resetTime,
      }
    }

    if (record.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: record.resetTime,
      }
    }

    // Increment count
    record.count++
    requestStore.set(key, record)
    return {
      allowed: true,
      remaining: config.maxRequests - record.count,
      resetAt: record.resetTime,
    }
  }
}

// Pre-configured rate limiters
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
})

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
})

export const passwordResetRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 attempts per hour
})
