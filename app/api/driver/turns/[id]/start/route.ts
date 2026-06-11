import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Turn from '@/lib/models/Turn'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'driver') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()

  const { id } = await params

  const turn = await Turn.findOne({ _id: id, driverId: auth.id })
  if (!turn) {
    return NextResponse.json({ error: 'Turn not found' }, { status: 404 })
  }

  if (turn.status !== 'scheduled') {
    return NextResponse.json(
      { error: `Cannot start a turn with status "${turn.status}"` },
      { status: 409 }
    )
  }

  turn.status = 'active'
  turn.startTime = new Date()
  await turn.save()

  const populated = await Turn.findById(turn._id)
    .populate('routeId', 'name routeNumber')
    .populate('busId', 'busNumber')
    .lean()

  return NextResponse.json({ success: true, data: populated })
}
