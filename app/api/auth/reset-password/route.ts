import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { validate } from '@/lib/validate'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
  const rateCheck = checkRateLimit(request, 'reset-password')
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
    )
  }

  try {
    const { token, password } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Reset token is required' }, { status: 400 })
    }

    const passwordCheck = validate.password(password ?? '')
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.error }, { status: 400 })
    }

    await connectDB()

    // Tokens are stored hashed; hash the incoming token to look it up.
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
    const user = await User.findOne({
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: new Date() },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Reset link is invalid or has expired' },
        { status: 400 }
      )
    }

    user.password = password
    user.resetToken = undefined
    user.resetTokenExpiry = undefined
    await user.save() // pre-save hook handles bcrypt hashing

    return NextResponse.json({ success: true, message: 'Password updated. You can now log in.' })
  } catch (err) {
    console.error('Reset password error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
