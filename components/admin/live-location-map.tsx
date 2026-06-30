"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { loadGoogleMapsAPI } from "@/utils/google-maps-loader"
import { Clock, LocateFixed, MapPin, RefreshCw, Route } from "lucide-react"
import { toast } from "sonner"

declare global {
  interface Window {
    google: any
  }
}

type DriverStatus = "online" | "on_trip" | "offline"
type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed"

interface PopulatedRef {
  _id?: string
  name?: string
  phone?: string
  email?: string
  busNumber?: string
  plateNumber?: string
  routeNumber?: string
}

interface DriverLocationItem {
  _id: string
  driverId: PopulatedRef | string | null
  busId?: PopulatedRef | string | null
  routeId?: PopulatedRef | string | null
  lat: number
  lng: number
  status: DriverStatus
  speed?: number
  heading?: number
  lastUpdatedAt: string
}

interface BookingMapItem {
  _id: string
  passengerId: PopulatedRef | string | null
  driverId?: PopulatedRef | string | null
  busId?: PopulatedRef | string | null
  routeId?: PopulatedRef | string | null
  pickupAddress?: string
  pickupLat?: number
  pickupLng?: number
  dropoffAddress?: string
  dropoffLat?: number
  dropoffLng?: number
  routePolyline?: string
  status: BookingStatus
  bookingDate?: string
}

interface LiveLocationPayload {
  drivers: DriverLocationItem[]
  activeBookings: BookingMapItem[]
}

const DEFAULT_CENTER = { lat: 6.9271, lng: 79.8612 }
const COLORS = {
  online: "#8A9A5B",
  onTrip: "#FFD23F",
  pickup: "#FFCBA4",
  dropoff: "#003153",
  warning: "#F97316",
}

const mapStyles = [
  { elementType: "geometry", stylers: [{ color: "#111315" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#111315" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#AEB4B9" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2A2F33" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#D7DCE0" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#09151F" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
]

function isRef(value: PopulatedRef | string | null | undefined): value is PopulatedRef {
  return Boolean(value && typeof value === "object")
}

function refName(value: PopulatedRef | string | null | undefined, fallback = "Unassigned") {
  if (!isRef(value)) return fallback
  return value.name ?? value.routeNumber ?? value.busNumber ?? fallback
}

function busLabel(value: PopulatedRef | string | null | undefined) {
  if (!isRef(value)) return "No bus"
  return [value.busNumber, value.plateNumber].filter(Boolean).join(" / ") || "No bus"
}

function routeLabel(value: PopulatedRef | string | null | undefined) {
  if (!isRef(value)) return "No route"
  return [value.routeNumber, value.name].filter(Boolean).join(" ") || "No route"
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }
    return entities[char]
  })
}

