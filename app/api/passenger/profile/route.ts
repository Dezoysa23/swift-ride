import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { validate } from '@/lib/validate'

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'passenger') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()

  const user = await User.findById(auth.id).select('-password').lean()
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: user })
}

export async function PUT(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'passenger') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, phone } = body as { name?: string; phone?: string }

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  if (!validate.string(name.trim(), 1, 100)) {
    return NextResponse.json({ error: 'Name must be 1-100 characters' }, { status: 400 })
  }

  if (phone && !validate.phone(phone)) {
    return NextResponse.json({ error: 'Invalid phone format' }, { status: 400 })
  }

  const user = await User.findByIdAndUpdate(
    auth.id,
    { name: name.trim(), phone: phone?.trim() ?? '' },
    { new: true, runValidators: true }
  ).select('-password')

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: user })
}
