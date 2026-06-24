import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { geocodeAddress } from '@/lib/maps/google-maps'

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const address = request.nextUrl.searchParams.get('address')?.trim()
  if (!address || address.length < 3) {
    return NextResponse.json({ error: 'address must be at least 3 characters' }, { status: 400 })
  }

  try {
    const results = await geocodeAddress(address)
    return NextResponse.json({ success: true, data: results })
  } catch (error) {
    console.error('Google geocode failed:', error)
    return NextResponse.json({ error: 'Failed to geocode address' }, { status: 502 })
  }
}
