"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { loadGoogleMapsAPI } from "@/utils/google-maps-loader"
import { LocateFixed, MapPin, Navigation, Route } from "lucide-react"
import { toast } from "sonner"

declare global {
  interface Window {
    google: any
  }
}

type RideType = "standard" | "comfort" | "premium" | "van"

interface Suggestion {
  placeId: string | null
  description: string
  mainText: string
  secondaryText: string
  types: string[]
}

interface SelectedLocation {
  address: string
  lat: number
  lng: number
}

export interface BookingLocationDetails {
  pickupAddress: string
  pickupLat: number
  pickupLng: number
  dropoffAddress: string
  dropoffLat: number
  dropoffLng: number
  distanceKm: number
  durationMinutes: number
  estimatedPrice: number
  encodedPolyline: string | null
  rideType: RideType
}

interface EstimateResponse {
  distanceKm: number
  durationMinutes: number
  estimatedPrice: number
  encodedPolyline: string | null
  rideType: RideType
}

interface LocationBookingFieldsProps {
  onChange: (details: BookingLocationDetails | null) => void
}

const DEFAULT_CENTER = { lat: 6.9271, lng: 79.8612 }

function createSessionToken() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function formatDistance(km: number) {
  return `${km.toFixed(1)} km`
}

function formatDuration(minutes: number) {
  return minutes < 60
    ? `${Math.round(minutes)} min`
    : `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`
}

