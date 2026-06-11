import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Bus from '@/lib/models/Bus'
import Route from '@/lib/models/Route'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'driver') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()

  const { id } = await params

  const route = await Route.findById(id).lean()
  if (!route) {
    return NextResponse.json({ error: 'Route not found' }, { status: 404 })
  }

  // Populate assigned buses
  const assignedBuses = await Bus.find({ _id: { $in: route.assignedBusIds } })
    .select('busNumber plateNumber status model year capacity')
    .lean()

  return NextResponse.json({
    success: true,
    data: { ...route, assignedBuses },
  })
}
