import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Route from '@/lib/models/Route'

// Escape special regex characters to prevent ReDoS
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'passenger') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')?.trim()
  const to = searchParams.get('to')?.trim()
  const routeId = searchParams.get('routeId')?.trim()

  // Validate input length to prevent abuse
  if ((from && from.length > 100) || (to && to.length > 100)) {
    return NextResponse.json({ error: 'Search parameters too long' }, { status: 400 })
  }

  const query: Record<string, any> = { status: 'active' }

  if (routeId) {
    // Return single route by ID (wrapped in array for consistency)
    const route = await Route.findOne({ _id: routeId, status: 'active' }).lean()
    if (!route) return NextResponse.json({ success: true, data: [] })
    return NextResponse.json({ success: true, data: [route] })
  }

  if (from || to) {
    const conditions = []
    if (from) {
      const re = new RegExp(escapeRegex(from), 'i')
      conditions.push({
        $or: [
          { startPoint: re },
          { endPoint: re },
          { 'stops.name': re },
        ],
      })
    }
    if (to) {
      const re = new RegExp(escapeRegex(to), 'i')
      conditions.push({
        $or: [
          { startPoint: re },
          { endPoint: re },
          { 'stops.name': re },
        ],
      })
    }
    if (conditions.length > 0) {
      query.$and = conditions
    }
  }

  const routes = await Route.find(query).sort({ routeNumber: 1 }).lean()
  return NextResponse.json({ success: true, data: routes })
}
