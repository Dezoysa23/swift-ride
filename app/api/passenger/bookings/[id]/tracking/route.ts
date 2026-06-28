import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Booking from '@/lib/models/Booking'
import DriverLocation from '@/lib/models/DriverLocation'
import {
  calculateHaversineDistance,
  estimateEtaMinutes,
  determineProximityState,
  shouldSendNotification,
  proximityMessage,
} from '@/lib/location/proximity'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'passenger') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: bookingId } = await params
  await connectDB()

  const booking = await Booking.findOne({
    _id: bookingId,
    passengerId: auth.id,
  }).lean()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // Only track active bookings
  if (!['pending', 'confirmed'].includes(booking.status)) {
    return NextResponse.json({
      tracking: false,
      reason: 'Booking is not active',
      tripStatus: booking.tripStatus ?? null,
      status: booking.status,
    })
  }

  // No driver assigned yet
  if (!booking.driverId) {
    return NextResponse.json({
      tracking: true,
      tripStatus: booking.tripStatus ?? null,
      driverLocation: null,
      proximityState: 'driver_assigned',
      message: 'Waiting for a driver to be assigned',
      distanceMeters: null,
      etaMinutes: null,
      notification: null,
    })
  }

  // Fetch driver's current location
  const driverLoc = await DriverLocation.findOne({ driverId: booking.driverId })
    .populate('driverId', 'name')
    .lean()

  // Driver not yet online / no location data
  if (!driverLoc || driverLoc.status === 'offline') {
    return NextResponse.json({
      tracking: true,
      tripStatus: booking.tripStatus ?? 'assigned',
      driverLocation: null,
      proximityState: 'driver_assigned',
      message: 'Your driver has been assigned',
      distanceMeters: null,
      etaMinutes: null,
      notification: null,
    })
  }

  // Check driver location staleness (> 5 min old → don't trust it)
  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000)
  const isStale = driverLoc.lastUpdatedAt < staleThreshold

  let distanceMeters: number | null = null
  let etaMinutes: number | null = null
  let proximityState = booking.lastProximityNotification ?? 'driver_assigned'
  let notification: { state: string; message: string } | null = null

  if (!isStale && booking.pickupLat !== undefined && booking.pickupLng !== undefined) {
    distanceMeters = calculateHaversineDistance(
      { lat: driverLoc.lat, lng: driverLoc.lng },
      { lat: booking.pickupLat, lng: booking.pickupLng }
    )
    etaMinutes = estimateEtaMinutes(distanceMeters)

    const newState = determineProximityState(
      distanceMeters,
      etaMinutes,
      booking.lastDriverDistanceMeters
    )

    const shouldNotify = shouldSendNotification(
      newState,
      booking.lastProximityNotification,
      booking.lastProximityNotificationAt
    )

    if (shouldNotify) {
      proximityState = newState
      notification = { state: newState, message: proximityMessage(newState) }

      // Persist updated proximity state (fire-and-forget — don't await to keep response fast)
      Booking.findByIdAndUpdate(bookingId, {
        $set: {
          lastProximityNotification: newState,
          lastProximityNotificationAt: new Date(),
          lastDriverDistanceMeters: distanceMeters,
          lastDriverEtaMinutes: etaMinutes,
          driverLastLat: driverLoc.lat,
          driverLastLng: driverLoc.lng,
          driverLastUpdatedAt: driverLoc.lastUpdatedAt,
        },
      }).exec()
    } else {
      proximityState = booking.lastProximityNotification ?? newState
    }
  }

  return NextResponse.json({
    tracking: true,
    tripStatus: booking.tripStatus ?? 'assigned',
    driverLocation: isStale
      ? null
      : {
          lat: driverLoc.lat,
          lng: driverLoc.lng,
          lastUpdatedAt: driverLoc.lastUpdatedAt,
          status: driverLoc.status,
        },
    driver: driverLoc.driverId
      ? { name: (driverLoc.driverId as { name?: string }).name ?? 'Driver' }
      : null,
    proximityState,
    message: proximityMessage(proximityState as Parameters<typeof proximityMessage>[0]),
    distanceMeters,
    etaMinutes,
    notification,
    pickup: booking.pickupLat
      ? { lat: booking.pickupLat, lng: booking.pickupLng, address: booking.pickupAddress }
      : null,
    dropoff: booking.dropoffLat
      ? { lat: booking.dropoffLat, lng: booking.dropoffLng, address: booking.dropoffAddress }
      : null,
  })
}
