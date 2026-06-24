import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import Route from '@/lib/models/Route'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { routeId } = await request.json()
    const { id: driverId } = await params

    await connectDB()

    const driver = await User.findOne({ _id: driverId, role: 'driver' })
    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    }

    if (!routeId) {
      driver.status = 'available'
      driver.assignedRouteId = undefined
      await driver.save()
      return NextResponse.json({ message: 'Driver unassigned from route successfully' })
    }

    const route = await Route.findById(routeId)
    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 })
    }

    driver.status = 'on_duty'
    driver.assignedRouteId = route._id
    await driver.save()

    return NextResponse.json({ message: 'Driver assigned to route successfully' })
  } catch (error) {
    console.error('Error assigning route to driver:', error)
    return NextResponse.json({ error: 'Failed to assign route to driver' }, { status: 500 })
  }
}
