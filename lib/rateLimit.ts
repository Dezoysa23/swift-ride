// Simple in-memory rate limiting.
// NOTE: in-memory state is per-process. On serverless/multi-instance hosting
// (e.g. Vercel) this provides only best-effort protection — for hard guarantees
// move to a shared store such as Upstash Redis. See DEPLOYMENT.md.
const attempts: Record<string, { count: number; resetTime: number }> = {}
const DEFAULT_WINDOW_MS = 60 * 1000 // 1 minute
const DEFAULT_MAX_ATTEMPTS = 5

interface RateLimitOptions {
  /** Max requests allowed per window (default 5). */
  max?: number
  /** Window length in milliseconds (default 60000). */
  windowMs?: number
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const clientIp = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'
  return clientIp
}

export function checkRateLimit(
  request: Request,
  key: string = 'auth',
  options: RateLimitOptions = {}
): { allowed: boolean; retryAfter?: number } {
  const max = options.max ?? DEFAULT_MAX_ATTEMPTS
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS
  const clientIp = getClientIp(request)
  const rateLimitKey = `${key}:${clientIp}`
  const now = Date.now()

  if (!attempts[rateLimitKey]) {
    attempts[rateLimitKey] = { count: 1, resetTime: now + windowMs }
    return { allowed: true }
  }

  const entry = attempts[rateLimitKey]

  // Reset if window expired
  if (now > entry.resetTime) {
    entry.count = 1
    entry.resetTime = now + windowMs
    return { allowed: true }
  }

  // Check if exceeded
  entry.count++
  if (entry.count > max) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    return { allowed: false, retryAfter }
  }

  return { allowed: true }
}

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const key in attempts) {
    if (now > attempts[key].resetTime + 60000) {
      delete attempts[key]
    }
  }
}, 10 * 60 * 1000)
