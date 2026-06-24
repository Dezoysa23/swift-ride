import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IPayment extends Document {
  passengerId: mongoose.Types.ObjectId
  bookingId: mongoose.Types.ObjectId
  amount: number
  currency: string
  stripePaymentIntentId: string
  status: 'pending' | 'succeeded' | 'failed' | 'refunded'
}

const PaymentSchema = new Schema<IPayment>(
  {
    passengerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'lkr' },
    stripePaymentIntentId: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed', 'refunded'],
      default: 'pending',
    },
  },
  { timestamps: true }
)

const Payment: Model<IPayment> =
  mongoose.models.Payment ?? mongoose.model<IPayment>('Payment', PaymentSchema)
export default Payment
