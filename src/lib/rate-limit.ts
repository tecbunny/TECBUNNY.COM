// Unified rate limiter with overloads: async (detailed) and sync (boolean)
// Async detailed (for endpoints that can await):
//   await rateLimit(key, limit, windowMs) -> { allowed, remaining, reset }
// Sync fixed-window (fast boolean):
//   rateLimit(key, bucketName, { limit, windowMs }) -> boolean

import { getRedis } from './redis'

export type Result = { allowed: boolean; remaining?: number; reset?: number }

type Bucket = { count: number; first: number }

export interface RateLimitOptions {
  limit: number
  windowMs: number
}

// In-memory state
const stores: Record<string, Map<string, Bucket>> = {}
const memoryBuckets = new Map<string, number[]>()

// Overloads
export function rateLimit(key: string, bucketName: string, opts: RateLimitOptions): boolean
export function rateLimit(key: string, limit: number, windowMs: number): Promise<Result>
export function rateLimit(
  key: string,
  a: string | number,
  b: RateLimitOptions | number
): boolean | Promise<Result> {
  // Sync boolean variant: (key, bucketName, opts)
  if (typeof a === 'string' && typeof b === 'object' && b !== null) {
    const bucketName = a
    const opts = b as RateLimitOptions
    if (!stores[bucketName]) stores[bucketName] = new Map()
    const store = stores[bucketName]
    const now = Date.now()
    const rec = store.get(key)
    if (!rec) {
      store.set(key, { count: 1, first: now })
      return true
    }
    if (now - rec.first > opts.windowMs) {
      store.set(key, { count: 1, first: now })
      return true
    }
    if (rec.count >= opts.limit) return false
    rec.count += 1
    return true
  }

  // Async detailed variant: (key, limit, windowMs)
  if (typeof a === 'number' && typeof b === 'number') {
    const limit = a
    const windowMs = b
    const now = Date.now()
    const windowStart = now - windowMs

    const redis = getRedis()
    if (redis) {
      return (async () => {
        try {
          const windowKey = `rl:cnt:${key}`
          const count = await redis.incr(windowKey)
          if (count === 1) await redis.pexpire(windowKey, windowMs)
          const remaining = Math.max(0, limit - count)
          return { allowed: count <= limit, remaining, reset: now + windowMs }
        } catch {
          // fall back to memory
          const arr = memoryBuckets.get(key) || []
          const kept = arr.filter(ts => ts > windowStart)
          kept.push(now)
          memoryBuckets.set(key, kept)
          const remaining = Math.max(0, limit - kept.length)
          return { allowed: kept.length <= limit, remaining, reset: now + windowMs }
        }
      })()
    }

    // memory fallback
    const arr = memoryBuckets.get(key) || []
    const kept = arr.filter(ts => ts > windowStart)
    kept.push(now)
    memoryBuckets.set(key, kept)
    const remaining = Math.max(0, limit - kept.length)
    return Promise.resolve({ allowed: kept.length <= limit, remaining, reset: now + windowMs })
  }

  throw new Error('Invalid rateLimit arguments')
}

// Optional helpers for sync variant state
export function remaining(key: string, bucketName: string, opts: RateLimitOptions): number | undefined {
  const store = stores[bucketName]
  if (!store) return undefined
  const rec = store.get(key)
  if (!rec) return opts.limit
  if (Date.now() - rec.first > opts.windowMs) return opts.limit
  return Math.max(0, opts.limit - rec.count)
}

export function bucketResetMs(key: string, bucketName: string): number | undefined {
  const store = stores[bucketName]
  if (!store) return undefined
  const rec = store.get(key)
  if (!rec) return undefined
  const now = Date.now()
  const ttl = rec.first + 60_000 - now // default 1m fallback
  return ttl > 0 ? ttl : 0
}
