import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { validate } from '@/lib/validate'
import Booking from '@/lib/models/Booking'
import Turn from '@/lib/models/Turn'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || auth.role !== 'driver') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await params // passenger id
    if (!validate.mongoId(id)) {
      return NextResponse.json({ error: 'Invalid passenger id' }, { status: 400 })
    }

    await connectDB()

    // A driver may only check in passengers on their OWN active turn.
    const activeTurn = await Turn.findOne({ driverId: auth.id, status: 'active' })
    if (!activeTurn) {
      return NextResponse.json(
        { error: 'No active turn. Start your turn before checking in passengers.' },
        { status: 403 }
      )
    }

    const booking = await Booking.findOne({
      passengerId: id,
      turnId: activeTurn._id,
      status: 'confirmed',
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'No confirmed booking for this passenger on your active turn' },
        { status: 404 }
      )
    }

    booking.status = 'completed'
    await booking.save()

    return NextResponse.json({ message: 'Passenger checked in successfully' })
  } catch (error) {
    console.error('Error checking in passenger:', error)
    return NextResponse.json({ error: 'Failed to check in passenger' }, { status: 500 })
  }
}
