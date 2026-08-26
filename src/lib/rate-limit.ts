import { NextResponse } from "next/server"

/**
 * Lightweight in-memory sliding-window rate limiter.
 *
 * The app runs on a single web dyno, so a process-local limiter is sufficient
 * to stop scripted abuse of the expensive AI / TTS / signup endpoints. If the
 * app ever scales to multiple instances, swap the store for Redis (Upstash)
 * behind the same `checkRateLimit` signature.
 */

interface Bucket {
  timestamps: number[]
}

const MAX_KEYS = 10_000
const buckets = new Map<string, Bucket>()

function prune(now: number, windowMs: number) {
  if (buckets.size < MAX_KEYS) return
  for (const [key, bucket] of buckets) {
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs)
    if (bucket.timestamps.length === 0) buckets.delete(key)
  }
}

export interface RateLimitOptions {
  /** Max requests allowed within the window */
  limit: number
  /** Window length in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  ok: boolean
  remaining: number
  retryAfterSec: number
}

export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  prune(now, opts.windowMs)

  let bucket = buckets.get(key)
  if (!bucket) {
    bucket = { timestamps: [] }
    buckets.set(key, bucket)
  }
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < opts.windowMs)

  if (bucket.timestamps.length >= opts.limit) {
    const oldest = bucket.timestamps[0]
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((oldest + opts.windowMs - now) / 1000))
    }
  }

  bucket.timestamps.push(now)
  return { ok: true, remaining: opts.limit - bucket.timestamps.length, retryAfterSec: 0 }
}

/** Preset limits by endpoint class. */
export const RATE_LIMITS = {
  /** Heavy generation (note parsing, lesson pages, stories, context merge) */
  AI_HEAVY: { limit: 10, windowMs: 60 * 60 * 1000 },
  /** Light AI calls (autofill, decompose, sentences, grading, test questions) */
  AI_LIGHT: { limit: 60, windowMs: 10 * 60 * 1000 },
  /** Azure TTS — audio is browser-cached so unique-text rate is what matters */
  TTS: { limit: 120, windowMs: 10 * 60 * 1000 },
  /** Account creation, keyed by IP */
  SIGNUP: { limit: 5, windowMs: 60 * 60 * 1000 }
} as const satisfies Record<string, RateLimitOptions>

/**
 * Convenience for route handlers: returns a 429 response when the caller has
 * exceeded the limit, otherwise null.
 *
 *   const limited = rateLimited(`ai:${userId}`, RATE_LIMITS.AI_HEAVY)
 *   if (limited) return limited
 */
export function rateLimited(key: string, opts: RateLimitOptions): NextResponse | null {
  const result = checkRateLimit(key, opts)
  if (result.ok) return null
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } }
  )
}

/** Best-effort client IP for unauthenticated endpoints. */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return req.headers.get("x-real-ip") || "unknown"
}
