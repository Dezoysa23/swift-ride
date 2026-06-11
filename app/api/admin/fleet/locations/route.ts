import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Bus from '@/lib/models/Bus'

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const buses = await Bus.find({ currentLocation: { $exists: true } })
    .populate('driverId', 'name phone')
    .populate('currentRouteId', 'name routeNumber')
    .lean()

  return NextResponse.json({ success: true, data: buses })
}
