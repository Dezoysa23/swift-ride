import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Bus from '@/lib/models/Bus'

// Public endpoint — no auth required
export async function GET() {
  await connectDB()

  const buses = await Bus.find({
    status: 'active',
    'currentLocation.lat': { $exists: true },
    'currentLocation.lng': { $exists: true },
  })
    .populate('driverId', 'name')
    .populate('currentRouteId', 'name routeNumber')
    .select('busNumber plateNumber model status currentLocation driverId currentRouteId')
    .lean()

  return NextResponse.json({ success: true, data: buses })
}
