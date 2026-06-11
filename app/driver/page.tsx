import { getCurrentUser } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import Bus from '@/lib/models/Bus'
import Turn from '@/lib/models/Turn'
import Route from '@/lib/models/Route'
import { redirect } from 'next/navigation'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bus as BusIcon, MapPin, Clock, Users, CalendarDays, CheckCircle2, Navigation } from 'lucide-react'

export default async function DriverDashboardPage() {
  const auth = await getCurrentUser()
  if (!auth || auth.role !== 'driver') redirect('/auth/login')

  await connectDB()

  const driver = await User.findById(auth.id).populate('assignedBusId').lean()
  if (!driver) redirect('/auth/login')

  const bus = driver.assignedBusId as typeof driver.assignedBusId & {
    busNumber?: string
    plateNumber?: string
    model?: string
    year?: number
    capacity?: number
    status?: string
    currentRouteId?: unknown
  } | null

  // Today's date range
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  // Month start
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  // Active turn
  const activeTurn = await Turn.findOne({
    driverId: auth.id,
    status: 'active',
  })
    .populate('routeId')
    .populate('busId')
    .lean()

  // Today's turns
  const todayTurns = await Turn.find({
    driverId: auth.id,
    scheduledDate: { $gte: todayStart, $lte: todayEnd },
  }).lean()

  // Passengers today
  const passengersToday = todayTurns.reduce((sum, t) => sum + (t.passengerCount || 0), 0)

  // Total trips this month
  const monthlyTurns = await Turn.countDocuments({
    driverId: auth.id,
    scheduledDate: { $gte: monthStart },
    status: { $in: ['completed', 'active'] },
  })

  // Next 3 upcoming turns
  const upcomingTurns = await Turn.find({
    driverId: auth.id,
    status: 'scheduled',
    scheduledDate: { $gte: new Date() },
  })
    .sort({ scheduledDate: 1 })
    .limit(3)
    .populate('routeId')
    .populate('busId')
    .lean()

  function formatTime(date?: Date | string | null) {
    if (!date) return '—'
    return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(date?: Date | string | null) {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const route = activeTurn?.routeId as { name?: string; routeNumber?: string } | null
  const activeBus = activeTurn?.busId as { busNumber?: string } | null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Driver Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {driver.name}</p>
      </div>

      {/* Duty status banner */}
      {activeTurn ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="text-green-600" size={22} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-green-800 text-base">Currently On Duty</span>
              <Badge className="bg-green-600 text-white text-xs">ACTIVE</Badge>
            </div>
            <div className="text-sm text-green-700 space-y-0.5">
              <p>
                <span className="font-medium">Route:</span>{' '}
                {route?.routeNumber ? `${route.routeNumber} — ` : ''}
                {route?.name || 'N/A'}
              </p>
              <p>
                <span className="font-medium">Bus:</span> {activeBus?.busNumber || 'N/A'}
              </p>
              <p>
                <span className="font-medium">Started:</span>{' '}
                {formatTime(activeTurn.startTime as unknown as string)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-100 border border-gray-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            <Navigation className="text-gray-400" size={22} />
          </div>
          <div>
            <p className="font-semibold text-gray-700">Currently Off Duty</p>
            <p className="text-sm text-gray-500">Go to Profile → Duty tab to start your shift</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <CalendarDays className="text-blue-600" size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{todayTurns.length}</p>
              <p className="text-sm text-gray-500">Turns Today</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
              <Users className="text-purple-600" size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{passengersToday}</p>
              <p className="text-sm text-gray-500">Passengers Today</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="text-green-600" size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{monthlyTurns}</p>
              <p className="text-sm text-gray-500">Trips This Month</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Bus */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BusIcon size={16} className="text-blue-600" />
              Assigned Bus
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bus && typeof bus === 'object' && 'busNumber' in bus ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900">{bus.busNumber}</span>
                  <Badge
                    variant={
                      bus.status === 'active'
                        ? 'success'
                        : bus.status === 'maintenance'
                        ? 'warning'
                        : 'secondary'
                    }
                    className="capitalize"
                  >
                    {bus.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Plate</p>
                    <p className="font-medium">{bus.plateNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Model</p>
                    <p className="font-medium">{bus.model} {bus.year}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Capacity</p>
                    <p className="font-medium">{bus.capacity} seats</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No bus assigned</p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Turns */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock size={16} className="text-blue-600" />
              Upcoming Turns
            </CardTitle>
            <CardDescription>Next 3 scheduled turns</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingTurns.length === 0 ? (
              <p className="text-gray-500 text-sm">No upcoming turns scheduled</p>
            ) : (
              <div className="space-y-3">
                {upcomingTurns.map((turn) => {
                  const r = turn.routeId as { name?: string; routeNumber?: string } | null
                  const b = turn.busId as { busNumber?: string } | null
                  return (
                    <div
                      key={String(turn._id)}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <MapPin size={14} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {r?.routeNumber ? `${r.routeNumber} — ` : ''}{r?.name || 'Route'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(turn.scheduledDate as unknown as string)} · Bus{' '}
                          {b?.busNumber || 'N/A'}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        Scheduled
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
