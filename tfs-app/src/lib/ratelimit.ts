import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let redis: Redis | null = null

function getRedis() {
  const url   = process.env.UPSTASH_REDIS_REST_URL   ?? ''
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? ''
  // Skip if not configured or still a placeholder (contains '...')
  if (!url || !token || url.includes('...') || token.includes('...')) return null
  if (!redis) {
    redis = new Redis({ url, token })
  }
  return redis
}

/** Returns a rate limiter, or null if Redis is not configured (dev mode). */
function createLimiter(requests: number, window: string) {
  const r = getRedis()
  if (!r) return null
  return new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(requests, window as any) })
}

export const contactLimiter = createLimiter(5, '1 h')
export const authLimiter = createLimiter(10, '1 h')
export const bookingLimiter = createLimiter(20, '1 h')
export const codeLimiter = createLimiter(10, '1 h')

/** Check rate limit for an IP. Returns true if request is allowed. */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  ip: string
): Promise<{ allowed: boolean; reset?: number }> {
  if (!limiter) return { allowed: true }
  const { success, reset } = await limiter.limit(ip)
  return { allowed: success, reset }
}
