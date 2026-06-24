import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Booking from '@/lib/models/Booking'

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const bookings = await Booking.find({
    status: { $in: ['pending', 'confirmed'] },
    $or: [
      { pickupLat: { $type: 'number' }, pickupLng: { $type: 'number' } },
      { dropoffLat: { $type: 'number' }, dropoffLng: { $type: 'number' } },
    ],
  })
    .populate('passengerId', 'name phone')
    .populate('driverId', 'name phone')
    .populate('busId', 'busNumber plateNumber')
    .populate('routeId', 'name routeNumber')
    .sort({ bookingDate: 1 })
    .lean()

  return NextResponse.json({ success: true, data: bookings })
}
