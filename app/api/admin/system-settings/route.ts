import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import mongoose, { Schema, Model } from 'mongoose'

interface ISystemSettings {
  appName: string
  currency: string
  defaultFare: number
  maxSeatsPerBooking: number
}

const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    appName: { type: String, default: 'Swift Ride' },
    currency: { type: String, default: 'LKR' },
    defaultFare: { type: Number, default: 100 },
    maxSeatsPerBooking: { type: Number, default: 4 },
  },
  { timestamps: true }
)

const SystemSettings: Model<ISystemSettings> =
  mongoose.models.SystemSettings ??
  mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema)

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  let settings = await SystemSettings.findOne().lean()

  if (!settings) {
    settings = await SystemSettings.create({
      appName: 'Swift Ride',
      currency: 'LKR',
      defaultFare: 100,
      maxSeatsPerBooking: 4,
    })
  }

  return NextResponse.json({ success: true, data: settings })
}

export async function PUT(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const body = await request.json()
  const { appName, currency, defaultFare, maxSeatsPerBooking } = body

  const update: Partial<ISystemSettings> = {}
  if (appName !== undefined) update.appName = appName
  if (currency !== undefined) update.currency = currency
  if (defaultFare !== undefined) update.defaultFare = Number(defaultFare)
  if (maxSeatsPerBooking !== undefined) update.maxSeatsPerBooking = Number(maxSeatsPerBooking)

  const settings = await SystemSettings.findOneAndUpdate(
    {},
    update,
    { new: true, upsert: true, runValidators: true }
  )

  return NextResponse.json({ success: true, data: settings })
}
