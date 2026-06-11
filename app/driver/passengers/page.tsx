'use client'

import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Users, UserCheck, RefreshCw, Navigation } from 'lucide-react'

interface Passenger {
  _id: string
  passengerId: {
    _id: string
    name: string
    phone?: string
    email: string
  }
  boardingStop: string
  alightingStop: string
  fare: number
  seats: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  paymentStatus: 'pending' | 'paid' | 'refunded'
}

export default function DriverPassengersPage() {
  const [passengers, setPassengers] = useState<Passenger[]>([])
  const [loading, setLoading] = useState(true)
  const [noActiveTurn, setNoActiveTurn] = useState(false)
  const [boardingId, setBoardingId] = useState<string | null>(null)

  useEffect(() => {
    loadPassengers()
  }, [])

  async function loadPassengers() {
    setLoading(true)
    setNoActiveTurn(false)
    try {
      const r = await fetch('/api/driver/passengers')
      const d = await r.json()
      if (d.success) {
        setPassengers(d.data || [])
        if (d.noActiveTurn) setNoActiveTurn(true)
      } else {
        toast.error(d.error || 'Failed to load passengers')
      }
    } catch {
      toast.error('Failed to load passengers')
    } finally {
      setLoading(false)
    }
  }

  async function markBoarded(bookingId: string) {
    setBoardingId(bookingId)
    try {
      const r = await fetch(`/api/driver/passengers/${bookingId}/boarding`, { method: 'POST' })
      const d = await r.json()
      if (d.success) {
        toast.success('Passenger marked as boarded')
        setPassengers((prev) =>
          prev.map((p) => (p._id === bookingId ? { ...p, status: 'confirmed' } : p))
        )
      } else {
        toast.error(d.error || 'Failed to update boarding status')
      }
    } catch {
      toast.error('Failed to update boarding status')
    } finally {
      setBoardingId(null)
    }
  }

  const statusVariant = {
    pending: 'warning',
    confirmed: 'success',
    cancelled: 'destructive',
    completed: 'secondary',
  } as const

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Passengers</h1>
          <p className="text-gray-500 text-sm mt-1">Current turn passenger list</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadPassengers}>
          <RefreshCw size={14} className="mr-1.5" />
          Refresh
        </Button>
      </div>

      {noActiveTurn || passengers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            {noActiveTurn ? (
              <>
                <Navigation className="text-gray-300 mb-3" size={44} />
                <p className="text-gray-600 font-semibold text-base">No active turn</p>
                <p className="text-gray-400 text-sm mt-1">
                  Start your duty from the Profile → Duty tab to see passengers
                </p>
              </>
            ) : (
              <>
                <Users className="text-gray-300 mb-3" size={44} />
                <p className="text-gray-600 font-semibold text-base">No passengers yet</p>
                <p className="text-gray-400 text-sm mt-1">
                  No bookings found for the current turn
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users size={16} className="text-blue-600" />
              Passenger List
            </CardTitle>
            <CardDescription>
              {passengers.length} passenger{passengers.length !== 1 ? 's' : ''} booked for this
              turn
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Passenger</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Boarding</TableHead>
                    <TableHead>Alighting</TableHead>
                    <TableHead>Fare</TableHead>
                    <TableHead>Seats</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {passengers.map((p) => (
                    <TableRow key={p._id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {p.passengerId?.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-400">{p.passengerId?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {p.passengerId?.phone || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">{p.boardingStop}</TableCell>
                      <TableCell className="text-sm text-gray-700">{p.alightingStop}</TableCell>
                      <TableCell className="text-sm font-medium text-gray-900">
                        ${p.fare.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">{p.seats}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[p.status]} className="capitalize text-xs">
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {p.status === 'pending' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markBoarded(p._id)}
                            disabled={boardingId === p._id}
                            className="text-xs h-7"
                          >
                            <UserCheck size={12} className="mr-1" />
                            {boardingId === p._id ? 'Marking…' : 'Mark Boarded'}
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
