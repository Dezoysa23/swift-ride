import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { isLatLng } from '@/lib/maps/google-maps'
import Booking from '@/lib/models/Booking'
import LocationEvent from '@/lib/models/LocationEvent'

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'passenger') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    bookingId?: string
    pickupAddress?: string
    pickupLat?: unknown
    pickupLng?: unknown
    accuracy?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.bookingId || !mongoose.isValidObjectId(body.bookingId)) {
    return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
  }

  const pickup = {
    lat: Number(body.pickupLat),
    lng: Number(body.pickupLng),
  }

  if (!isLatLng(pickup)) {
    return NextResponse.json({ error: 'pickupLat and pickupLng must be valid coordinates' }, { status: 400 })
  }

  await connectDB()

  const booking = await Booking.findOneAndUpdate(
    {
      _id: body.bookingId,
      passengerId: auth.id,
      status: { $in: ['pending', 'confirmed'] },
    },
    {
      $set: {
        pickupAddress: body.pickupAddress?.trim().slice(0, 300) || undefined,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
      },
    },
    { new: true }
  ).lean()

  if (!booking) {
    return NextResponse.json({ error: 'Active booking not found' }, { status: 404 })
  }

  await LocationEvent.create({
    userId: auth.id,
    bookingId: body.bookingId,
    role: 'passenger',
    lat: pickup.lat,
    lng: pickup.lng,
    accuracy: Number.isFinite(Number(body.accuracy)) ? Number(body.accuracy) : undefined,
    eventType: 'pickup_selected',
  })

  return NextResponse.json({ success: true, data: booking })
}
