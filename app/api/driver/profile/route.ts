import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { validate } from '@/lib/validate'

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'driver') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()

  const user = await User.findById(auth.id).populate('assignedBusId').select('-password').lean()
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: user })
}

export async function PUT(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'driver') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()

  const body = await request.json()
  const { name, phone, licenseNumber } = body

  const updateData: Record<string, string> = {}

  if (name !== undefined) {
    if (!validate.string(name, 1, 100)) {
      return NextResponse.json({ error: 'Name must be 1-100 characters' }, { status: 400 })
    }
    updateData.name = name
  }

  if (phone !== undefined) {
    if (phone && !validate.phone(phone)) {
      return NextResponse.json({ error: 'Invalid phone format' }, { status: 400 })
    }
    updateData.phone = phone
  }

  if (licenseNumber !== undefined) {
    if (!validate.string(licenseNumber, 1, 50)) {
      return NextResponse.json({ error: 'License number must be 1-50 characters' }, { status: 400 })
    }
    updateData.licenseNumber = licenseNumber
  }

  const user = await User.findByIdAndUpdate(auth.id, { $set: updateData }, { new: true })
    .populate('assignedBusId')
    .select('-password')
    .lean()

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: user })
}
