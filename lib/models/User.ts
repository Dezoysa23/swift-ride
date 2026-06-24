import mongoose, { Schema, Document, Model } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IUser extends Document {
  name: string
  email: string
  password: string
  role: 'admin' | 'driver' | 'passenger'
  phone?: string
  avatar?: string
  isActive: boolean
  // Driver fields
  licenseNumber?: string
  assignedBusId?: mongoose.Types.ObjectId
  assignedRouteId?: mongoose.Types.ObjectId
  status?: 'available' | 'on_duty' | 'off_duty'
  // Passenger fields
  walletBalance: number
  // Password reset — TODO: replace console logging with SMTP email (Option A) in a future update
  resetToken?: string
  resetTokenExpiry?: Date
  comparePassword(candidate: string): Promise<boolean>
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8 },
    role: { type: String, enum: ['admin', 'driver', 'passenger'], required: true },
    phone: { type: String, trim: true },
    avatar: { type: String },
    isActive: { type: Boolean, default: true },
    licenseNumber: { type: String },
    assignedBusId: { type: Schema.Types.ObjectId, ref: 'Bus' },
    assignedRouteId: { type: Schema.Types.ObjectId, ref: 'Route' },
    status: { type: String, enum: ['available', 'on_duty', 'off_duty'] },
    walletBalance: { type: Number, default: 0 },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
  },
  { timestamps: true }
)

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

UserSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password)
}

UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (ret as unknown as Record<string, unknown>).password
    return ret
  },
})

const User: Model<IUser> = mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema)
export default User
