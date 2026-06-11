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
    const rateCheck = checkRateLimit(request, 'register')
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
      )
    }

    const { name, email, password, role, phone } = await request.json()

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    if (!['passenger', 'driver'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Validate inputs
    if (!validate.string(name, 1, 100)) {
      return NextResponse.json({ error: 'Name must be 1-100 characters' }, { status: 400 })
    }

    if (!validate.email(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    const passValidation = validate.password(password)
    if (!passValidation.valid) {
      return NextResponse.json({ error: passValidation.error }, { status: 400 })
    }

    if (phone && !validate.phone(phone)) {
      return NextResponse.json({ error: 'Invalid phone format' }, { status: 400 })
    }

    await connectDB()

    const existing = await User.findOne({ email })
    if (existing) {
      auditLog(undefined, undefined, 'register_attempt', 'user', 'failure', undefined, { reason: 'email_exists' }, request)
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const user = await User.create({ name, email, password, role, phone })

    const token = await signToken({ id: user._id.toString(), role: user.role, email: user.email, name: user.name })
    await setAuthCookie(token)

    auditLog(user._id.toString(), user.role, 'register', 'user', 'success', user._id.toString(), undefined, request)

    // Return user without password field
    const userObj = user.toJSON()
    return NextResponse.json({ success: true, user: userObj }, { status: 201 })
  } catch (err) {
    console.error('Registration error:', err)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
