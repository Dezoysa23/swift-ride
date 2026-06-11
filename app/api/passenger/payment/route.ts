import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Booking from '@/lib/models/Booking'
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

  const { bookingId, confirmPayment } = body as {
    bookingId?: string
    confirmPayment?: boolean
  }

  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
  }

  const booking = await Booking.findOne({ _id: bookingId, passengerId: auth.id })
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // If confirmPayment is true, simulate payment confirmation (for demo mode)
  if (confirmPayment) {
    booking.paymentStatus = 'paid'
    booking.status = 'confirmed'
    await booking.save()

    // Update or create Payment record if stripePaymentIntentId exists
    if (booking.stripePaymentIntentId) {
      await Payment.findOneAndUpdate(
        { stripePaymentIntentId: booking.stripePaymentIntentId },
        { status: 'succeeded' }
      )
    }

    return NextResponse.json({ success: true, data: { bookingId, status: 'confirmed' } })
  }

  // If booking already has a payment intent, return its client secret
  if (booking.stripePaymentIntentId) {
    try {
      const existing = await stripe.paymentIntents.retrieve(booking.stripePaymentIntentId)
      if (existing.status !== 'canceled') {
        return NextResponse.json({
          success: true,
          clientSecret: existing.client_secret,
          amount: existing.amount,
        })
      }
    } catch {
      // If retrieval fails, create a new one below
    }
  }

  // Create a new Stripe payment intent
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(booking.fare * 100),
    currency: 'usd',
    metadata: {
      bookingId: String(booking._id),
      passengerId: auth.id,
    },
  })

  // Save intent ID on the booking
  booking.stripePaymentIntentId = intent.id
  await booking.save()

  // Create a pending Payment record
  await Payment.create({
    passengerId: auth.id,
    bookingId: booking._id,
    amount: booking.fare,
    currency: 'usd',
    stripePaymentIntentId: intent.id,
    status: 'pending',
  })

  return NextResponse.json({
    success: true,
    clientSecret: intent.client_secret,
    amount: intent.amount,
  })
}
