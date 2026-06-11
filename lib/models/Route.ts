import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IStop {
  name: string
  order: number
  lat?: number
  lng?: number
}

export interface IRoute extends Document {
  name: string
  routeNumber: string
  startPoint: string
  endPoint: string
  stops: IStop[]
  distanceKm: number
  estimatedMinutes: number
  fare: number
  status: 'active' | 'inactive'
  assignedBusIds: mongoose.Types.ObjectId[]
}

const StopSchema = new Schema<IStop>(
  {
    name: { type: String, required: true },
    order: { type: Number, required: true },
    lat: Number,
    lng: Number,
  },
  { _id: false }
)

const RouteSchema = new Schema<IRoute>(
  {
    name: { type: String, required: true },
    routeNumber: { type: String, required: true, unique: true },
    startPoint: { type: String, required: true },
    endPoint: { type: String, required: true },
    stops: [StopSchema],
    distanceKm: { type: Number, default: 0 },
    estimatedMinutes: { type: Number, default: 0 },
    fare: { type: Number, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    assignedBusIds: [{ type: Schema.Types.ObjectId, ref: 'Bus' }],
  },
  { timestamps: true }
)

const Route: Model<IRoute> = mongoose.models.Route ?? mongoose.model<IRoute>('Route', RouteSchema)
export default Route
