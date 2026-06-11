import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import Bus from '@/lib/models/Bus'

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

  // Ensure this bus is assigned to the requesting driver
  const driver = await User.findById(auth.id).lean()
  if (!driver?.assignedBusId || String(driver.assignedBusId) !== id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const bus = await Bus.findById(id)
    .populate('currentRouteId', 'name routeNumber startPoint endPoint')
    .lean()

  if (!bus) {
    return NextResponse.json({ error: 'Bus not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: bus })
}
