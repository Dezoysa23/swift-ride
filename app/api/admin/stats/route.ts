import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Bus from '@/lib/models/Bus'
import User from '@/lib/models/User'
import Route from '@/lib/models/Route'
import Booking from '@/lib/models/Booking'

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const [
    totalBuses,
    activeBuses,
    totalDrivers,
    activeDrivers,
    totalRoutes,
    activeRoutes,
    todayBookings,
    totalPassengers,
    revenueAgg,
  ] = await Promise.all([
    Bus.countDocuments(),
    Bus.countDocuments({ status: 'active' }),
    User.countDocuments({ role: 'driver' }),
    User.countDocuments({ role: 'driver', isActive: true }),
    Route.countDocuments(),
    Route.countDocuments({ status: 'active' }),
    Booking.countDocuments({ bookingDate: { $gte: today, $lte: todayEnd } }),
    User.countDocuments({ role: 'passenger' }),
    Booking.aggregate([
      {
        $match: {
          bookingDate: { $gte: today, $lte: todayEnd },
          paymentStatus: 'paid',
        },
      },
      { $group: { _id: null, total: { $sum: '$fare' } } },
    ]),
  ])

  const todayRevenue = revenueAgg[0]?.total ?? 0

  return NextResponse.json({
    success: true,
    data: {
      totalBuses,
      activeBuses,
      totalDrivers,
      activeDrivers,
      totalRoutes,
      activeRoutes,
      todayBookings,
      todayRevenue,
      totalPassengers,
    },
  })
}
