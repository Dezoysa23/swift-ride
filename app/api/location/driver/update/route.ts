import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { isLatLng } from '@/lib/maps/google-maps'
import Bus from '@/lib/models/Bus'
import DriverLocation from '@/lib/models/DriverLocation'
import Turn from '@/lib/models/Turn'
import User from '@/lib/models/User'

function readNumber(value: unknown): number | undefined {
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

function readLocation(body: Record<string, unknown>) {
  const source =
    body.location && typeof body.location === 'object'
      ? (body.location as Record<string, unknown>)
      : body

  return {
    lat: readNumber(source.lat),
    lng: readNumber(source.lng),
    heading: readNumber(source.heading),
    speed: readNumber(source.speed),
    accuracy: readNumber(source.accuracy),
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'driver') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const location = readLocation(body)
  if (!isLatLng(location)) {
    return NextResponse.json({ error: 'lat and lng must be valid coordinates' }, { status: 400 })
  }

  await connectDB()

  const [driver, activeTurn] = await Promise.all([
    User.findById(auth.id).select('assignedBusId assignedRouteId').lean(),
    Turn.findOne({ driverId: auth.id, status: 'active' }).lean(),
  ])

  if (!driver) {
    return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
  }

  const busId = activeTurn?.busId ?? driver.assignedBusId
  const routeId = activeTurn?.routeId ?? driver.assignedRouteId
  const status = activeTurn ? 'on_trip' : 'online'
  const lastUpdatedAt = new Date()

  const driverLocation = await DriverLocation.findOneAndUpdate(
    { driverId: auth.id },
    {
      $set: {
        busId,
        routeId,
        lat: location.lat,
        lng: location.lng,
        heading: location.heading,
        speed: location.speed,
        accuracy: location.accuracy,
        status,
        lastUpdatedAt,
      },
    },
    { new: true, upsert: true }
  ).lean()

  if (busId) {
    await Bus.findByIdAndUpdate(busId, {
      $set: {
        currentRouteId: routeId,
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
