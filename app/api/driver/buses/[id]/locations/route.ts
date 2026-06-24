import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import Bus from '@/lib/models/Bus'
import DriverLocation from '@/lib/models/DriverLocation'
import { isLatLng } from '@/lib/maps/google-maps'

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

  const bus = await Bus.findById(id).lean()
  if (!bus) {
    return NextResponse.json({ error: 'Bus not found' }, { status: 404 })
  }

  return NextResponse.json({ currentLocation: bus.currentLocation ?? null })
}

export async function POST(
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

  const body = await request.json()
  const { lat, lng } = body

  if (typeof lat !== 'number' || typeof lng !== 'number' || !isLatLng({ lat, lng })) {
    return NextResponse.json({ error: 'lat and lng must be valid coordinates' }, { status: 400 })
  }

  const now = new Date()

  const [bus] = await Promise.all([
    Bus.findByIdAndUpdate(
      id,
      { $set: { currentLocation: { lat, lng, updatedAt: now } } },
      { new: true }
    ).lean(),
    // Keep DriverLocation in sync so the admin live map reflects this update
    DriverLocation.findOneAndUpdate(
      { driverId: auth.id },
      {
        $set: {
          lat,
          lng,
          busId: driver.assignedBusId,
          routeId: driver.assignedRouteId ?? undefined,
          lastUpdatedAt: now,
        },
        $setOnInsert: { status: 'online' },
      },
      { new: true, upsert: true }
    ).lean(),
  ])

  if (!bus) {
    return NextResponse.json({ error: 'Bus not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: bus })
}
