import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import DriverLocation from '@/lib/models/DriverLocation'

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'driver') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const driverLocation = await DriverLocation.findOneAndUpdate(
    { driverId: auth.id },
    { $set: { status: 'offline', lastUpdatedAt: new Date() } },
    { new: true }
  ).lean()

  return NextResponse.json({ success: true, data: driverLocation })
}