function formatTime(value?: string) {
  if (!value) return "No update"
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function markerIcon(color: string, scale: number) {
  return {
    path: window.google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 0.95,
    strokeColor: "#ffffff",
    strokeWeight: 2,
    scale,
  }
}

export function LiveLocationMap() {
  const [data, setData] = useState<LiveLocationPayload>({ drivers: [], activeBookings: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [driverStatus, setDriverStatus] = useState<"all" | DriverStatus>("all")
  const [bookingStatus, setBookingStatus] = useState<"all" | BookingStatus>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<any>(null)
  const infoWindowRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  const fetchLiveLocations = useCallback(async (quiet = false) => {
    if (!quiet) setIsRefreshing(true)
    try {
      const response = await fetch("/api/admin/live-locations")
      if (!response.ok) throw new Error("Failed to load live locations")
      const result = await response.json()
      setData(result.data ?? { drivers: [], activeBookings: [] })
    } catch (error) {
      console.error("Failed to load live locations:", error)
      toast.error("Live map unavailable", { description: "Could not load current locations." })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const startMap = async () => {
      try {
        await loadGoogleMapsAPI({ onLoad: initializeMap })
      } catch (error) {
        console.error("Failed to load Google Maps:", error)
        toast.error("Map unavailable", { description: "Check the frontend Google Maps key." })
      }
    }

    startMap()
    fetchLiveLocations(true)
    const interval = setInterval(() => fetchLiveLocations(true), 10000)

    return () => {
      clearInterval(interval)
      markersRef.current.forEach((marker) => marker.setMap(null))
      infoWindowRef.current?.close()
    }
  }, [fetchLiveLocations])

  const initializeMap = () => {
    if (!mapRef.current || !window.google) return

    infoWindowRef.current = new window.google.maps.InfoWindow()
    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      disableDefaultUI: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: mapStyles,
    })
  }

  const filteredDrivers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return data.drivers.filter((driver) => {
      const statusMatch = driverStatus === "all" || driver.status === driverStatus
      const text = [
        refName(driver.driverId, "Unknown driver"),
        busLabel(driver.busId),
        routeLabel(driver.routeId),
        driver.status,
      ]
        .join(" ")
        .toLowerCase()

      return statusMatch && (!term || text.includes(term))
    })
  }, [data.drivers, driverStatus, searchTerm])

  const filteredBookings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return data.activeBookings.filter((booking) => {
      const statusMatch = bookingStatus === "all" || booking.status === bookingStatus
      const text = [
        refName(booking.passengerId, "Passenger"),
        refName(booking.driverId, "Driver"),
        routeLabel(booking.routeId),
        booking.pickupAddress,
        booking.dropoffAddress,
        booking.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return statusMatch && (!term || text.includes(term))
    })
  }, [bookingStatus, data.activeBookings, searchTerm])

  const focusMap = useCallback((lat: number, lng: number, zoom = 15) => {
    if (!googleMapRef.current) return
    googleMapRef.current.setCenter({ lat, lng })
    googleMapRef.current.setZoom(zoom)
  }, [])

  useEffect(() => {
    if (!googleMapRef.current || !window.google) return

    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []

    const bounds = new window.google.maps.LatLngBounds()

    filteredDrivers.forEach((driver) => {
      const position = { lat: driver.lat, lng: driver.lng }
      bounds.extend(position)
      const marker = new window.google.maps.Marker({
        position,
        map: googleMapRef.current,
        icon: markerIcon(driver.status === "on_trip" ? COLORS.onTrip : COLORS.online, 8),
        title: refName(driver.driverId, "Driver"),
      })

      marker.addListener("click", () => {
        infoWindowRef.current?.setContent(`
          <div style="color:#111827;min-width:220px">
            <div style="font-weight:700;margin-bottom:4px">${escapeHtml(refName(driver.driverId, "Driver"))}</div>
            <div>Bus: ${escapeHtml(busLabel(driver.busId))}</div>
            <div>Route: ${escapeHtml(routeLabel(driver.routeId))}</div>
            <div>Status: ${escapeHtml(driver.status.replace("_", " "))}</div>
            <div>Updated: ${escapeHtml(formatTime(driver.lastUpdatedAt))}</div>
          </div>
        `)
        infoWindowRef.current?.open(googleMapRef.current, marker)
      })

      markersRef.current.push(marker)
    })

    filteredBookings.forEach((booking) => {
      if (typeof booking.pickupLat === "number" && typeof booking.pickupLng === "number") {
        const position = { lat: booking.pickupLat, lng: booking.pickupLng }
        bounds.extend(position)
        const marker = new window.google.maps.Marker({
          position,
          map: googleMapRef.current,
          icon: markerIcon(COLORS.pickup, 7),
          title: "Pickup",
        })
        marker.addListener("click", () => {
          infoWindowRef.current?.setContent(`
            <div style="color:#111827;min-width:220px">
              <div style="font-weight:700;margin-bottom:4px">Pickup</div>
              <div>Passenger: ${escapeHtml(refName(booking.passengerId, "Passenger"))}</div>
              <div>${escapeHtml(booking.pickupAddress ?? "Selected location")}</div>
              <div>Status: ${escapeHtml(booking.status)}</div>
            </div>
          `)
          infoWindowRef.current?.open(googleMapRef.current, marker)
        })
        markersRef.current.push(marker)
      }

      if (typeof booking.dropoffLat === "number" && typeof booking.dropoffLng === "number") {
        const position = { lat: booking.dropoffLat, lng: booking.dropoffLng }
        bounds.extend(position)
        const marker = new window.google.maps.Marker({
          position,
          map: googleMapRef.current,
          icon: markerIcon(COLORS.dropoff, 7),
          title: "Drop-off",
        })
        marker.addListener("click", () => {
          infoWindowRef.current?.setContent(`
            <div style="color:#111827;min-width:220px">
              <div style="font-weight:700;margin-bottom:4px">Drop-off</div>
              <div>Passenger: ${escapeHtml(refName(booking.passengerId, "Passenger"))}</div>
              <div>${escapeHtml(booking.dropoffAddress ?? "Selected location")}</div>
              <div>Status: ${escapeHtml(booking.status)}</div>
            </div>
          `)
          infoWindowRef.current?.open(googleMapRef.current, marker)
        })
        markersRef.current.push(marker)
      }

      if (booking.routePolyline && window.google.maps.geometry?.encoding) {
        const line = new window.google.maps.Polyline({
          path: window.google.maps.geometry.encoding.decodePath(booking.routePolyline),
          map: googleMapRef.current,
          strokeColor: COLORS.warning,
          strokeOpacity: 0.85,
          strokeWeight: 4,
        })
        markersRef.current.push(line)
      }
    })

    if (!bounds.isEmpty()) {
      googleMapRef.current.fitBounds(bounds)
    }
  }, [filteredBookings, filteredDrivers])

  if (isLoading) {
    return <Skeleton className="h-[350px] w-full md:h-[500px] lg:h-[640px]" />
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Live Map</h1>
          <p className="mt-1 text-sm text-muted-foreground">Drivers, pickups, and active bookings</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search area, driver, passenger"
            className="sm:w-72"
          />
          <Button variant="outline" onClick={() => fetchLiveLocations(false)} disabled={isRefreshing}>
            <RefreshCw className={isRefreshing ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Online drivers</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{data.drivers.length}</p>
            </div>
            <LocateFixed className="h-8 w-8 text-[#8A9A5B]" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Active bookings</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{data.activeBookings.length}</p>
            </div>
            <Route className="h-8 w-8 text-[#003153]" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Last refresh</p>
              <p className="mt-1 text-xl font-bold text-foreground">{formatTime(new Date().toISOString())}</p>
            </div>
            <Clock className="h-8 w-8 text-[#F97316]" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Drivers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(["all", "online", "on_trip"] as const).map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={driverStatus === status ? "default" : "outline"}
                    onClick={() => setDriverStatus(status)}
                  >
                    {status === "on_trip" ? "On trip" : status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
              <div className="max-h-72 space-y-2 overflow-auto pr-1">
                {filteredDrivers.length === 0 ? (
                  <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No drivers found</p>
                ) : (
                  filteredDrivers.map((driver) => (
                    <button
                      key={driver._id}
                      className="w-full rounded-md border bg-card p-3 text-left transition hover:border-border"
                      onClick={() => focusMap(driver.lat, driver.lng)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{refName(driver.driverId, "Driver")}</p>
                          <p className="text-xs text-muted-foreground">{busLabel(driver.busId)}</p>
                        </div>
                        <Badge variant={driver.status === "on_trip" ? "warning" : "success"}>
                          {driver.status === "on_trip" ? "On trip" : "Online"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{routeLabel(driver.routeId)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Updated {formatTime(driver.lastUpdatedAt)}</p>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Bookings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(["all", "pending", "confirmed"] as const).map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={bookingStatus === status ? "default" : "outline"}
                    onClick={() => setBookingStatus(status)}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
              <div className="max-h-72 space-y-2 overflow-auto pr-1">
                {filteredBookings.length === 0 ? (
                  <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No bookings found</p>
                ) : (
                  filteredBookings.map((booking) => (
                    <button
                      key={booking._id}
                      className="w-full rounded-md border bg-card p-3 text-left transition hover:border-border"
                      onClick={() => {
                        if (typeof booking.pickupLat === "number" && typeof booking.pickupLng === "number") {
                          focusMap(booking.pickupLat, booking.pickupLng)
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{refName(booking.passengerId, "Passenger")}</p>
                          <p className="text-xs text-muted-foreground">{routeLabel(booking.routeId)}</p>
                        </div>
                        <Badge variant={booking.status === "confirmed" ? "success" : "warning"}>
                          {booking.status}
                        </Badge>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                        {booking.pickupAddress ?? "Pickup selected"}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="overflow-hidden rounded-lg border bg-[#111315]">
          <div ref={mapRef} className="h-[350px] w-full md:h-[500px] lg:h-[640px]" />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-[#8A9A5B]" /> Driver online
        </span>
        <span className="inline-flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-[#FFD23F]" /> Driver on trip
        </span>
        <span className="inline-flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-[#FFCBA4]" /> Pickup
        </span>
        <span className="inline-flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-[#003153]" /> Drop-off
        </span>
      </div>
    </div>
  )
}
