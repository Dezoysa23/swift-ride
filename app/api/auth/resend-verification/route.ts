import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { checkRateLimit } from '@/lib/rateLimit'
import { validate } from '@/lib/validate'
import {
  generateVerificationCode,
  hashCode,
  sendVerificationEmail,
  VERIFICATION_CODE_TTL_MS,
} from '@/lib/email'

export async function POST(request: NextRequest) {
  // Tight limit to prevent verification-code spam.
  const rate = checkRateLimit(request, 'resend-verification', { max: 3, windowMs: 10 * 60 * 1000 })
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before requesting another code.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } }
    )
  }

  try {
    const { email } = await request.json()
    if (!email || !validate.email(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    await connectDB()

    const user = await User.findOne({ email: email.toLowerCase().trim() })

    // Always return the same response to avoid email enumeration.
    const generic = NextResponse.json({
      success: true,
      message: 'If that account needs verification, a new code has been sent.',
    })

    if (!user || user.emailVerified !== false) return generic

    // Persisted per-account cooldown — survives process restarts and works across
    // serverless instances, unlike the in-memory IP limiter above.
    const RESEND_COOLDOWN_MS = 60 * 1000
    if (
      user.lastVerificationEmailSentAt &&
      Date.now() - user.lastVerificationEmailSentAt.getTime() < RESEND_COOLDOWN_MS
    ) {
      return generic
    }

    const code = generateVerificationCode()
    user.verificationCode = hashCode(code)
    user.verificationCodeExpiry = new Date(Date.now() + VERIFICATION_CODE_TTL_MS)
    user.verificationAttempts = 0
    user.lastVerificationEmailSentAt = new Date()
    await user.save()

    await sendVerificationEmail(user.email, code)

    return generic
  } catch (err) {
    console.error('Resend verification error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
