import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IBooking extends Document {
  passengerId: mongoose.Types.ObjectId
  routeId: mongoose.Types.ObjectId
  busId?: mongoose.Types.ObjectId
  turnId?: mongoose.Types.ObjectId
  bookingDate: Date
  boardingStop: string
  alightingStop: string
  fare: number
  seats: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  paymentStatus: 'pending' | 'paid' | 'refunded'
  stripePaymentIntentId?: string
}

const BookingSchema = new Schema<IBooking>(
  {
    passengerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    routeId: { type: Schema.Types.ObjectId, ref: 'Route', required: true },
    busId: { type: Schema.Types.ObjectId, ref: 'Bus' },
    turnId: { type: Schema.Types.ObjectId, ref: 'Turn' },
    bookingDate: { type: Date, required: true },
    boardingStop: { type: String, required: true },
    alightingStop: { type: String, required: true },
    fare: { type: Number, required: true },
    seats: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending',
    },
    stripePaymentIntentId: String,
  },
  { timestamps: true }
)

const Booking: Model<IBooking> =
  mongoose.models.Booking ?? mongoose.model<IBooking>('Booking', BookingSchema)
export default Booking
