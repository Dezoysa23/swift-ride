import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Route from '@/lib/models/Route'
import Turn from '@/lib/models/Turn'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const { id } = await params

  const route = await Route.findById(id).lean()
  if (!route) return NextResponse.json({ error: 'Route not found' }, { status: 404 })

  return NextResponse.json({ success: true, data: route })
}

export async function PUT(
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

  const allowedFields = [
    'routeNumber', 'name', 'startPoint', 'endPoint', 'stops',
    'distanceKm', 'estimatedMinutes', 'fare', 'status',
  ]
  const update: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) update[field] = body[field]
  }

  const route = await Route.findByIdAndUpdate(id, update, { new: true, runValidators: true })
  if (!route) return NextResponse.json({ error: 'Route not found' }, { status: 404 })

  return NextResponse.json({ success: true, data: route })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const { id } = await params

  const activeTurn = await Turn.findOne({ routeId: id, status: { $in: ['scheduled', 'active'] } })
  if (activeTurn) {
    return NextResponse.json(
      { error: 'Cannot delete route with active or scheduled turns' },
      { status: 400 }
    )
  }

  const route = await Route.findByIdAndDelete(id)
  if (!route) return NextResponse.json({ error: 'Route not found' }, { status: 404 })

  return NextResponse.json({ success: true, message: 'Route deleted' })
}
