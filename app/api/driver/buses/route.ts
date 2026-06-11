import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import Bus from '@/lib/models/Bus'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || auth.role !== 'driver') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await connectDB()

    const driver = await User.findById(auth.id).lean()
    if (!driver?.assignedBusId) {
      return NextResponse.json({ error: 'No bus assigned to your account' }, { status: 404 })
    }

    const bus = await Bus.findById(driver.assignedBusId)
      .populate('currentRouteId', 'name routeNumber')
      .lean()

    if (!bus) {
      return NextResponse.json({ error: 'Bus not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: bus })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch bus information' }, { status: 500 })
  }
}
