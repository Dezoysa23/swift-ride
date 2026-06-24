import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getAuthUser } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || auth.role !== 'driver') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await params
    const db = await getDb()

    const driver = await db.collection('users').findOne({ _id: new ObjectId(auth.id) })
    const passenger = await db.collection('users').findOne({ _id: new ObjectId(id) })

    if (!passenger) {
      return NextResponse.json({ error: 'Passenger not found' }, { status: 404 })
    }

    const booking = await db.collection('bookings').findOne({
      passengerId: id,
      routeId: driver?.assignedRouteId,
      status: 'confirmed',
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'No active booking found for this passenger on your route' },
        { status: 404 }
      )
    }

    await db.collection('bookings').updateOne(
      { _id: booking._id },
      { $set: { status: 'completed', checkedInAt: new Date(), checkedInBy: auth.id } }
    )

    return NextResponse.json({ message: 'Passenger checked in successfully' })
  } catch (error) {
    console.error('Error checking in passenger:', error)
    return NextResponse.json({ error: 'Failed to check in passenger' }, { status: 500 })
  }
}
