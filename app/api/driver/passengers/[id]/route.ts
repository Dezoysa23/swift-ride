import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Booking from '@/lib/models/Booking'
import Turn from '@/lib/models/Turn'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'driver') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()

  const { id } = await params

  const booking = await Booking.findById(id)
    .populate('passengerId', 'name email phone avatar')
    .populate('routeId', 'name routeNumber')
    .populate('busId', 'busNumber plateNumber')
    .lean()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // Verify this booking belongs to a turn assigned to this driver
  if (booking.turnId) {
    const turn = await Turn.findOne({ _id: booking.turnId, driverId: auth.id }).lean()
    if (!turn) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }

  return NextResponse.json({ success: true, data: booking })
}
