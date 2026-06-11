import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import Bus from '@/lib/models/Bus'
import Route from '@/lib/models/Route'

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'driver') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()

  // Get driver with assigned bus
  const driver = await User.findById(auth.id).lean()
  if (!driver?.assignedBusId) {
    return NextResponse.json({ error: 'No bus assigned' }, { status: 404 })
  }

  // Get bus with current route
  const bus = await Bus.findById(driver.assignedBusId).lean()
  if (!bus?.currentRouteId) {
    return NextResponse.json({ error: 'No route assigned to your bus' }, { status: 404 })
  }

  // Get full route with stops and populate assigned buses
  const route = await Route.findById(bus.currentRouteId).lean()
  if (!route) {
    return NextResponse.json({ error: 'Route not found' }, { status: 404 })
  }

  // Populate assigned buses
  const assignedBuses = await Bus.find({ _id: { $in: route.assignedBusIds } })
    .select('busNumber plateNumber status')
    .lean()

  return NextResponse.json({
    success: true,
    data: { ...route, assignedBuses },
  })
}
