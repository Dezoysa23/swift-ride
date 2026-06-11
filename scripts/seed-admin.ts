/**
 * Run with:  npx tsx scripts/seed-admin.ts
 *
 * Creates the first admin user. Edit the values below before running.
 */
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const ADMIN = {
  name: 'Admin',
  email: 'admin@swiftride.com',
  password: 'Admin@123',   // ← change this
}

async function main() {
  if (!process.env.MONGODB_URI || process.env.MONGODB_URI.startsWith('PASTE')) {
    console.error('ERROR: Set MONGODB_URI in .env.local first')
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB')

  const { default: User } = await import('../lib/models/User')

  const existing = await User.findOne({ email: ADMIN.email })
  if (existing) {
    console.log(`Admin already exists: ${ADMIN.email}`)
    await mongoose.disconnect()
    return
  }

  await User.create({ ...ADMIN, role: 'admin' })
  console.log(`✓ Admin created: ${ADMIN.email} / password: ${ADMIN.password}`)
  await mongoose.disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
