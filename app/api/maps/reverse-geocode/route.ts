import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rateLimit'
import { isLatLng, reverseGeocode } from '@/lib/maps/google-maps'

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rate = checkRateLimit(request, 'maps-reverse-geocode', { max: 60, windowMs: 60_000 })
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } }
    )
  }

  const lat = Number(request.nextUrl.searchParams.get('lat'))
  const lng = Number(request.nextUrl.searchParams.get('lng'))
  const location = { lat, lng }

  if (!isLatLng(location)) {
    return NextResponse.json({ error: 'lat and lng must be valid coordinates' }, { status: 400 })
  }

  try {
    const results = await reverseGeocode(location)
    return NextResponse.json({ success: true, data: results })
  } catch (error) {
    console.error('Google reverse geocode failed:', error)
    return NextResponse.json({ error: 'Failed to reverse geocode location' }, { status: 502 })
  }
}
