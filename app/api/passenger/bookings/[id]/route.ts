import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Booking from '@/lib/models/Booking'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'passenger') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()

  const { id } = await params

  const booking = await Booking.findOne({ _id: id, passengerId: auth.id })
    .populate('routeId', 'name routeNumber startPoint endPoint stops fare estimatedMinutes distanceKm')
    .populate('busId', 'busNumber plateNumber model')
    .populate('passengerId', 'name email phone')
    .lean()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: booking })
}
