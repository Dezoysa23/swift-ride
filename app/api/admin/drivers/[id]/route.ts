import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import Bus from '@/lib/models/Bus'
import { validate } from '@/lib/validate'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const { id } = await params

  if (!validate.mongoId(id)) {
    return NextResponse.json({ error: 'Invalid driver ID' }, { status: 400 })
  }

  const driver = await User.findOne({ _id: id, role: 'driver' })
    .populate('assignedBusId', 'busNumber plateNumber')
    .select('-password')
    .lean()

  if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 })

  return NextResponse.json({ success: true, data: driver })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const { id } = await params

  if (!validate.mongoId(id)) {
    return NextResponse.json({ error: 'Invalid driver ID' }, { status: 400 })
  }

  const body = await request.json()

  const allowedFields = ['name', 'phone', 'licenseNumber', 'isActive']
  const update: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      // Validate each field
      if (field === 'name' && !validate.string(body[field], 1, 100)) {
        return NextResponse.json({ error: 'Name must be 1-100 characters' }, { status: 400 })
      }
      if (field === 'phone' && body[field] && !validate.phone(body[field])) {
        return NextResponse.json({ error: 'Invalid phone format' }, { status: 400 })
      }
      if (field === 'licenseNumber' && body[field] && !validate.string(body[field], 1, 50)) {
        return NextResponse.json({ error: 'License number must be 1-50 characters' }, { status: 400 })
      }
      if (field === 'isActive' && typeof body[field] !== 'boolean') {
        return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 })
      }
      update[field] = body[field]
    }
  }

  const driver = await User.findOneAndUpdate(
    { _id: id, role: 'driver' },
    update,
    { new: true, runValidators: true }
  )
    .populate('assignedBusId', 'busNumber plateNumber')
    .select('-password')

  if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 })

  return NextResponse.json({ success: true, data: driver })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const { id } = await params

  if (!validate.mongoId(id)) {
    return NextResponse.json({ error: 'Invalid driver ID' }, { status: 400 })
  }

  const driver = await User.findOne({ _id: id, role: 'driver' })
  if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 })

  // Unassign bus if any
  if (driver.assignedBusId) {
    await Bus.findByIdAndUpdate(driver.assignedBusId, { $unset: { driverId: '' } })
  }

  await User.findByIdAndUpdate(id, { isActive: false, $unset: { assignedBusId: '' } })

  return NextResponse.json({ success: true, message: 'Driver deactivated and unassigned' })
}
