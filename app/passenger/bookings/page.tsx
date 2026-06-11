'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Calendar,
  Bus,
  MapPin,
  Users,
  DollarSign,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog'

interface Booking {
  _id: string
  routeId: { _id: string; name: string; routeNumber: string } | null
  busId: { _id: string; busNumber: string } | null
  bookingDate: string
  boardingStop: string
  alightingStop: string
  fare: number
  seats: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  paymentStatus: 'pending' | 'paid' | 'refunded'
  createdAt: string
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  pending: 'warning',
  confirmed: 'success',
  cancelled: 'destructive',
  completed: 'secondary',
}

const paymentVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  pending: 'warning',
  paid: 'success',
  refunded: 'outline',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function BookingCard({
  booking,
  onCancel,
}: {
  booking: Booking
  onCancel: (id: string) => void
}) {
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Bus size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {booking.routeId?.name ?? 'Unknown Route'}
            </p>
            {booking.routeId?.routeNumber && (
              <p className="text-xs text-gray-400 font-mono">Route #{booking.routeId.routeNumber}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <Badge variant={statusVariant[booking.status] ?? 'default'} className="capitalize">
            {booking.status}
          </Badge>
          <Badge variant={paymentVariant[booking.paymentStatus] ?? 'default'} className="capitalize text-xs">
            {booking.paymentStatus === 'paid' ? 'Paid' : booking.paymentStatus === 'refunded' ? 'Refunded' : 'Payment Pending'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="flex items-center gap-1.5 text-gray-600">
          <Calendar size={13} className="text-gray-400 flex-shrink-0" />
          <span>{formatDate(booking.bookingDate)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-600">
          <MapPin size={13} className="text-gray-400 flex-shrink-0" />
          <span className="truncate">
            {booking.boardingStop} → {booking.alightingStop}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-600">
          <Users size={13} className="text-gray-400 flex-shrink-0" />
          <span>
            {booking.seats} seat{booking.seats !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-600 font-semibold">
          <DollarSign size={13} className="text-gray-400 flex-shrink-0" />
          <span>${booking.fare.toFixed(2)}</span>
        </div>
      </div>

      {booking.busId && (
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <Bus size={11} />
          Bus: {booking.busId.busNumber}
        </p>
      )}

      {canCancel && (
        <div className="pt-1 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 gap-1.5"
            onClick={() => onCancel(booking._id)}
          >
            <X size={13} />
            Cancel Booking
          </Button>
        </div>
      )}
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
      <p className="text-gray-500 font-medium">No {label} bookings</p>
      <p className="text-sm text-gray-400 mt-1">Your {label.toLowerCase()} trips will appear here</p>
    </div>
  )
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/passenger/bookings')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch bookings')
      setBookings(data.data as Booking[])
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  async function handleConfirmCancel() {
    if (!cancelId) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/passenger/bookings/${cancelId}/cancel`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Cancellation failed')
      toast.success('Booking cancelled successfully')
      setCancelId(null)
      await fetchBookings()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Cancellation failed')
    } finally {
      setCancelling(false)
    }
  }

  const upcoming = bookings.filter((b) => b.status === 'pending' || b.status === 'confirmed')
  const completed = bookings.filter((b) => b.status === 'completed')
  const cancelled = bookings.filter((b) => b.status === 'cancelled')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
        <p className="text-gray-500 text-sm mt-1">Track and manage all your bus bookings</p>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="upcoming">
            Upcoming{upcoming.length > 0 && ` (${upcoming.length})`}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed{completed.length > 0 && ` (${completed.length})`}
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled{cancelled.length > 0 && ` (${cancelled.length})`}
          </TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-36 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <TabsContent value="upcoming" className="mt-4 space-y-3">
              {upcoming.length === 0 ? (
                <EmptyState label="Upcoming" />
              ) : (
                upcoming.map((b) => (
                  <BookingCard key={b._id} booking={b} onCancel={setCancelId} />
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-4 space-y-3">
              {completed.length === 0 ? (
                <EmptyState label="Completed" />
              ) : (
                completed.map((b) => (
                  <BookingCard key={b._id} booking={b} onCancel={setCancelId} />
                ))
              )}
            </TabsContent>

            <TabsContent value="cancelled" className="mt-4 space-y-3">
              {cancelled.length === 0 ? (
                <EmptyState label="Cancelled" />
              ) : (
                cancelled.map((b) => (
                  <BookingCard key={b._id} booking={b} onCancel={setCancelId} />
                ))
              )}
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Cancel confirmation dialog */}
      <Dialog open={!!cancelId} onOpenChange={(open) => !open && setCancelId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle size={20} />
              Cancel Booking
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" disabled={cancelling}>
                Keep Booking
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={cancelling}
              className="gap-2"
            >
              {cancelling && <Loader2 size={14} className="animate-spin" />}
              {cancelling ? 'Cancelling…' : 'Yes, Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
