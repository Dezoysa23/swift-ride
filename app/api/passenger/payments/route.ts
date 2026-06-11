import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Payment from '@/lib/models/Payment'

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'passenger') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()

  const payments = await Payment.find({ passengerId: auth.id })
    .populate('bookingId', 'bookingDate boardingStop alightingStop fare seats status routeId')
    .sort({ createdAt: -1 })
    .lean()

  return NextResponse.json({ success: true, data: payments })
}
