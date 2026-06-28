import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { signToken, setAuthCookie } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rateLimit'
import { auditLog } from '@/lib/auditLog'
import { validate } from '@/lib/validate'

export async function POST(request: NextRequest) {
  try {
    // Check rate limiting
    const rateCheck = checkRateLimit(request, 'login')
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
      )
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    if (!validate.email(email)) {
      auditLog(undefined, undefined, 'login_attempt', 'user', 'failure', undefined, { reason: 'invalid_email' }, request)
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    await connectDB()

    const user = await User.findOne({ email })
    if (!user || !(await user.comparePassword(password))) {
      auditLog(email, undefined, 'login_attempt', 'user', 'failure', undefined, { reason: 'invalid_credentials' }, request)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    if (user.isActive === false) {
      auditLog(user._id.toString(), user.role, 'login_attempt', 'user', 'failure', undefined, { reason: 'account_deactivated' }, request)
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 })
    }

    // Block unverified accounts. Legacy users (emailVerified absent) are NOT blocked.
    if (user.emailVerified === false) {
      auditLog(user._id.toString(), user.role, 'login_attempt', 'user', 'failure', undefined, { reason: 'email_unverified' }, request)
      return NextResponse.json(
        { error: 'Please verify your email to continue.', needsVerification: true, email: user.email },
        { status: 403 }
      )
    }

    const token = await signToken({ id: user._id.toString(), role: user.role, email: user.email, name: user.name })
    await setAuthCookie(token)

    auditLog(user._id.toString(), user.role, 'login', 'user', 'success', user._id.toString(), undefined, request)

    // Return user without password field
    const userObj = user.toJSON()
    return NextResponse.json({ success: true, user: userObj })
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
