'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MapPin, Search, Calendar, Clock, DollarSign, ArrowRight, Bus, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface RouteResult {
  _id: string
  routeNumber: string
  name: string
  startPoint: string
  endPoint: string
  fare: number
  estimatedMinutes: number
  distanceKm: number
  stops: { name: string; order: number }[]
}

interface RecentBooking {
  _id: string
  routeId: { name: string; routeNumber: string } | null
  bookingDate: string
  boardingStop: string
  alightingStop: string
  fare: number
  seats: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  paymentStatus: 'pending' | 'paid' | 'refunded'
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  pending: 'warning',
  confirmed: 'success',
  cancelled: 'destructive',
  completed: 'secondary',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatMinutes(mins: number) {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default function PassengerHomePage() {
  const router = useRouter()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [date, setDate] = useState('')
  const [searching, setSearching] = useState(false)
  const [routes, setRoutes] = useState<RouteResult[]>([])
  const [searched, setSearched] = useState(false)
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [loadingBookings, setLoadingBookings] = useState(true)

  useEffect(() => {
    async function fetchRecent() {
      try {
        const res = await fetch('/api/passenger/bookings')
        if (!res.ok) return
        const data = await res.json()
        if (data.success) {
          setRecentBookings((data.data as RecentBooking[]).slice(0, 3))
        }
      } catch {
        // silent
      } finally {
        setLoadingBookings(false)
      }
    }
    fetchRecent()
  }, [])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!from.trim() && !to.trim()) {
      toast.error('Enter at least one search term')
      return
    }
    setSearching(true)
    setSearched(false)
    try {
      const params = new URLSearchParams()
      if (from.trim()) params.set('from', from.trim())
      if (to.trim()) params.set('to', to.trim())
      if (date) params.set('date', date)
      const res = await fetch(`/api/passenger/routes?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Search failed')
      setRoutes(data.data as RouteResult[])
      setSearched(true)
      if ((data.data as RouteResult[]).length === 0) {
        toast.info('No routes found for your search')
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  function handleBookNow(routeId: string) {
    const params = new URLSearchParams({ routeId })
    if (date) params.set('date', date)
    router.push(`/passenger/book?${params.toString()}`)
  }

  return (
    <div className="space-y-8">
      {/* Hero / Search */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Search size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Find a Route</h1>
            <p className="text-sm text-gray-500">Search available bus routes and book your seat</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="from">From</Label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  id="from"
                  placeholder="Departure stop or city"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to">To</Label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  id="to"
                  placeholder="Destination stop or city"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-9"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={searching} className="gap-2 min-w-[140px]">
              {searching ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Searching…
                </>
              ) : (
                <>
                  <Search size={16} />
                  Search Routes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Search results */}
      {searched && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {routes.length} Route{routes.length !== 1 ? 's' : ''} Found
          </h2>
          {routes.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
              <Bus size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No routes match your search</p>
              <p className="text-sm text-gray-400 mt-1">Try different locations or check back later</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {routes.map((route) => (
                <Card key={route._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs font-mono">
                            #{route.routeNumber}
                          </Badge>
                          <Badge variant="success" className="text-xs">Active</Badge>
                        </div>
                        <h3 className="font-semibold text-gray-900">{route.name}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {route.startPoint} → {route.endPoint}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xl font-bold text-blue-600">${route.fare.toFixed(2)}</p>
                        <p className="text-xs text-gray-400">per seat</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <span className="flex items-center gap-1">
                        <Clock size={13} />
                        {formatMinutes(route.estimatedMinutes)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={13} />
                        {route.distanceKm} km
                      </span>
                      {route.stops.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Bus size={13} />
                          {route.stops.length} stops
                        </span>
                      )}
                    </div>

                    <Button
                      onClick={() => handleBookNow(route._id)}
                      className="w-full gap-2"
                      size="sm"
                    >
                      Book Now
                      <ArrowRight size={14} />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Recent Bookings */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">My Recent Bookings</h2>
          {recentBookings.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => router.push('/passenger/bookings')}>
              View All
            </Button>
          )}
        </div>

        {loadingBookings ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : recentBookings.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No bookings yet</p>
            <p className="text-sm text-gray-400 mt-1">Search for a route above and book your first trip!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentBookings.map((booking) => (
              <div
                key={booking._id}
                className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Bus size={18} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {booking.routeId?.name ?? 'Unknown Route'}
                    {booking.routeId?.routeNumber && (
                      <span className="text-gray-400 text-sm font-normal ml-2">
                        #{booking.routeId.routeNumber}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDate(booking.bookingDate)} · {booking.boardingStop} → {booking.alightingStop}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 space-y-1">
                  <Badge variant={statusVariant[booking.status] ?? 'default'} className="capitalize">
                    {booking.status}
                  </Badge>
                  <p className="text-sm font-semibold text-gray-700">${booking.fare.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
