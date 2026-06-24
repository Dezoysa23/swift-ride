'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Bus,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  LocationBookingFields,
  type BookingLocationDetails,
} from '@/components/passenger/location-booking-fields'

interface Stop {
  name: string
  order: number
}

interface RouteData {
  _id: string
  name: string
  routeNumber: string
  startPoint: string
  endPoint: string
  fare: number
  estimatedMinutes: number
  distanceKm: number
  stops: Stop[]
  status: string
}

function formatMinutes(mins: number) {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function BookPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const routeId = searchParams.get('routeId') ?? ''
  const preselectedDate = searchParams.get('date') ?? ''

  const [route, setRoute] = useState<RouteData | null>(null)
  const [loadingRoute, setLoadingRoute] = useState(true)

  // Form state
  const [bookingDate, setBookingDate] = useState(preselectedDate || new Date().toISOString().split('T')[0])
  const [boardingStop, setBoardingStop] = useState('')
  const [alightingStop, setAlightingStop] = useState('')
  const [seats, setSeats] = useState(1)
  const [locationDetails, setLocationDetails] = useState<BookingLocationDetails | null>(null)

  // Flow state
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form')
  const [bookingId, setBookingId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [totalFare, setTotalFare] = useState(0)

  const [submitting, setSubmitting] = useState(false)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    if (!routeId) {
      toast.error('No route selected')
      router.push('/passenger')
      return
    }
    async function fetchRoute() {
      try {
        const res = await fetch(`/api/passenger/routes?routeId=${routeId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load route')
        // The routes endpoint returns an array; find the matching one
        const list: RouteData[] = data.data
        const found = list.find((r) => r._id === routeId) ?? list[0] ?? null
        if (!found) throw new Error('Route not found')
        setRoute(found)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to load route')
        router.push('/passenger')
      } finally {
        setLoadingRoute(false)
      }
    }
    fetchRoute()
  }, [routeId, router])

  const fare = route ? route.fare * seats : 0

  async function handleSubmitBooking(e: React.FormEvent) {
    e.preventDefault()
    if (!boardingStop) { toast.error('Select boarding stop'); return }
    if (!alightingStop) { toast.error('Select alighting stop'); return }
    if (boardingStop === alightingStop) { toast.error('Boarding and alighting stops must be different'); return }

    setSubmitting(true)
    try {
      // Step 1: Create booking
      const bookRes = await fetch('/api/passenger/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeId,
          bookingDate,
          boardingStop,
          alightingStop,
          seats,
          locationDetails,
        }),
      })
      const bookData = await bookRes.json()
      if (!bookRes.ok) throw new Error(bookData.error || 'Failed to create booking')

      const newBookingId: string = bookData.data._id
      setBookingId(newBookingId)
      setTotalFare(bookData.data.fare)

      // Step 2: Create payment intent
      const payRes = await fetch('/api/passenger/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: newBookingId }),
      })
      const payData = await payRes.json()
      if (!payRes.ok) throw new Error(payData.error || 'Failed to initialize payment')

      setClientSecret(payData.clientSecret)
      setStep('payment')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Booking failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirmPayment() {
    setPaying(true)
    try {
      // Mock payment confirmation: call the webhook-equivalent by updating booking directly via a
      // dedicated confirm endpoint. For real Stripe.js, this would use confirmCardPayment.
      // Here we simulate success by marking payment via the payment endpoint with a confirm flag.
      const res = await fetch('/api/passenger/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, confirmPayment: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Payment confirmation failed')

      setStep('success')
      toast.success('Payment confirmed! Booking is active.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setPaying(false)
    }
  }

  if (loadingRoute) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!route) return null

  const sortedStops = [...route.stops].sort((a, b) => a.order - b.order)

  if (step === 'success') {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardContent className="p-10 text-center">
            <CheckCircle2 size={56} className="mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
            <p className="text-gray-500 mb-6">
              Your seat on <strong>{route.name}</strong> has been booked and payment confirmed.
            </p>
            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Route</span>
                <span className="font-medium">{route.routeNumber} – {route.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="font-medium">{new Date(bookingDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Stops</span>
                <span className="font-medium">{boardingStop} → {alightingStop}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Seats</span>
                <span className="font-medium">{seats}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total Paid</span>
                <span className="text-blue-600">Rs. {totalFare.toFixed(2)}</span>
              </div>
            </div>
            <Button onClick={() => router.push('/passenger/bookings')} className="w-full gap-2">
              View My Bookings
              <ArrowRight size={14} />
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Book Your Trip</h1>
        <p className="text-sm text-gray-500 mt-1">Fill in your journey details below</p>
      </div>

      {/* Route Info Card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Bus size={18} className="text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Badge variant="outline" className="text-xs font-mono">#{route.routeNumber}</Badge>
                </div>
                <h2 className="font-semibold text-gray-900">{route.name}</h2>
                <p className="text-sm text-gray-500">{route.startPoint} → {route.endPoint}</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-bold text-blue-600">Rs. {route.fare.toFixed(2)}</p>
              <p className="text-xs text-gray-400">per seat</p>
            </div>
          </div>
          <div className="flex gap-4 mt-3 text-sm text-gray-500">
            <span className="flex items-center gap-1"><Clock size={13} />{formatMinutes(route.estimatedMinutes)}</span>
            <span className="flex items-center gap-1"><MapPin size={13} />{route.distanceKm} km</span>
          </div>
        </CardContent>
      </Card>

      {/* Booking Form / Payment Step */}
      {step === 'form' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Journey Details</CardTitle>
            <CardDescription>Select your travel date and stops</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitBooking} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="bookingDate">Travel Date</Label>
                <div className="relative">
                  <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="bookingDate"
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Boarding Stop</Label>
                  <Select value={boardingStop} onValueChange={setBoardingStop}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stop" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedStops.map((stop) => (
                        <SelectItem key={stop.order} value={stop.name}>
                          {stop.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Alighting Stop</Label>
                  <Select value={alightingStop} onValueChange={setAlightingStop}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stop" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedStops.map((stop) => (
                        <SelectItem key={stop.order} value={stop.name}>
                          {stop.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <LocationBookingFields onChange={setLocationDetails} />

              <div className="space-y-1.5">
                <Label htmlFor="seats">Number of Seats</Label>
                <div className="relative">
                  <Users size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="seats"
                    type="number"
                    min={1}
                    max={4}
                    value={seats}
                    onChange={(e) => setSeats(Math.min(4, Math.max(1, Number(e.target.value))))}
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-gray-400">Maximum 4 seats per booking</p>
              </div>

              {/* Fare Summary */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                <h3 className="font-medium text-gray-900 text-sm">Fare Summary</h3>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Rs. {route.fare.toFixed(2)} × {seats} seat{seats !== 1 ? 's' : ''}</span>
                  <span>Rs. {fare.toFixed(2)}</span>
                </div>
                {locationDetails && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Route estimate</span>
                    <span>Rs. {locationDetails.estimatedPrice.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-blue-600 text-lg">Rs. {fare.toFixed(2)}</span>
                </div>
              </div>

              <Button type="submit" disabled={submitting} className="w-full gap-2">
                {submitting ? (
                  <><Loader2 size={14} className="animate-spin" />Processing…</>
                ) : (
                  <>Proceed to Payment <ArrowRight size={14} /></>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 'payment' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Confirm Payment</CardTitle>
            <CardDescription>Review your booking and confirm payment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="font-medium">{new Date(bookingDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Boarding</span>
                <span className="font-medium">{boardingStop}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Alighting</span>
                <span className="font-medium">{alightingStop}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Seats</span>
                <span className="font-medium">{seats}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Amount Due</span>
                <span className="text-blue-600 text-base">Rs. {(totalFare || fare).toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              <strong>Demo Mode:</strong> Real Stripe.js card input will be integrated here. Click
              "Confirm Payment" to simulate a successful payment.
            </div>

            {clientSecret && (
              <p className="text-xs text-gray-400 font-mono break-all">
                Payment Intent: {clientSecret.split('_secret')[0]}…
              </p>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('form')}
                disabled={paying}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleConfirmPayment}
                disabled={paying}
                className="flex-1 gap-2"
              >
                {paying ? (
                  <><Loader2 size={14} className="animate-spin" />Processing…</>
                ) : (
                  <><DollarSign size={14} />Confirm Payment</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function BookPage() {
  return (
    <Suspense fallback={
      <div className="max-w-xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    }>
      <BookPageInner />
    </Suspense>
  )
}
