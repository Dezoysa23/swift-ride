import dns from 'dns'
import mongoose from 'mongoose'

// The local network DNS does not forward SRV queries needed for mongodb+srv:// URIs.
// Overriding to Google's public DNS fixes the ECONNREFUSED querySrv error on this machine.
dns.setServers(['8.8.8.8', '8.8.4.4'])

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set')
}

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache
}

const cached: MongooseCache = global.mongoose ?? { conn: null, promise: null }
global.mongoose = cached

export async function connectDB() {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false, dbName: 'swiftride' })
  }

  cached.conn = await cached.promise
  return cached.conn
}

export async function getDb() {
  const conn = await connectDB()
  return conn.connection.db!
}

export async function getClient() {
  const conn = await connectDB()
  return conn.connection.getClient()
}
