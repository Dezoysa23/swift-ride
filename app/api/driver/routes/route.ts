import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import Route from '@/lib/models/Route'

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'driver') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()

  const driver = await User.findById(auth.id).lean()
  if (!driver?.assignedBusId) {
    return NextResponse.json({ success: true, data: [] })
  }

  // Find all routes where the driver's bus is assigned
  const routes = await Route.find({
    assignedBusIds: driver.assignedBusId,
  }).lean()

  return NextResponse.json({ success: true, data: routes })
}
