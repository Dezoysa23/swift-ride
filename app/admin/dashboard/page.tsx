import { connectDB } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Bus from '@/lib/models/Bus'
import User from '@/lib/models/User'
import Route from '@/lib/models/Route'
import Booking, { IBooking } from '@/lib/models/Booking'
import Turn, { ITurn } from '@/lib/models/Turn'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Bus as BusIcon, Users, Map, CalendarCheck } from 'lucide-react'
import { Eyebrow } from '@/components/ui/eyebrow'
import { StatCounter } from '@/components/ui/stat-counter'
import { TiltCard } from '@/components/ui/tilt-card'
import { cn } from '@/lib/utils'

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
    active: 'success',
    confirmed: 'success',
    completed: 'default',
    pending: 'warning',
    cancelled: 'destructive',
    scheduled: 'secondary',
    inactive: 'secondary',
    maintenance: 'warning',
  }
  return (
    <Badge variant={variants[status] ?? 'outline'}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

interface PopulatedBooking {
  _id: string
  bookingDate: Date
  passengerId: { name: string } | null
  routeId: { name: string; routeNumber: string } | null
  fare: number
  status: string
}

interface PopulatedTurn {
  _id: string
  scheduledDate: Date
  driverId: { name: string } | null
  routeId: { name: string } | null
  busId: { busNumber: string } | null
  status: string
}

export default async function AdminDashboardPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') redirect('/auth/login')

  await connectDB()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const [
    totalBuses,
    activeBuses,
    totalDrivers,
    activeDrivers,
    totalRoutes,
    activeRoutes,
    todayBookingsCount,
    recentBookings,
    recentTurns,
  ] = await Promise.all([
    Bus.countDocuments(),
    Bus.countDocuments({ status: 'active' }),
    User.countDocuments({ role: 'driver' }),
    User.countDocuments({ role: 'driver', isActive: true }),
    Route.countDocuments(),
    Route.countDocuments({ status: 'active' }),
    Booking.countDocuments({ bookingDate: { $gte: today, $lte: todayEnd } }),
    Booking.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('passengerId', 'name')
      .populate('routeId', 'name routeNumber')
      .lean() as unknown as PopulatedBooking[],
    Turn.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('driverId', 'name')
      .populate('routeId', 'name')
      .populate('busId', 'busNumber')
      .lean() as unknown as PopulatedTurn[],
  ])

  const stats = [
    { title: 'Total Buses', value: totalBuses, sub: `${activeBuses} active`, icon: BusIcon, tone: 'text-coral', toneBg: 'bg-coral/15' },
    { title: 'Active Drivers', value: activeDrivers, sub: `${totalDrivers} total`, icon: Users, tone: 'text-teal', toneBg: 'bg-teal/15' },
    { title: 'Active Routes', value: activeRoutes, sub: `${totalRoutes} total`, icon: Map, tone: 'text-gold', toneBg: 'bg-gold/20' },
    { title: "Today's Bookings", value: todayBookingsCount, sub: 'bookings today', icon: CalendarCheck, tone: 'text-coral', toneBg: 'bg-coral/15' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow tone="teal">Admin · Overview</Eyebrow>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Welcome back, {user.name}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <TiltCard key={stat.title}>
              <Card interactive className="h-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="mt-1 font-display text-3xl font-bold text-foreground">
                      <StatCounter value={stat.value} />
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
                  </div>
                  <div className={cn('grid h-12 w-12 place-items-center rounded-xl', stat.toneBg, stat.tone)}>
                    <Icon size={22} />
                  </div>
                </div>
              </CardContent>
              </Card>
            </TiltCard>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Passenger</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Fare</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      No bookings yet
                    </TableCell>
                  </TableRow>
                ) : (
                  recentBookings.map((b) => (
                    <TableRow key={String(b._id)}>
                      <TableCell className="text-xs">
                        {b.bookingDate ? new Date(b.bookingDate).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="text-xs">{b.passengerId?.name ?? '—'}</TableCell>
                      <TableCell className="text-xs">
                        {b.routeId ? [b.routeId.routeNumber, b.routeId.name].filter(Boolean).join(' ') : '—'}
                      </TableCell>
                      <TableCell className="text-xs">{b.fare != null ? `LKR ${b.fare}` : '—'}</TableCell>
                      <TableCell>
                        <StatusBadge status={b.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Turns */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Turns</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Bus</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTurns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      No turns yet
                    </TableCell>
                  </TableRow>
                ) : (
                  recentTurns.map((t) => (
                    <TableRow key={String(t._id)}>
                      <TableCell className="text-xs">{t.driverId?.name ?? '—'}</TableCell>
                      <TableCell className="text-xs">{t.routeId?.name ?? '—'}</TableCell>
                      <TableCell className="text-xs">{t.busId?.busNumber ?? '—'}</TableCell>
                      <TableCell className="text-xs">
                        {t.scheduledDate ? new Date(t.scheduledDate).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={t.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
