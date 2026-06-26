'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Search, DollarSign, CheckCircle, XCircle, BookOpen } from 'lucide-react'

interface Booking {
  _id: string
  bookingDate: string
  passengerId: { name: string; email: string } | null
  routeId: { name: string; routeNumber: string } | null
  busId: { busNumber: string } | null
  seats: number
  fare: number
  status: string
  paymentStatus: string
}

function statusVariant(s: string) {
  if (s === 'confirmed' || s === 'completed') return 'success'
  if (s === 'pending') return 'warning'
  if (s === 'cancelled') return 'destructive'
  return 'outline'
}

function paymentVariant(s: string) {
  if (s === 'paid') return 'success'
  if (s === 'refunded') return 'secondary'
  return 'warning'
}

export default function ReportsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [loading, setLoading] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(today)
  const [statusFilter, setStatusFilter] = useState('all')

  async function loadReport() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/admin/reports/bookings?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed to load report'); return }
      setBookings(data.data ?? [])
      setTotalRevenue(data.totalRevenue ?? 0)
    } catch { toast.error('Failed to load report') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadReport() }, [])

  const completed = bookings.filter((b) => b.status === 'completed').length
  const cancelled = bookings.filter((b) => b.status === 'cancelled').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Booking and revenue reports</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={loadReport} disabled={loading}>
              <Search size={15} className="mr-2" />
              {loading ? 'Loading…' : 'Apply'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <BookOpen size={24} className="text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Bookings</p>
              <p className="text-2xl font-bold">{bookings.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <DollarSign size={24} className="text-teal" />
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">LKR {totalRevenue.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <CheckCircle size={24} className="text-teal" />
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">{completed}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <XCircle size={24} className="text-destructive" />
            <div>
              <p className="text-sm text-muted-foreground">Cancelled</p>
              <p className="text-2xl font-bold">{cancelled}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Bookings ({bookings.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Passenger</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Bus</TableHead>
                <TableHead>Seats</TableHead>
                <TableHead>Fare</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : bookings.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No bookings found</TableCell></TableRow>
              ) : (
                bookings.map((b) => (
                  <TableRow key={b._id}>
                    <TableCell className="text-xs">{new Date(b.bookingDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{b.passengerId?.name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{b.passengerId?.email}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {b.routeId ? `${b.routeId.routeNumber} — ${b.routeId.name}` : '—'}
                    </TableCell>
                    <TableCell className="text-xs">{b.busId?.busNumber ?? '—'}</TableCell>
                    <TableCell className="text-xs">{b.seats}</TableCell>
                    <TableCell className="text-xs">LKR {b.fare}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(b.status) as any}>
                        {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={paymentVariant(b.paymentStatus) as any}>
                        {b.paymentStatus.charAt(0).toUpperCase() + b.paymentStatus.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
