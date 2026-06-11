import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import Bus from '@/lib/models/Bus'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const { id } = await params
  const body = await request.json()
  const { busId } = body

  const driver = await User.findOne({ _id: id, role: 'driver' })
  if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 })

  // Clear old bus assignment
  if (driver.assignedBusId) {
    await Bus.findByIdAndUpdate(driver.assignedBusId, { $unset: { driverId: '' } })
  }

  if (!busId) {
    // Unassign only
    await User.findByIdAndUpdate(id, { $unset: { assignedBusId: '' } })
    return NextResponse.json({ success: true, message: 'Bus unassigned from driver' })
  }

  const bus = await Bus.findById(busId)
  if (!bus) return NextResponse.json({ error: 'Bus not found' }, { status: 404 })

  // If the target bus already has a different driver, unassign that driver first
  if (bus.driverId && bus.driverId.toString() !== id) {
    await User.findByIdAndUpdate(bus.driverId, { $unset: { assignedBusId: '' } })
  }

  // Set the new assignment bidirectionally
  await Promise.all([
    User.findByIdAndUpdate(id, { assignedBusId: busId }),
    Bus.findByIdAndUpdate(busId, { driverId: id }),
  ])

  return NextResponse.json({ success: true, message: 'Bus assigned to driver' })
}
