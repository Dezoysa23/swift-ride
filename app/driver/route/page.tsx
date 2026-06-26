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
import { Skeleton } from '@/components/ui/skeleton'
import { MapPin, Clock, Ruler, DollarSign, Bus, ArrowRight } from 'lucide-react'

interface Stop {
  name: string
  order: number
  lat?: number
  lng?: number
}

interface AssignedBus {
  _id: string
  busNumber: string
  plateNumber: string
  status: string
}

interface RouteData {
  _id: string
  name: string
  routeNumber: string
  startPoint: string
  endPoint: string
  stops: Stop[]
  distanceKm: number
  estimatedMinutes: number
  fare: number
  status: string
  assignedBuses?: AssignedBus[]
}

export default function DriverRoutePage() {
  const [route, setRoute] = useState<RouteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/driver/route')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setRoute(d.data)
        } else {
          setError(d.error || 'Failed to load route')
        }
      })
      .catch(() => setError('Failed to load route'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !route) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <MapPin className="mx-auto text-muted-foreground mb-3" size={40} />
          <p className="text-muted-foreground text-sm">{error || 'No route assigned to your bus'}</p>
        </div>
      </div>
    )
  }

  const sortedStops = [...route.stops].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Route</h1>
        <p className="text-muted-foreground text-sm mt-1">Current assigned route details</p>
      </div>

      {/* Route overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl">{route.name}</CardTitle>
              <CardDescription className="text-sm mt-1">Route #{route.routeNumber}</CardDescription>
            </div>
            <Badge
              variant={route.status === 'active' ? 'success' : 'secondary'}
              className="capitalize flex-shrink-0"
            >
              {route.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Start → End */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <MapPin size={14} className="text-teal" />
              {route.startPoint}
            </div>
            <ArrowRight size={14} className="text-muted-foreground" />
            <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <MapPin size={14} className="text-destructive" />
              {route.endPoint}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10">
              <Ruler className="text-primary flex-shrink-0" size={18} />
              <div>
                <p className="text-xs text-primary font-medium">Distance</p>
                <p className="text-sm font-bold text-primary">{route.distanceKm} km</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-teal/15">
              <Clock className="text-teal flex-shrink-0" size={18} />
              <div>
                <p className="text-xs text-teal font-medium">Duration</p>
                <p className="text-sm font-bold text-teal">{route.estimatedMinutes} min</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-teal/15">
              <DollarSign className="text-teal flex-shrink-0" size={18} />
              <div>
                <p className="text-xs text-teal font-medium">Fare</p>
                <p className="text-sm font-bold text-teal">${route.fare.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stops */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin size={16} className="text-primary" />
            Route Stops ({sortedStops.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedStops.length === 0 ? (
            <p className="text-muted-foreground text-sm">No stops defined</p>
          ) : (
            <div className="relative">
              {sortedStops.map((stop, idx) => (
                <div key={idx} className="flex items-start gap-4 pb-4">
                  {/* Timeline */}
                  <div className="flex flex-col items-center flex-shrink-0 w-8">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0
                          ? 'bg-teal text-white'
                          : idx === sortedStops.length - 1
                          ? 'bg-destructive text-white'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {stop.order}
                    </div>
                    {idx < sortedStops.length - 1 && (
                      <div className="w-0.5 h-6 bg-border mt-1" />
                    )}
                  </div>
                  {/* Stop info */}
                  <div className="flex-1 pt-1">
                    <p className="text-sm font-medium text-foreground">{stop.name}</p>
                    {(stop.lat || stop.lng) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {stop.lat?.toFixed(4)}, {stop.lng?.toFixed(4)}
                      </p>
                    )}
                    {idx === 0 && (
                      <Badge variant="outline" className="text-xs mt-1 text-teal border-teal/40">
                        Start
                      </Badge>
                    )}
                    {idx === sortedStops.length - 1 && (
                      <Badge variant="outline" className="text-xs mt-1 text-destructive border-destructive/40">
                        End
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned Buses */}
      {route.assignedBuses && route.assignedBuses.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bus size={16} className="text-primary" />
              Buses on This Route ({route.assignedBuses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {route.assignedBuses.map((bus) => (
                <div
                  key={bus._id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bus size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{bus.busNumber}</p>
                    <p className="text-xs text-muted-foreground">{bus.plateNumber}</p>
                  </div>
                  <Badge
                    variant={
                      bus.status === 'active'
                        ? 'success'
                        : bus.status === 'maintenance'
                        ? 'warning'
                        : 'secondary'
                    }
                    className="ml-auto capitalize text-xs"
                  >
                    {bus.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
