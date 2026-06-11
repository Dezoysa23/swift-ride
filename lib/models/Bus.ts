import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IBus extends Document {
  busNumber: string
  plateNumber: string
  busModel: string
  year: number
  capacity: number
  status: 'active' | 'inactive' | 'maintenance'
  driverId?: mongoose.Types.ObjectId
  currentRouteId?: mongoose.Types.ObjectId
  currentLocation?: {
    lat: number
    lng: number
    updatedAt: Date
  }
}

const BusSchema = new Schema<IBus>(
  {
    busNumber: { type: String, required: true, unique: true, trim: true },
    plateNumber: { type: String, required: true, unique: true, trim: true },
    busModel: { type: String, required: true },
    year: { type: Number, required: true },
    capacity: { type: Number, required: true },
    status: { type: String, enum: ['active', 'inactive', 'maintenance'], default: 'active' },
    driverId: { type: Schema.Types.ObjectId, ref: 'User' },
    currentRouteId: { type: Schema.Types.ObjectId, ref: 'Route' },
    currentLocation: {
      lat: Number,
      lng: Number,
      updatedAt: Date,
    },
  },
  { timestamps: true }
)

const Bus: Model<IBus> = mongoose.models.Bus ?? mongoose.model<IBus>('Bus', BusSchema)
export default Bus
