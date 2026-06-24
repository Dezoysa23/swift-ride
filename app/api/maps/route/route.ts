import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { computeDrivingRoute, isLatLng } from '@/lib/maps/google-maps'

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { origin, destination } = body as { origin?: unknown; destination?: unknown }
  if (!isLatLng(origin) || !isLatLng(destination)) {
    return NextResponse.json(
      { error: 'origin and destination must be { lat, lng } coordinates' },
      { status: 400 }
    )
  }

  try {
    const route = await computeDrivingRoute(origin, destination)
    return NextResponse.json({ success: true, data: route })
  } catch (error) {
    console.error('Google route calculation failed:', error)
    return NextResponse.json({ error: 'Failed to calculate route' }, { status: 502 })
  }
}
