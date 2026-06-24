import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { checkRateLimit } from '@/lib/rateLimit'
import { validate } from '@/lib/validate'

// TODO: Replace console.log with SMTP email (Option A) in a future update.
// Add SMTP_HOST, SMTP_USER, SMTP_PASS to .env.local and use nodemailer.

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
      message: 'If that email is registered, a reset link has been logged to the server console.',
    })

    if (!user) return genericResponse

    const token = crypto.randomBytes(32).toString('hex')
    user.resetToken = token
    user.resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    await user.save()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'
    const resetUrl = `${appUrl}/auth/reset-password?token=${token}`

    // TODO: Send this via email (Option A) — replace with nodemailer SMTP in a future update
    console.log('\n========== PASSWORD RESET LINK ==========')
    console.log(`User: ${user.email}`)
    console.log(`Link: ${resetUrl}`)
    console.log(`Expires: ${user.resetTokenExpiry.toISOString()}`)
    console.log('=========================================\n')

    return genericResponse
  } catch (err) {
    console.error('Forgot password error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
