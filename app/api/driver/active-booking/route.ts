import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Booking from '@/lib/models/Booking'

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'driver') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  // Most recent active booking assigned to this driver
  const booking = await Booking.findOne({
    driverId: auth.id,
    status: { $in: ['pending', 'confirmed'] },
    tripStatus: { $nin: ['completed', 'cancelled'] },
  })
    .populate('passengerId', 'name phone')
    .sort({ createdAt: -1 })
    .lean()

  return NextResponse.json({ booking: booking ?? null })
}
