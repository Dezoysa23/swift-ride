import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, clearAuthCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  await clearAuthCookie()
  return NextResponse.json({ success: true })
}
