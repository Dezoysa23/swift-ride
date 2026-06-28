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
  // Email verification (only set on new self-registrations; absent on legacy users = treated as verified)
  emailVerified?: boolean
  emailVerifiedAt?: Date
  verificationCode?: string // sha256 hash of the 6-digit code
  verificationCodeExpiry?: Date
  verificationAttempts?: number
  lastVerificationEmailSentAt?: Date
  // Password reset
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
    // No default on emailVerified: legacy users (field absent) must NOT be treated as unverified.
    emailVerified: { type: Boolean },
    emailVerifiedAt: { type: Date },
    verificationCode: { type: String },
    verificationCodeExpiry: { type: Date },
    verificationAttempts: { type: Number, default: 0 },
    lastVerificationEmailSentAt: { type: Date },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
  },
  { timestamps: true }
)

// Indexes for common query patterns (email already indexed via `unique: true`).
UserSchema.index({ role: 1 })
UserSchema.index({ resetToken: 1 }, { sparse: true })

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
    const r = ret as unknown as Record<string, unknown>
    delete r.password
    delete r.verificationCode
    delete r.resetToken
    return ret
  },
})

const User: Model<IUser> = mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema)
export default User
