import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IDriverLocation extends Document {
  driverId: mongoose.Types.ObjectId
  busId?: mongoose.Types.ObjectId
  routeId?: mongoose.Types.ObjectId
  lat: number
  lng: number
  heading?: number
  speed?: number
  accuracy?: number
  status: 'online' | 'offline' | 'on_trip'
  lastUpdatedAt: Date
}

const DriverLocationSchema = new Schema<IDriverLocation>(
  {
    driverId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    busId: { type: Schema.Types.ObjectId, ref: 'Bus' },
    routeId: { type: Schema.Types.ObjectId, ref: 'Route' },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    heading: Number,
    speed: Number,
    accuracy: Number,
    status: {
      type: String,
      enum: ['online', 'offline', 'on_trip'],
      default: 'online',
    },
    lastUpdatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

DriverLocationSchema.index({ status: 1, lastUpdatedAt: -1 })
DriverLocationSchema.index({ busId: 1 })
DriverLocationSchema.index({ routeId: 1 })

const DriverLocation: Model<IDriverLocation> =
  mongoose.models.DriverLocation ??
  mongoose.model<IDriverLocation>('DriverLocation', DriverLocationSchema)

export default DriverLocation
