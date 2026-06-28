import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rateLimit'
import { geocodeAddress } from '@/lib/maps/google-maps'

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rate = checkRateLimit(request, 'maps-geocode', { max: 60, windowMs: 60_000 })
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } }
    )
  }

  const address = request.nextUrl.searchParams.get('address')?.trim()
  if (!address || address.length < 3) {
    return NextResponse.json({ error: 'address must be at least 3 characters' }, { status: 400 })
  }
  if (address.length > 300) {
    return NextResponse.json({ error: 'address is too long' }, { status: 400 })
  }

  try {
    const results = await geocodeAddress(address)
    return NextResponse.json({ success: true, data: results })
  } catch (error) {
    console.error('Google geocode failed:', error)
    return NextResponse.json({ error: 'Failed to geocode address' }, { status: 502 })
  }
}
