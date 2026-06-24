import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Payment from '@/lib/models/Payment'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'passenger') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { amount, currency, bookingId } = body as {
    amount?: number
    currency?: string
    bookingId?: string
  }

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'A positive amount is required' }, { status: 400 })
  }

  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
  }

  const resolvedCurrency = currency ?? 'lkr'

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: resolvedCurrency,
    metadata: {
      bookingId,
      passengerId: auth.id,
    },
  })

  // Create a pending Payment record
  await Payment.create({
    passengerId: auth.id,
    bookingId,
    amount,
    currency: resolvedCurrency,
    stripePaymentIntentId: intent.id,
    status: 'pending',
  })

  return NextResponse.json({ success: true, clientSecret: intent.client_secret })
}
