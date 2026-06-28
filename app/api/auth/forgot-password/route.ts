import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { checkRateLimit } from '@/lib/rateLimit'
import { validate } from '@/lib/validate'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  const rateCheck = checkRateLimit(request, 'forgot-password')
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
    )
  }

  try {
    const { email } = await request.json()

    if (!email || !validate.email(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    await connectDB()

    const user = await User.findOne({ email: email.toLowerCase().trim() })

    // Always return the same response to prevent email enumeration
    const genericResponse = NextResponse.json({
      success: true,
      message: 'If that email is registered, a password reset link has been sent.',
    })

    if (!user) return genericResponse

    // Generate a random token; store only its hash so a DB leak can't be used to reset passwords.
    const token = crypto.randomBytes(32).toString('hex')
    user.resetToken = crypto.createHash('sha256').update(token).digest('hex')
    user.resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    await user.save()

    // Prefer the configured public URL; fall back to the request origin so reset
    // links are never hardcoded to localhost in a deployed environment.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const resetUrl = `${appUrl}/auth/reset-password?token=${token}`

    // Sends via Resend when RESEND_API_KEY is set; otherwise logs to the dev console
    // only (never in production). The token itself is stored hashed.
    await sendPasswordResetEmail(user.email, resetUrl)

    return genericResponse
  } catch (err) {
    console.error('Forgot password error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
