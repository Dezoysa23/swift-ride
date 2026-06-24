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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Bus, MapPin, Navigation, RefreshCw } from 'lucide-react'

interface BusData {
  _id: string
  busNumber: string
  plateNumber: string
  model: string
  year: number
  capacity: number
  status: 'active' | 'inactive' | 'maintenance'
  currentRouteId?: {
    _id: string
    name: string
    routeNumber: string
  } | null
  currentLocation?: {
    lat: number
    lng: number
    updatedAt: string
  } | null
}

export default function DriverBusPage() {
  const [bus, setBus] = useState<BusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [updating, setUpdating] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)

  useEffect(() => {
    loadBus()
  }, [])

  async function loadBus() {
    setLoading(true)
    try {
      const r = await fetch('/api/driver/buses')
      const d = await r.json()
      if (d.success) {
        setBus(d.data)
        if (d.data?.currentLocation) {
          setLat(String(d.data.currentLocation.lat))
          setLng(String(d.data.currentLocation.lng))
        }
      } else {
        setError(d.error || 'Failed to load bus')
      }
    } catch {
      setError('Failed to load bus')
    } finally {
      setLoading(false)
    }
  }

  function getGPSLocation() {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by your browser')
      return
    }
    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6))
        setLng(pos.coords.longitude.toFixed(6))
        setGettingLocation(false)
        toast.success('Location captured')
      },
      () => {
        toast.error('Could not get GPS location')
        setGettingLocation(false)
      }
    )
  }

  async function updateLocation() {
    if (!bus) return
    const latNum = parseFloat(lat)
    const lngNum = parseFloat(lng)
    if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      toast.error('Please enter valid coordinates')
      return
    }
    setUpdating(true)
    try {
      const r = await fetch('/api/location/driver/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: latNum, lng: lngNum }),
      })
      const d = await r.json()
      if (d.success) {
        toast.success('Location updated')
        setBus((prev) =>
          prev
            ? {
                ...prev,
                currentLocation: { lat: latNum, lng: lngNum, updatedAt: new Date().toISOString() },
              }
            : prev
        )
      } else {
        toast.error(d.error || 'Failed to update location')
      }
    } catch {
      toast.error('Failed to update location')
    } finally {
      setUpdating(false)
    }
  }

  const statusColor = {
    active: 'success',
    inactive: 'secondary',
    maintenance: 'warning',
  } as const

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (error || !bus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Bus className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-500 text-sm">{error || 'No bus assigned to your account'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Bus</h1>
          <p className="text-gray-500 text-sm mt-1">Assigned vehicle information</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadBus} disabled={loading}>
          <RefreshCw size={14} className="mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Bus info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Bus className="text-blue-600" size={24} />
              </div>
              <div>
                <CardTitle className="text-xl">{bus.busNumber}</CardTitle>
                <CardDescription>{bus.plateNumber}</CardDescription>
              </div>
            </div>
            <Badge variant={statusColor[bus.status]} className="capitalize">
              {bus.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Model</p>
              <p className="text-sm font-semibold text-gray-900">{bus.model}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Year</p>
              <p className="text-sm font-semibold text-gray-900">{bus.year}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Capacity</p>
              <p className="text-sm font-semibold text-gray-900">{bus.capacity} seats</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Current Route</p>
              <p className="text-sm font-semibold text-gray-900">
                {bus.currentRouteId
                  ? `${bus.currentRouteId.routeNumber} — ${bus.currentRouteId.name}`
                  : 'None'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin size={16} className="text-blue-600" />
            Current Location
          </CardTitle>
          {bus.currentLocation && (
            <CardDescription>
              Last updated:{' '}
              {new Date(bus.currentLocation.updatedAt).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {bus.currentLocation && (
            <div className="flex items-center gap-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
              <Navigation className="text-blue-600 flex-shrink-0" size={18} />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  {bus.currentLocation.lat.toFixed(6)}, {bus.currentLocation.lng.toFixed(6)}
                </p>
                <p className="text-xs text-blue-600">Current coordinates</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="lat" className="text-xs text-gray-600">
                Latitude
              </Label>
              <Input
                id="lat"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="e.g. 6.927079"
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="lng" className="text-xs text-gray-600">
                Longitude
              </Label>
              <Input
                id="lng"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="e.g. 79.861244"
                className="mt-1 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={getGPSLocation}
              disabled={gettingLocation}
              className="flex-1"
            >
              <Navigation size={14} className="mr-1.5" />
              {gettingLocation ? 'Getting location…' : 'Use GPS'}
            </Button>
            <Button size="sm" onClick={updateLocation} disabled={updating} className="flex-1">
              <MapPin size={14} className="mr-1.5" />
              {updating ? 'Updating…' : 'Update Location'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
