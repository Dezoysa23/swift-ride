import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import Turn from '@/lib/models/Turn'
import DriverLocation from '@/lib/models/DriverLocation'

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'driver') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()

  const body = await request.json()
  const { status } = body

  if (status !== 'active' && status !== 'inactive') {
    return NextResponse.json({ error: 'status must be "active" or "inactive"' }, { status: 400 })
  }

  if (status === 'active') {
    // Check if already on duty
    const existingActive = await Turn.findOne({ driverId: auth.id, status: 'active' })
    if (existingActive) {
      return NextResponse.json(
        { error: 'You are already on an active turn' },
        { status: 409 }
      )
    }

    // Get driver's assigned bus
    const driver = await User.findById(auth.id).lean()
    if (!driver?.assignedBusId) {
      return NextResponse.json({ error: 'No bus assigned to your account' }, { status: 404 })
    }

    // Find today's scheduled turn for this driver
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const scheduledTurn = await Turn.findOne({
      driverId: auth.id,
      busId: driver.assignedBusId,
      status: 'scheduled',
      scheduledDate: { $gte: todayStart, $lte: todayEnd },
    })

    if (!scheduledTurn) {
      return NextResponse.json(
        { error: 'No scheduled turn found for today' },
        { status: 404 }
      )
    }

    scheduledTurn.status = 'active'
    scheduledTurn.startTime = new Date()
    await scheduledTurn.save()

    // Mark driver as online in DriverLocation (location coordinates come later via LocationUpdater)
    await DriverLocation.findOneAndUpdate(
      { driverId: auth.id },
      {
        $set: {
          status: 'online',
          busId: driver.assignedBusId ?? undefined,
          lastUpdatedAt: new Date(),
        },
      },
      { upsert: true }
    )

    const populated = await Turn.findById(scheduledTurn._id)
      .populate('routeId', 'name routeNumber')
      .populate('busId', 'busNumber plateNumber')
      .lean()

    return NextResponse.json({ success: true, data: populated })
  } else {
    // Deactivate: find active turn
    const activeTurn = await Turn.findOne({ driverId: auth.id, status: 'active' })
    if (!activeTurn) {
      return NextResponse.json({ error: 'No active turn found' }, { status: 404 })
    }

    activeTurn.status = 'completed'
    activeTurn.endTime = new Date()
    await activeTurn.save()

    // Mark driver offline in DriverLocation
    await DriverLocation.findOneAndUpdate(
      { driverId: auth.id },
      { $set: { status: 'offline', lastUpdatedAt: new Date() } }
    )

    return NextResponse.json({ success: true, data: activeTurn })
  }
}
