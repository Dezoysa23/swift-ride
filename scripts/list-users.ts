/**
 * Read-only: list all users with safe (non-sensitive) fields.
 * Run with:  npx tsx scripts/list-users.ts
 */
import mongoose from 'mongoose'
import dns from 'dns'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
// Match the app's DNS override so mongodb+srv:// SRV lookups resolve on this network.
dns.setServers(['8.8.8.8', '8.8.4.4'])

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI is not set in .env.local')
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'swiftride' })
  const { default: User } = await import('../lib/models/User')

  const users = await User.find({})
    .select('-password -verificationCode -resetToken -resetTokenExpiry -verificationCodeExpiry')
    .sort({ createdAt: 1 })
    .lean()

  console.log(`\nTotal users: ${users.length}\n`)

  const rows = users.map((u: Record<string, unknown>) => ({
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    emailVerified: u.emailVerified ?? '(legacy/undef)',
    phone: u.phone ?? '',
    wallet: u.walletBalance ?? 0,
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString().slice(0, 10) : '',
    id: String(u._id),
  }))

  console.table(rows)
  await mongoose.disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
