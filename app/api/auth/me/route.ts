import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const user = await User.findById(auth.id).select(
    '-password -verificationCode -verificationCodeExpiry -verificationAttempts -resetToken -resetTokenExpiry'
  )
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({ user })
}
