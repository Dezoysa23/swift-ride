import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Booking from '@/lib/models/Booking'
import DriverLocation from '@/lib/models/DriverLocation'

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  // Only show drivers that sent a location update within the last 5 minutes
  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000)

  const [drivers, activeBookings] = await Promise.all([
    DriverLocation.find({
      status: { $ne: 'offline' },
      lastUpdatedAt: { $gte: staleThreshold },
    })
      .populate('driverId', 'name email phone')
      .populate('busId', 'busNumber plateNumber')
      .populate('routeId', 'name routeNumber')
      .sort({ lastUpdatedAt: -1 })
      .lean(),
    Booking.find({
      status: { $in: ['pending', 'confirmed'] },
      pickupLat: { $type: 'number' },
      pickupLng: { $type: 'number' },
    })
      .populate('passengerId', 'name phone')
      .populate('driverId', 'name phone')
      .populate('busId', 'busNumber plateNumber')
      .populate('routeId', 'name routeNumber')
      .sort({ bookingDate: 1 })
      .lean(),
  ])

  return NextResponse.json({ success: true, data: { drivers, activeBookings } })
}
