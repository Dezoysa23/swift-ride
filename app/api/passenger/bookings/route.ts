import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import {
  calculateEstimatedPrice,
  computeDrivingRoute,
  isLatLng,
} from '@/lib/maps/google-maps'
import Booking from '@/lib/models/Booking'
import Route from '@/lib/models/Route'

const rideTypeMultipliers = {
  standard: 1,
  comfort: 1.2,
  premium: 1.5,
  van: 1.8,
} as const

type RideType = keyof typeof rideTypeMultipliers

function fareNumber(name: string, fallback: number): number {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

function normalizeRideType(value: unknown): RideType {
  return typeof value === 'string' && value in rideTypeMultipliers
    ? (value as RideType)
    : 'standard'
}

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'passenger') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()

  const bookings = await Booking.find({ passengerId: auth.id })
    .populate('routeId', 'name routeNumber')
    .populate('busId', 'busNumber')
    .sort({ createdAt: -1 })
    .lean()

  return NextResponse.json({ success: true, data: bookings })
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'passenger') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { routeId, bookingDate, boardingStop, alightingStop, seats, locationDetails } = body as {
    routeId?: string
    bookingDate?: string
    boardingStop?: string
    alightingStop?: string
    seats?: number
    locationDetails?: {
      pickupAddress?: string
      pickupLat?: unknown
      pickupLng?: unknown
      dropoffAddress?: string
      dropoffLat?: unknown
      dropoffLng?: unknown
      rideType?: unknown
    } | null
  }

  if (!routeId || !bookingDate || !boardingStop || !alightingStop) {
    return NextResponse.json({ error: 'routeId, bookingDate, boardingStop and alightingStop are required' }, { status: 400 })
  }

  const route = await Route.findById(routeId).lean()
  if (!route) {
    return NextResponse.json({ error: 'Route not found' }, { status: 404 })
  }
  if (route.status !== 'active') {
    return NextResponse.json({ error: 'Route is not active' }, { status: 400 })
  }

  const seatCount = Math.min(4, Math.max(1, Number(seats) || 1))
  const fare = route.fare * seatCount
  const locationFields: Record<string, unknown> = {}

  if (locationDetails) {
    const pickup = {
      lat: Number(locationDetails.pickupLat),
      lng: Number(locationDetails.pickupLng),
    }
    const dropoff = {
      lat: Number(locationDetails.dropoffLat),
      lng: Number(locationDetails.dropoffLng),
    }

    if (!isLatLng(pickup) || !isLatLng(dropoff)) {
      return NextResponse.json(
        { error: 'pickup and drop-off coordinates must be valid' },
        { status: 400 }
      )
    }

    let routeEstimate
    try {
      routeEstimate = await computeDrivingRoute(pickup, dropoff)
    } catch (error) {
      console.error('Booking route estimate failed:', error)
      return NextResponse.json({ error: 'Route estimate unavailable' }, { status: 502 })
    }

    const rideType = normalizeRideType(locationDetails.rideType)
    const rideTypeMultiplier = fareNumber(
      `MAPS_PRICE_${rideType.toUpperCase()}_MULTIPLIER`,
      rideTypeMultipliers[rideType]
    )
    const estimatedPrice = calculateEstimatedPrice({
      distanceKm: routeEstimate.distanceKm,
      durationMinutes: routeEstimate.durationMinutes,
      baseFare: fareNumber('MAPS_PRICE_BASE_FARE', 100),
      perKm: fareNumber('MAPS_PRICE_PER_KM', 60),
      perMinute: fareNumber('MAPS_PRICE_PER_MINUTE', 5),
      serviceFee: fareNumber('MAPS_PRICE_SERVICE_FEE', 0),
      minimumFare: fareNumber('MAPS_PRICE_MINIMUM_FARE', 300),
      rideTypeMultiplier,
    })

    Object.assign(locationFields, {
      pickupAddress: locationDetails.pickupAddress?.trim() || undefined,
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      dropoffAddress: locationDetails.dropoffAddress?.trim() || undefined,
      dropoffLat: dropoff.lat,
      dropoffLng: dropoff.lng,
      distanceKm: routeEstimate.distanceKm,
      durationMinutes: routeEstimate.durationMinutes,
      estimatedPrice,
      routePolyline: routeEstimate.encodedPolyline ?? undefined,
      rideType,
    })
  }

  const booking = await Booking.create({
    passengerId: auth.id,
    routeId,
    bookingDate: new Date(bookingDate),
    boardingStop,
    alightingStop,
    fare,
    seats: seatCount,
    status: 'pending',
    paymentStatus: 'pending',
    ...locationFields,
  })

  return NextResponse.json({ success: true, data: booking }, { status: 201 })
}
