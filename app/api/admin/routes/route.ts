import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Route from '@/lib/models/Route'
import { validate } from '@/lib/validate'

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  const filter: Record<string, unknown> = {}
  if (status && validate.enum(status, ['active', 'inactive'])) {
    filter.status = status
  }

  const routes = await Route.find(filter).sort({ routeNumber: 1 }).lean()

  return NextResponse.json({ success: true, data: routes })
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const body = await request.json()
  const { routeNumber, name, startPoint, endPoint, stops, distanceKm, estimatedMinutes, fare, status } = body

  if (!routeNumber || !name || !startPoint || !endPoint || fare === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Validate inputs
  if (!validate.string(routeNumber, 1, 50)) {
    return NextResponse.json({ error: 'Route number must be 1-50 characters' }, { status: 400 })
  }

  if (!validate.string(name, 1, 100)) {
    return NextResponse.json({ error: 'Name must be 1-100 characters' }, { status: 400 })
  }

  if (!validate.string(startPoint, 1, 100)) {
    return NextResponse.json({ error: 'Start point must be 1-100 characters' }, { status: 400 })
  }

  if (!validate.string(endPoint, 1, 100)) {
    return NextResponse.json({ error: 'End point must be 1-100 characters' }, { status: 400 })
  }

  if (!validate.number(fare, 0, 10000)) {
    return NextResponse.json({ error: 'Fare must be between 0 and 10000' }, { status: 400 })
  }

  if (distanceKm !== undefined && !validate.number(distanceKm, 0, 5000)) {
    return NextResponse.json({ error: 'Distance must be between 0 and 5000 km' }, { status: 400 })
  }

  if (estimatedMinutes !== undefined && !validate.number(estimatedMinutes, 0, 1440)) {
    return NextResponse.json({ error: 'Estimated minutes must be between 0 and 1440' }, { status: 400 })
  }

  if (status && !validate.enum(status, ['active', 'inactive'])) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const existing = await Route.findOne({ routeNumber })
  if (existing) {
    return NextResponse.json({ error: 'Route number already exists' }, { status: 400 })
  }

  const route = await Route.create({
    routeNumber,
    name,
    startPoint,
    endPoint,
    stops: stops ?? [],
    distanceKm: distanceKm ?? 0,
    estimatedMinutes: estimatedMinutes ?? 0,
    fare,
    status: status ?? 'active',
  })

  return NextResponse.json({ success: true, data: route }, { status: 201 })
}