export function LocationBookingFields({ onChange }: LocationBookingFieldsProps) {
  const [sessionToken] = useState(createSessionToken)
  const [pickupInput, setPickupInput] = useState("")
  const [dropoffInput, setDropoffInput] = useState("")
  const [pickupSuggestions, setPickupSuggestions] = useState<Suggestion[]>([])
  const [dropoffSuggestions, setDropoffSuggestions] = useState<Suggestion[]>([])
  const [pickup, setPickup] = useState<SelectedLocation | null>(null)
  const [dropoff, setDropoff] = useState<SelectedLocation | null>(null)
  const [rideType, setRideType] = useState<RideType>("standard")
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null)
  const [isEstimating, setIsEstimating] = useState(false)
  const [locationMessage, setLocationMessage] = useState("")
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const routeLineRef = useRef<any>(null)

  const fetchSuggestions = useCallback(
    async (input: string, target: "pickup" | "dropoff") => {
      if (input.trim().length < 2) {
        target === "pickup" ? setPickupSuggestions([]) : setDropoffSuggestions([])
        return
      }

      try {
        const params = new URLSearchParams({
          input: input.trim(),
          sessionToken,
        })
        const response = await fetch(`/api/maps/autocomplete?${params.toString()}`)
        if (!response.ok) throw new Error("Autocomplete unavailable")
        const result = await response.json()
        target === "pickup"
          ? setPickupSuggestions(result.data ?? [])
          : setDropoffSuggestions(result.data ?? [])
      } catch (error) {
        console.error("Autocomplete failed:", error)
      }
    },
    [sessionToken]
  )

  useEffect(() => {
    if (pickup && pickup.address === pickupInput) {
      setPickupSuggestions([])
      return
    }
    const timer = setTimeout(() => fetchSuggestions(pickupInput, "pickup"), 350)
    return () => clearTimeout(timer)
  }, [fetchSuggestions, pickup, pickupInput])

  useEffect(() => {
    if (dropoff && dropoff.address === dropoffInput) {
      setDropoffSuggestions([])
      return
    }
    const timer = setTimeout(() => fetchSuggestions(dropoffInput, "dropoff"), 350)
    return () => clearTimeout(timer)
  }, [dropoff, dropoffInput, fetchSuggestions])

  useEffect(() => {
    loadGoogleMapsAPI({ onLoad: initializeMap }).catch(() => {
      toast.error("Map unavailable", { description: "Check the browser Google Maps key." })
    })

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null))
      routeLineRef.current?.setMap(null)
    }
  }, [])

  const initializeMap = () => {
    if (!mapRef.current || !window.google) return
    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    })
  }

  async function geocodeSuggestion(suggestion: Suggestion, target: "pickup" | "dropoff") {
    try {
      const response = await fetch(`/api/maps/geocode?address=${encodeURIComponent(suggestion.description)}`)
      const result = await response.json()
      if (!response.ok || !result.data?.[0]) throw new Error("Location not found")

      const selected: SelectedLocation = {
        address: result.data[0].address,
        lat: result.data[0].lat,
        lng: result.data[0].lng,
      }

      if (target === "pickup") {
        setPickup(selected)
        setPickupInput(selected.address)
        setPickupSuggestions([])
      } else {
        setDropoff(selected)
        setDropoffInput(selected.address)
        setDropoffSuggestions([])
      }
    } catch (error) {
      toast.error("Location not found", { description: "Try a more specific address." })
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("Current location is not supported in this browser.")
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const selected = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }

        try {
          const response = await fetch(
            `/api/maps/reverse-geocode?lat=${selected.lat}&lng=${selected.lng}`
          )
          const result = await response.json()
          const address = result.data?.[0]?.address ?? "Current location"
          setPickup({ ...selected, address })
          setPickupInput(address)
          setLocationMessage("")
        } catch {
          setPickup({ ...selected, address: "Current location" })
          setPickupInput("Current location")
          setLocationMessage("")
        }
      },
      () => {
        setLocationMessage("Location permission was denied. Enter your pickup manually.")
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
    )
  }

  useEffect(() => {
    if (!pickup || !dropoff) {
      setEstimate(null)
      onChange(null)
      return
    }

    const selectedPickup = pickup
    const selectedDropoff = dropoff
    let cancelled = false
    async function estimateRoute() {
      setIsEstimating(true)
      try {
        const response = await fetch("/api/maps/estimate-price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: { lat: selectedPickup.lat, lng: selectedPickup.lng },
            destination: { lat: selectedDropoff.lat, lng: selectedDropoff.lng },
            rideType,
          }),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || "Could not estimate route")
        if (cancelled) return

        const nextEstimate = result.data as EstimateResponse
        setEstimate(nextEstimate)
        onChange({
          pickupAddress: selectedPickup.address,
          pickupLat: selectedPickup.lat,
          pickupLng: selectedPickup.lng,
          dropoffAddress: selectedDropoff.address,
          dropoffLat: selectedDropoff.lat,
          dropoffLng: selectedDropoff.lng,
          distanceKm: nextEstimate.distanceKm,
          durationMinutes: nextEstimate.durationMinutes,
          estimatedPrice: nextEstimate.estimatedPrice,
          encodedPolyline: nextEstimate.encodedPolyline,
          rideType: nextEstimate.rideType,
        })
      } catch (error) {
        if (!cancelled) {
          setEstimate(null)
          onChange(null)
          toast.error("Route estimate unavailable", {
            description: error instanceof Error ? error.message : "Try different locations.",
          })
        }
      } finally {
        if (!cancelled) setIsEstimating(false)
      }
    }

    estimateRoute()
    return () => {
      cancelled = true
    }
  }, [dropoff, onChange, pickup, rideType])

  useEffect(() => {
    if (!googleMapRef.current || !window.google) return

    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []
    routeLineRef.current?.setMap(null)

    const bounds = new window.google.maps.LatLngBounds()

    if (pickup) {
      const position = { lat: pickup.lat, lng: pickup.lng }
      bounds.extend(position)
      markersRef.current.push(
        new window.google.maps.Marker({
          position,
          map: googleMapRef.current,
          label: "P",
          title: "Pickup",
        })
      )
    }

    if (dropoff) {
      const position = { lat: dropoff.lat, lng: dropoff.lng }
      bounds.extend(position)
      markersRef.current.push(
        new window.google.maps.Marker({
          position,
          map: googleMapRef.current,
          label: "D",
          title: "Drop-off",
        })
      )
    }

    if (estimate?.encodedPolyline && window.google.maps.geometry?.encoding) {
      routeLineRef.current = new window.google.maps.Polyline({
        path: window.google.maps.geometry.encoding.decodePath(estimate.encodedPolyline),
        map: googleMapRef.current,
        strokeColor: "#2563EB",
        strokeOpacity: 0.9,
        strokeWeight: 4,
      })
    }

    if (!bounds.isEmpty()) googleMapRef.current.fitBounds(bounds)
  }, [dropoff, estimate, pickup])

  const suggestionList = (items: Suggestion[], target: "pickup" | "dropoff") => {
    if (items.length === 0) return null

    return (
      <div className="mt-2 overflow-hidden rounded-md border bg-white shadow-sm">
        {items.slice(0, 5).map((suggestion) => (
          <button
            key={`${target}-${suggestion.placeId ?? suggestion.description}`}
            type="button"
            className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
            onClick={() => geocodeSuggestion(suggestion, target)}
          >
            <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />
            <span>
              <span className="block font-medium text-gray-900">{suggestion.mainText}</span>
              {suggestion.secondaryText && (
                <span className="block text-xs text-gray-500">{suggestion.secondaryText}</span>
              )}
            </span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-xl border bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Pickup and drop-off</h3>
          <p className="text-xs text-gray-500">Optional for route bookings, required for direct pickup support.</p>
        </div>
        <div className="flex gap-1">
          {(["standard", "comfort", "premium", "van"] as RideType[]).map((type) => (
            <Button
              key={type}
              type="button"
              size="sm"
              variant={rideType === type ? "default" : "outline"}
              onClick={() => setRideType(type)}
              className="capitalize"
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="pickupAddress">Pickup</Label>
            <Button type="button" variant="ghost" size="sm" onClick={useCurrentLocation}>
              <LocateFixed className="h-4 w-4" />
              Current
            </Button>
          </div>
          <Input
            id="pickupAddress"
            value={pickupInput}
            onChange={(event) => {
              setPickupInput(event.target.value)
              setPickup(null)
            }}
            placeholder="Search pickup"
          />
          {suggestionList(pickupSuggestions, "pickup")}
          {locationMessage && <p className="mt-2 text-xs text-amber-700">{locationMessage}</p>}
        </div>

        <div>
          <Label htmlFor="dropoffAddress">Drop-off</Label>
          <Input
            id="dropoffAddress"
            value={dropoffInput}
            onChange={(event) => {
              setDropoffInput(event.target.value)
              setDropoff(null)
            }}
            placeholder="Search destination"
          />
          {suggestionList(dropoffSuggestions, "dropoff")}
        </div>
      </div>

      <div className="h-64 overflow-hidden rounded-lg border">
        <div ref={mapRef} className="h-full w-full" />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {isEstimating ? (
          <Badge variant="secondary">Estimating route</Badge>
        ) : estimate ? (
          <>
            <Badge variant="outline" className="gap-1">
              <Route className="h-3.5 w-3.5" />
              {formatDistance(estimate.distanceKm)}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Navigation className="h-3.5 w-3.5" />
              {formatDuration(estimate.durationMinutes)}
            </Badge>
            <Badge variant="success">Estimate Rs. {estimate.estimatedPrice.toFixed(2)}</Badge>
          </>
        ) : (
          <span className="text-xs text-gray-500">Select both locations to preview the route.</span>
        )}
      </div>
    </div>
  )
}
