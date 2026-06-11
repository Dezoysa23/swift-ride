import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ITurn extends Document {
  driverId: mongoose.Types.ObjectId
  busId: mongoose.Types.ObjectId
  routeId: mongoose.Types.ObjectId
  scheduledDate: Date
  startTime?: Date
  endTime?: Date
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  passengerCount: number
  notes?: string
}

const TurnSchema = new Schema<ITurn>(
  {
    driverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    busId: { type: Schema.Types.ObjectId, ref: 'Bus', required: true },
    routeId: { type: Schema.Types.ObjectId, ref: 'Route', required: true },
    scheduledDate: { type: Date, required: true },
    startTime: Date,
    endTime: Date,
    status: {
      type: String,
      enum: ['scheduled', 'active', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    passengerCount: { type: Number, default: 0 },
    notes: String,
  },
  { timestamps: true }
)

const Turn: Model<ITurn> = mongoose.models.Turn ?? mongoose.model<ITurn>('Turn', TurnSchema)
export default Turn
