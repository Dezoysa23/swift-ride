import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { signToken, setAuthCookie } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rateLimit'
import { auditLog } from '@/lib/auditLog'
import { validate } from '@/lib/validate'
import { hashCode, MAX_VERIFICATION_ATTEMPTS } from '@/lib/email'

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(request, 'verify-email', { max: 10, windowMs: 10 * 60 * 1000 })
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } }
    )
  }

  try {
    const { email, code } = await request.json()

    if (!email || !validate.email(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }
    if (!code || !/^\d{6}$/.test(String(code))) {
      return NextResponse.json({ error: 'Enter the 6-digit code from your email' }, { status: 400 })
    }

    await connectDB()

    const user = await User.findOne({ email: email.toLowerCase().trim() })
    // Generic error avoids revealing whether the email exists.
    const invalid = NextResponse.json(
      { error: 'Invalid or expired code' },
      { status: 400 }
    )
    if (!user) return invalid

    // Already verified (or legacy account) — nothing to do.
    if (user.emailVerified !== false) {
      return NextResponse.json({ success: true, alreadyVerified: true })
    }

    if (!user.verificationCode || !user.verificationCodeExpiry || user.verificationCodeExpiry < new Date()) {
      return NextResponse.json(
        { error: 'Code expired. Please request a new one.' },
        { status: 400 }
      )
    }

    if ((user.verificationAttempts ?? 0) >= MAX_VERIFICATION_ATTEMPTS) {
      return NextResponse.json(
        { error: 'Too many attempts. Please request a new code.' },
        { status: 429 }
      )
    }

    if (hashCode(String(code)) !== user.verificationCode) {
      user.verificationAttempts = (user.verificationAttempts ?? 0) + 1
      await user.save()
      return invalid
    }

    // Success — mark verified, clear the code, and log the user in.
    user.emailVerified = true
    user.emailVerifiedAt = new Date()
    user.verificationCode = undefined
    user.verificationCodeExpiry = undefined
    user.verificationAttempts = 0
    await user.save()

    const token = await signToken({ id: user._id.toString(), role: user.role, email: user.email, name: user.name })
    await setAuthCookie(token)

    auditLog(user._id.toString(), user.role, 'email_verified', 'user', 'success', user._id.toString(), undefined, request)

    return NextResponse.json({ success: true, user: user.toJSON() })
  } catch (err) {
    console.error('Verify email error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
