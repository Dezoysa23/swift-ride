import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Route from '@/lib/models/Route'

// Escape special regex characters to prevent ReDoS
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Public endpoint — no auth required
export async function GET(request: NextRequest) {
  await connectDB()

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.trim()
  const from = searchParams.get('from')?.trim()
  const to = searchParams.get('to')?.trim()

  // Validate input length to prevent abuse
  if ((search && search.length > 100) || (from && from.length > 100) || (to && to.length > 100)) {
    return NextResponse.json({ error: 'Search parameters too long' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = { status: 'active' }

  const conditions = []

  if (search) {
    const re = new RegExp(escapeRegex(search), 'i')
    conditions.push({
      $or: [
        { name: re },
        { routeNumber: re },
        { startPoint: re },
        { endPoint: re },
        { 'stops.name': re },
      ],
    })
  }

  if (from) {
    const re = new RegExp(escapeRegex(from), 'i')
    conditions.push({
      $or: [{ startPoint: re }, { endPoint: re }, { 'stops.name': re }],
    })
  }

  if (to) {
    const re = new RegExp(escapeRegex(to), 'i')
    conditions.push({
      $or: [{ startPoint: re }, { endPoint: re }, { 'stops.name': re }],
    })
  }

  if (conditions.length > 0) {
    query.$and = conditions
  }

  const routes = await Route.find(query).sort({ routeNumber: 1 }).lean()
  return NextResponse.json({ success: true, data: routes })
}
