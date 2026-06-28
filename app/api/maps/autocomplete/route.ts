import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rateLimit'
import { autocompletePlaces, isLatLng } from '@/lib/maps/google-maps'

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Generous cap — autocomplete fires per keystroke (frontend should debounce).
  const rate = checkRateLimit(request, 'maps-autocomplete', { max: 120, windowMs: 60_000 })
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const input = searchParams.get('input')?.trim()
  const sessionToken = searchParams.get('sessionToken')?.trim() || undefined
  if (!input || input.length < 2) {
    return NextResponse.json({ error: 'input must be at least 2 characters' }, { status: 400 })
  }
  if (input.length > 200) {
    return NextResponse.json({ error: 'input is too long' }, { status: 400 })
  }

  const lat = Number(searchParams.get('lat'))
  const lng = Number(searchParams.get('lng'))
  const origin = Number.isFinite(lat) || Number.isFinite(lng) ? { lat, lng } : undefined

  if (origin && !isLatLng(origin)) {
    return NextResponse.json({ error: 'lat and lng must be valid coordinates' }, { status: 400 })
  }

  try {
    const suggestions = await autocompletePlaces(input, origin, sessionToken)
    return NextResponse.json({ success: true, data: suggestions })
  } catch (error) {
    console.error('Google Places autocomplete failed:', error)
    return NextResponse.json({ error: 'Failed to fetch autocomplete suggestions' }, { status: 502 })
  }
}
