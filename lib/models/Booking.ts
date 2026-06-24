import mongoose, { Schema, Document, Model } from 'mongoose'

export type ProximityNotificationState =
  | 'driver_assigned'
  | 'driver_on_way'
  | 'driver_getting_closer'
  | 'driver_5_min_away'
  | 'driver_2_min_away'
  | 'driver_arrived'

export type TripStatus =
  | 'assigned'
  | 'on_the_way'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export interface IBooking extends Document {
  passengerId: mongoose.Types.ObjectId
  driverId?: mongoose.Types.ObjectId
  routeId: mongoose.Types.ObjectId
  busId?: mongoose.Types.ObjectId
  turnId?: mongoose.Types.ObjectId
  bookingDate: Date
  boardingStop: string
  alightingStop: string
  pickupAddress?: string
  pickupLat?: number
  pickupLng?: number
  dropoffAddress?: string
  dropoffLat?: number
  dropoffLng?: number
  distanceKm?: number
  durationMinutes?: number
  estimatedPrice?: number
  fare: number
  seats: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  paymentStatus: 'pending' | 'paid' | 'refunded'
  stripePaymentIntentId?: string
  // Level 2: active trip tracking
  tripStatus?: TripStatus
  lastProximityNotification?: ProximityNotificationState
  lastProximityNotificationAt?: Date
  lastDriverDistanceMeters?: number
  lastDriverEtaMinutes?: number
  driverLastLat?: number
  driverLastLng?: number
  driverLastUpdatedAt?: Date
}

const BookingSchema = new Schema<IBooking>(
  {
    passengerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'User' },
    routeId: { type: Schema.Types.ObjectId, ref: 'Route', required: true },
    busId: { type: Schema.Types.ObjectId, ref: 'Bus' },
    turnId: { type: Schema.Types.ObjectId, ref: 'Turn' },
    bookingDate: { type: Date, required: true },
    boardingStop: { type: String, required: true },
    alightingStop: { type: String, required: true },
    pickupAddress: String,
    pickupLat: Number,
    pickupLng: Number,
    dropoffAddress: String,
    dropoffLat: Number,
    dropoffLng: Number,
    distanceKm: Number,
    durationMinutes: Number,
    estimatedPrice: Number,
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
    tripStatus: {
      type: String,
      enum: ['assigned', 'on_the_way', 'arrived', 'in_progress', 'completed', 'cancelled'],
    },
    lastProximityNotification: {
      type: String,
      enum: [
        'driver_assigned',
        'driver_on_way',
        'driver_getting_closer',
        'driver_5_min_away',
        'driver_2_min_away',
        'driver_arrived',
      ],
    },
    lastProximityNotificationAt: Date,
    lastDriverDistanceMeters: Number,
    lastDriverEtaMinutes: Number,
    driverLastLat: Number,
    driverLastLng: Number,
    driverLastUpdatedAt: Date,
  },
  { timestamps: true }
)

BookingSchema.index({ passengerId: 1, status: 1 })
BookingSchema.index({ driverId: 1, status: 1 })
BookingSchema.index({ routeId: 1, status: 1 })
BookingSchema.index({ turnId: 1 })
BookingSchema.index({ pickupLat: 1, pickupLng: 1 }, { sparse: true })
BookingSchema.index({ stripePaymentIntentId: 1 }, { sparse: true })
BookingSchema.index({ tripStatus: 1 }, { sparse: true })

const Booking: Model<IBooking> =
  mongoose.models.Booking ?? mongoose.model<IBooking>('Booking', BookingSchema)
export default Booking
