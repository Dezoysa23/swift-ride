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
import { Eyebrow } from '@/components/ui/eyebrow'
import { GlowBlob } from '@/components/ui/glow-blob'
import { StatCounter } from '@/components/ui/stat-counter'
import { TiltCard } from '@/components/ui/tilt-card'
import { Bus3D } from '@/components/ui/bus-3d'
import { cn } from '@/lib/utils'
import { Bus as BusIcon, MapPin, Clock, Users, CalendarDays, CheckCircle2 } from 'lucide-react'

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

  const stats = [
    { label: 'Turns Today', value: todayTurns.length, icon: CalendarDays, bg: 'bg-coral/15', fg: 'text-coral' },
    { label: 'Passengers Today', value: passengersToday, icon: Users, bg: 'bg-teal/15', fg: 'text-teal' },
    { label: 'Trips This Month', value: monthlyTurns, icon: CheckCircle2, bg: 'bg-gold/20', fg: 'text-gold' },
  ]

  return (
    <div className="space-y-6">
      {/* Hero with 3D bus */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-[#0e2730] text-white shadow-soft">
        <GlowBlob tone="coral" size={360} className="-left-16 -top-24 !opacity-40" />
        <GlowBlob tone="teal" size={320} className="-bottom-28 right-8 !opacity-30" />
        <div className="relative z-10 grid gap-2 p-6 sm:p-8 md:grid-cols-2 md:items-center">
          <div>
            <Eyebrow tone="gold">Driver · Cockpit</Eyebrow>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
              Welcome back, {driver.name.split(' ')[0]}
            </h1>
            <p className="mt-1 text-sm text-white/60">Here&apos;s your shift at a glance.</p>

            {activeTurn ? (
              <>
                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-teal/15 px-3 py-1.5 text-sm font-semibold text-teal">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-70" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal" />
                  </span>
                  On duty · {route?.routeNumber ? `${route.routeNumber} — ` : ''}{route?.name || 'Active route'}
                </div>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-white/70">
                  <span><span className="text-white/40">Bus</span> {activeBus?.busNumber || 'N/A'}</span>
                  <span><span className="text-white/40">Started</span> {formatTime(activeTurn.startTime as unknown as string)}</span>
                </div>
              </>
            ) : (
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white/70">
                <span className="h-2.5 w-2.5 rounded-full bg-white/40" />
                Off duty — start your shift in Profile
              </div>
            )}
          </div>

          <div className="relative h-48 sm:h-56 md:h-64">
            <Bus3D />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, bg, fg }) => (
          <TiltCard key={label}>
            <Card interactive>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={cn('grid h-11 w-11 flex-shrink-0 place-items-center rounded-lg', bg, fg)}>
                  <Icon size={22} />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-foreground">
                    <StatCounter value={value} />
                  </p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          </TiltCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Bus */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BusIcon size={16} className="text-primary" />
              Assigned Bus
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bus && typeof bus === 'object' && 'busNumber' in bus ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-foreground">{bus.busNumber}</span>
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
                    <p className="text-muted-foreground">Plate</p>
                    <p className="font-medium">{bus.plateNumber}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Model</p>
                    <p className="font-medium">{bus.model} {bus.year}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Capacity</p>
                    <p className="font-medium">{bus.capacity} seats</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No bus assigned</p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Turns */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock size={16} className="text-primary" />
              Upcoming Turns
            </CardTitle>
            <CardDescription>Next 3 scheduled turns</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingTurns.length === 0 ? (
              <p className="text-muted-foreground text-sm">No upcoming turns scheduled</p>
            ) : (
              <div className="space-y-3">
                {upcomingTurns.map((turn) => {
                  const r = turn.routeId as { name?: string; routeNumber?: string } | null
                  const b = turn.busId as { busNumber?: string } | null
                  return (
                    <div
                      key={String(turn._id)}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted border border-border"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <MapPin size={14} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {r?.routeNumber ? `${r.routeNumber} — ` : ''}{r?.name || 'Route'}
                        </p>
                        <p className="text-xs text-muted-foreground">
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
