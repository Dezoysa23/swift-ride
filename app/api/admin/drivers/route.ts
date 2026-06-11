import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { validate } from '@/lib/validate'

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const drivers = await User.find({ role: 'driver' })
    .populate('assignedBusId', 'busNumber plateNumber')
    .select('-password')
    .sort({ createdAt: -1 })
    .lean()

  return NextResponse.json({ success: true, data: drivers })
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const body = await request.json()
  const { name, email, password, phone, licenseNumber } = body

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
  }

  // Validate inputs
  if (!validate.string(name, 1, 100)) {
    return NextResponse.json({ error: 'Name must be 1-100 characters' }, { status: 400 })
  }

  if (!validate.email(email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
  }

  const passValidation = validate.password(password)
  if (!passValidation.valid) {
    return NextResponse.json({ error: passValidation.error }, { status: 400 })
  }

  if (phone && !validate.phone(phone)) {
    return NextResponse.json({ error: 'Invalid phone format' }, { status: 400 })
  }

  if (licenseNumber && !validate.string(licenseNumber, 1, 50)) {
    return NextResponse.json({ error: 'License number must be 1-50 characters' }, { status: 400 })
  }

  const existing = await User.findOne({ email: email.toLowerCase() })
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
  }

  const driver = await User.create({
    name,
    email,
    password,
    role: 'driver',
    phone: phone || undefined,
    licenseNumber: licenseNumber || undefined,
    isActive: true,
  })

  const driverObj = driver.toJSON()
  return NextResponse.json({ success: true, data: driverObj }, { status: 201 })
}
