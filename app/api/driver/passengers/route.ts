import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Turn from '@/lib/models/Turn'
import Booking from '@/lib/models/Booking'

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'driver') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()

  // Find current active turn for this driver
  const activeTurn = await Turn.findOne({
    driverId: auth.id,
    status: 'active',
  })
    .populate('routeId', 'name routeNumber')
    .populate('busId', 'busNumber')
    .lean()

  if (!activeTurn) {
    return NextResponse.json({
      success: true,
      data: [],
      noActiveTurn: true,
      activeTurn: null,
    })
  }

  // Get all bookings for this turn
  const bookings = await Booking.find({
    turnId: activeTurn._id,
    status: { $nin: ['cancelled'] },
  })
    .populate('passengerId', 'name email phone avatar')
    .lean()

  return NextResponse.json({
    success: true,
    data: bookings,
    noActiveTurn: false,
    activeTurn,
  })
}
