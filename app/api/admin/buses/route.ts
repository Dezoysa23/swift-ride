import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Bus from '@/lib/models/Bus'
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
  if (status && validate.enum(status, ['active', 'inactive', 'maintenance'])) {
    filter.status = status
  }

  const buses = await Bus.find(filter)
    .populate('driverId', 'name email')
    .sort({ createdAt: -1 })
    .lean()

  return NextResponse.json({ success: true, data: buses })
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const body = await request.json()
  const { busNumber, plateNumber, busModel, year, capacity, status } = body

  if (!busNumber || !plateNumber || !busModel || year === undefined || !capacity) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Validate inputs
  if (!validate.string(busNumber, 1, 50)) {
    return NextResponse.json({ error: 'Bus number must be 1-50 characters' }, { status: 400 })
  }

  if (!validate.string(plateNumber, 1, 50)) {
    return NextResponse.json({ error: 'Plate number must be 1-50 characters' }, { status: 400 })
  }

  if (!validate.string(busModel, 1, 100)) {
    return NextResponse.json({ error: 'Bus model must be 1-100 characters' }, { status: 400 })
  }

  if (!validate.number(year, 1900, new Date().getFullYear() + 1)) {
    return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
  }

  if (!validate.number(capacity, 1, 200)) {
    return NextResponse.json({ error: 'Capacity must be between 1 and 200' }, { status: 400 })
  }

  if (status && !validate.enum(status, ['active', 'inactive', 'maintenance'])) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const existing = await Bus.findOne({ $or: [{ busNumber }, { plateNumber }] })
  if (existing) {
    return NextResponse.json({ error: 'Bus number or plate number already exists' }, { status: 400 })
  }

  const bus = await Bus.create({
    busNumber,
    plateNumber,
    busModel,
    year,
    capacity,
    status: status ?? 'active',
  })

  return NextResponse.json({ success: true, data: bus }, { status: 201 })
}
