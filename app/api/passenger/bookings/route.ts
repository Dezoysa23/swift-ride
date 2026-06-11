import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Booking from '@/lib/models/Booking'
import Route from '@/lib/models/Route'

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

  const { routeId, bookingDate, boardingStop, alightingStop, seats } = body as {
    routeId?: string
    bookingDate?: string
    boardingStop?: string
    alightingStop?: string
    seats?: number
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
  })

  return NextResponse.json({ success: true, data: booking }, { status: 201 })
}
