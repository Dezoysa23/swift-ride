import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { isLatLng } from '@/lib/maps/google-maps'
import Bus from '@/lib/models/Bus'
import DriverLocation from '@/lib/models/DriverLocation'
import User from '@/lib/models/User'

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'driver') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { lat?: unknown; lng?: unknown; accuracy?: unknown } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const location = {
    lat: Number(body.lat),
    lng: Number(body.lng),
  }

  if (!isLatLng(location)) {
    return NextResponse.json(
      { error: 'lat and lng are required when going online' },
      { status: 400 }
    )
  }

  await connectDB()
  const driver = await User.findById(auth.id).select('assignedBusId assignedRouteId').lean()
  if (!driver) {
    return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
  }

  const lastUpdatedAt = new Date()
  const driverLocation = await DriverLocation.findOneAndUpdate(
    { driverId: auth.id },
    {
      $set: {
        busId: driver.assignedBusId,
        routeId: driver.assignedRouteId,
        lat: location.lat,
        lng: location.lng,
        accuracy: Number.isFinite(Number(body.accuracy)) ? Number(body.accuracy) : undefined,
        status: 'online',
        lastUpdatedAt,
      },
    },
    { new: true, upsert: true }
  ).lean()

  if (driver.assignedBusId) {
    await Bus.findByIdAndUpdate(driver.assignedBusId, {
      $set: {
        currentRouteId: driver.assignedRouteId,
        currentLocation: {
          lat: location.lat,
          lng: location.lng,
          updatedAt: lastUpdatedAt,
        },
      },
    })
  }

  return NextResponse.json({ success: true, data: driverLocation })
}
