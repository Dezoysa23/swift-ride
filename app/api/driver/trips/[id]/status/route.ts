import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Booking from '@/lib/models/Booking'
import DriverLocation from '@/lib/models/DriverLocation'
import type { TripStatus } from '@/lib/models/Booking'

const VALID_TRANSITIONS: Record<string, TripStatus[]> = {
  assigned:    ['on_the_way', 'cancelled'],
  on_the_way:  ['arrived', 'cancelled'],
  arrived:     ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed:   [],
  cancelled:   [],
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'driver') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: bookingId } = await params
  const body = await request.json()
  const { status } = body as { status: TripStatus }

  const validStatuses: TripStatus[] = [
    'assigned', 'on_the_way', 'arrived', 'in_progress', 'completed', 'cancelled',
  ]
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid trip status' }, { status: 400 })
  }

  await connectDB()

  const booking = await Booking.findOne({
    _id: bookingId,
    driverId: auth.id,
    status: { $in: ['pending', 'confirmed'] },
  })

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found or access denied' }, { status: 404 })
  }

  const current = booking.tripStatus ?? 'assigned'
  const allowed = VALID_TRANSITIONS[current] ?? []
  if (!allowed.includes(status)) {
    return NextResponse.json(
      { error: `Cannot transition from "${current}" to "${status}"` },
      { status: 409 }
    )
  }

  booking.tripStatus = status

  // Mirror terminal trip statuses onto booking.status
  if (status === 'completed') booking.status = 'completed'
  if (status === 'cancelled') booking.status = 'cancelled'

  await booking.save()

  // Update DriverLocation status to reflect on_trip vs online
  if (status === 'in_progress') {
    await DriverLocation.findOneAndUpdate(
      { driverId: auth.id },
      { $set: { status: 'on_trip', lastUpdatedAt: new Date() } }
    )
  } else if (status === 'completed' || status === 'cancelled') {
    await DriverLocation.findOneAndUpdate(
      { driverId: auth.id },
      { $set: { status: 'online', lastUpdatedAt: new Date() } }
    )
  }

  return NextResponse.json({ success: true, data: { tripStatus: booking.tripStatus, status: booking.status } })
}
