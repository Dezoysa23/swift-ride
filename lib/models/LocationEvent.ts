import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ILocationEvent extends Document {
  userId: mongoose.Types.ObjectId
  bookingId?: mongoose.Types.ObjectId
  role: 'admin' | 'driver' | 'passenger'
  lat: number
  lng: number
  accuracy?: number
  eventType: 'pickup_selected' | 'driver_update' | 'trip_started' | 'trip_completed'
  createdAt: Date
}

const LocationEventSchema = new Schema<ILocationEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    role: {
      type: String,
      enum: ['admin', 'driver', 'passenger'],
      required: true,
    },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    accuracy: Number,
    eventType: {
      type: String,
      enum: ['pickup_selected', 'driver_update', 'trip_started', 'trip_completed'],
      required: true,
    },
  },
  { timestamps: true }
)

LocationEventSchema.index({ bookingId: 1, createdAt: -1 })
LocationEventSchema.index({ userId: 1, createdAt: -1 })
LocationEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 })

const LocationEvent: Model<ILocationEvent> =
  mongoose.models.LocationEvent ?? mongoose.model<ILocationEvent>('LocationEvent', LocationEventSchema)

export default LocationEvent
