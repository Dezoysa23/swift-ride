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

  // Verify driver is assigned to this route via an active turn
  const activeTurn = await Turn.findOne({
    driverId: auth.id,
    routeId: id,
    status: 'active',
  })

  if (!activeTurn) {
    return NextResponse.json({ error: 'Not assigned to this route' }, { status: 403 })
  }

  // Today date range
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const bookings = await Booking.find({
    routeId: id,
    turnId: activeTurn._id,
    bookingDate: { $gte: todayStart, $lte: todayEnd },
    status: { $nin: ['cancelled'] },
  })
    .populate('passengerId', 'name email phone avatar')
    .lean()

  return NextResponse.json({ success: true, data: bookings })
}
