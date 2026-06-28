import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rateLimit'
import {
  calculateEstimatedPrice,
  computeDrivingRoute,
  isLatLng,
} from '@/lib/maps/google-maps'

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

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rate = checkRateLimit(request, 'maps-estimate', { max: 60, windowMs: 60_000 })
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { origin, destination, rideType: rawRideType } = body as {
    origin?: unknown
    destination?: unknown
    rideType?: unknown
  }
  if (!isLatLng(origin) || !isLatLng(destination)) {
    return NextResponse.json(
      { error: 'origin and destination must be { lat, lng } coordinates' },
      { status: 400 }
    )
  }

  try {
    const route = await computeDrivingRoute(origin, destination)
    const rideType = normalizeRideType(rawRideType)
    const envMultiplier = fareNumber(
      `MAPS_PRICE_${rideType.toUpperCase()}_MULTIPLIER`,
      rideTypeMultipliers[rideType]
    )
    const estimatedPrice = calculateEstimatedPrice({
      distanceKm: route.distanceKm,
      durationMinutes: route.durationMinutes,
      baseFare: fareNumber('MAPS_PRICE_BASE_FARE', 100),
      perKm: fareNumber('MAPS_PRICE_PER_KM', 60),
      perMinute: fareNumber('MAPS_PRICE_PER_MINUTE', 5),
      serviceFee: fareNumber('MAPS_PRICE_SERVICE_FEE', 0),
      minimumFare: fareNumber('MAPS_PRICE_MINIMUM_FARE', 300),
      rideTypeMultiplier: envMultiplier,
    })

    return NextResponse.json({ success: true, data: { ...route, estimatedPrice, rideType } })
  } catch (error) {
    console.error('Price estimate failed:', error)
    return NextResponse.json({ error: 'Failed to estimate price' }, { status: 502 })
  }
}
