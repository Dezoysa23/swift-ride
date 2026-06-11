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

  const turn = await Turn.findOne({ _id: id, driverId: auth.id })
    .populate('driverId', 'name email phone')
    .populate('busId', 'busNumber plateNumber model year capacity status')
    .populate('routeId', 'name routeNumber startPoint endPoint stops distanceKm estimatedMinutes fare')
    .lean()

  if (!turn) {
    return NextResponse.json({ error: 'Turn not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: turn })
}
