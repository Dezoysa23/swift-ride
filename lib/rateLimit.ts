// Simple in-memory rate limiting
// For production, use Redis instead
const attempts: Record<string, { count: number; resetTime: number }> = {}
const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_ATTEMPTS = 5

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const clientIp = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'
  return clientIp
}

export function checkRateLimit(request: Request, key: string = 'auth'): { allowed: boolean; retryAfter?: number } {
  const clientIp = getClientIp(request)
  const rateLimitKey = `${key}:${clientIp}`
  const now = Date.now()

  if (!attempts[rateLimitKey]) {
    attempts[rateLimitKey] = { count: 1, resetTime: now + WINDOW_MS }
    return { allowed: true }
  }

  const entry = attempts[rateLimitKey]

  // Reset if window expired
  if (now > entry.resetTime) {
    entry.count = 1
    entry.resetTime = now + WINDOW_MS
    return { allowed: true }
  }

  // Check if exceeded
  entry.count++
  if (entry.count > MAX_ATTEMPTS) {
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
