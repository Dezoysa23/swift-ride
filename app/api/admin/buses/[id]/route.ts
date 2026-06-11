import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Bus from '@/lib/models/Bus'
import User from '@/lib/models/User'
import Turn from '@/lib/models/Turn'

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

  const bus = await Bus.findById(id)
    .populate('driverId', 'name email phone')
    .populate('currentRouteId', 'name routeNumber')
    .lean()

  if (!bus) return NextResponse.json({ error: 'Bus not found' }, { status: 404 })

  return NextResponse.json({ success: true, data: bus })
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

  const body = await request.json()
  const allowedFields = ['busNumber', 'plateNumber', 'model', 'year', 'capacity', 'status']
  const update: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) update[field] = body[field]
  }

  const bus = await Bus.findByIdAndUpdate(id, update, { new: true, runValidators: true })
    .populate('driverId', 'name email')

  if (!bus) return NextResponse.json({ error: 'Bus not found' }, { status: 404 })

  return NextResponse.json({ success: true, data: bus })
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

  const activeTurn = await Turn.findOne({ busId: id, status: { $in: ['scheduled', 'active'] } })
  if (activeTurn) {
    return NextResponse.json(
      { error: 'Cannot delete bus with active or scheduled turns' },
      { status: 400 }
    )
  }

  const bus = await Bus.findById(id)
  if (!bus) return NextResponse.json({ error: 'Bus not found' }, { status: 404 })

  // Unassign driver if any
  if (bus.driverId) {
    await User.findByIdAndUpdate(bus.driverId, { $unset: { assignedBusId: '' } })
  }

  await Bus.findByIdAndDelete(id)

  return NextResponse.json({ success: true, message: 'Bus deleted' })
}
