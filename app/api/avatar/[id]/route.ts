import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const { id } = await params

  // Only allow users to see their own avatar, or admins can see anyone's
  if (auth.id !== id && auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const user = await User.findById(id).select('avatar').lean()
  if (!user || !user.avatar) {
    return NextResponse.json({ error: 'Avatar not found' }, { status: 404 })
  }

  const avatar: string = user.avatar

  // If the avatar is a URL (http/https), redirect to it
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return NextResponse.redirect(avatar)
  }

  // If it's base64 data URI, extract content type and binary
  if (avatar.startsWith('data:')) {
    const [header, data] = avatar.split(',')
    const mimeMatch = header.match(/data:([^;]+)/)
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg'
    const buffer = Buffer.from(data, 'base64')
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }

  // Treat as raw base64 (jpeg assumed)
  try {
    const buffer = Buffer.from(avatar, 'base64')
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Invalid avatar data' }, { status: 500 })
  }
}
