import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { connectDB } from '@/lib/db'
import Booking from '@/lib/models/Booking'
import Payment from '@/lib/models/Payment'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const sig = headersList.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Stripe webhook signature error:', err)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  await connectDB()

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const intent = event.data.object
      const { bookingId } = intent.metadata ?? {}

      if (bookingId) {
        await Booking.findByIdAndUpdate(bookingId, {
          paymentStatus: 'paid',
          status: 'confirmed',
        })
      }

      await Payment.findOneAndUpdate(
        { stripePaymentIntentId: intent.id },
        { status: 'succeeded' }
      )
      break
    }

    case 'payment_intent.payment_failed': {
      const intent = event.data.object
      await Payment.findOneAndUpdate(
        { stripePaymentIntentId: intent.id },
        { status: 'failed' }
      )
      break
    }

    case 'charge.refunded': {
      const charge = event.data.object
      const paymentIntentId = typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : null

      if (paymentIntentId) {
        const payment = await Payment.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntentId },
          { status: 'refunded' },
          { new: true }
        )
        if (payment) {
          await Booking.findByIdAndUpdate(payment.bookingId, {
            paymentStatus: 'refunded',
            status: 'cancelled',
          })
        }
      }
      break
    }

    default:
      break
  }

  return NextResponse.json({ received: true })
}
