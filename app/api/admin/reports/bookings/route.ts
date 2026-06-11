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

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const status = searchParams.get('status')

  const filter: Record<string, unknown> = {}

  if (from || to) {
    const dateFilter: Record<string, Date> = {}
    if (from) {
      const fromDate = new Date(from)
      fromDate.setHours(0, 0, 0, 0)
      dateFilter.$gte = fromDate
    }
    if (to) {
      const toDate = new Date(to)
      toDate.setHours(23, 59, 59, 999)
      dateFilter.$lte = toDate
    }
    filter.bookingDate = dateFilter
  }

  if (status) filter.status = status

  const bookings = await Booking.find(filter)
    .populate('passengerId', 'name email')
    .populate('routeId', 'name routeNumber')
    .populate('busId', 'busNumber')
    .sort({ bookingDate: -1 })
    .lean()

  // Calculate total revenue from paid bookings in result set
  const revenueAgg = await Booking.aggregate([
    { $match: { ...filter, paymentStatus: 'paid' } },
    { $group: { _id: null, total: { $sum: '$fare' } } },
  ])

  const totalRevenue = revenueAgg[0]?.total ?? 0

  return NextResponse.json({ success: true, data: bookings, totalRevenue })
}
