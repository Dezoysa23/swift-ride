import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Booking from '@/lib/models/Booking'
import { stripe } from '@/lib/stripe'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params
    await connectDB()

    const booking = await Booking.findOne({ _id: id, passengerId: auth.id }).lean()
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    return NextResponse.json({ booking })
  } catch (error) {
    console.error('Error getting booking:', error)
    return NextResponse.json({ error: 'Failed to get booking' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params
    await connectDB()

    const booking = await Booking.findOne({ _id: id, passengerId: auth.id })
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (!booking.stripePaymentIntentId) {
      return NextResponse.json({ error: 'No payment intent on this booking' }, { status: 400 })
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(booking.stripePaymentIntentId)
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
    }

    booking.status = 'confirmed'
    booking.paymentStatus = 'paid'
    await booking.save()

    return NextResponse.json({ message: 'Booking confirmed successfully' })
  } catch (error) {
    console.error('Error confirming booking:', error)
    return NextResponse.json({ error: 'Failed to confirm booking' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params
    await connectDB()

    const booking = await Booking.findOne({ _id: id, passengerId: auth.id })
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (booking.status !== 'pending') {
      return NextResponse.json({ error: 'Cannot cancel non-pending booking' }, { status: 400 })
    }

    if (booking.stripePaymentIntentId) {
      await stripe.paymentIntents.cancel(booking.stripePaymentIntentId)
    }

    booking.status = 'cancelled'
    booking.paymentStatus = 'refunded'
    await booking.save()

    return NextResponse.json({ message: 'Booking cancelled successfully' })
  } catch (error) {
    console.error('Error cancelling booking:', error)
    return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 })
  }
}
