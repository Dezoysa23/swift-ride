import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
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

  const turns = await Turn.find({
    routeId: id,
    driverId: auth.id,
  })
    .populate('busId', 'busNumber plateNumber status')
    .populate('routeId', 'name routeNumber startPoint endPoint')
    .sort({ scheduledDate: -1 })
    .lean()

  return NextResponse.json({ success: true, data: turns })
}
