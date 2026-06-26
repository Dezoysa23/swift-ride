"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { loadGoogleMapsAPI } from "@/utils/google-maps-loader"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bus3D } from "@/components/ui/bus-3d"
import {
  MapPin,
  Navigation,
  Clock,
  CheckCircle2,
  Loader2,
  ArrowLeft,
} from "lucide-react"

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { google: any }
}

type ProximityState =
  | "driver_assigned"
  | "driver_on_way"
  | "driver_getting_closer"
  | "driver_5_min_away"
  | "driver_2_min_away"
  | "driver_arrived"

type TripStatus =
  | "assigned"
  | "on_the_way"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled"

interface TrackingData {
  tracking: boolean
  tripStatus: TripStatus | null
  driverLocation: { lat: number; lng: number; lastUpdatedAt: string } | null
  driver: { name: string } | null
  proximityState: ProximityState
  message: string
  distanceMeters: number | null
  etaMinutes: number | null
  notification: { state: string; message: string } | null
  pickup: { lat: number; lng: number; address?: string } | null
  dropoff: { lat: number; lng: number; address?: string } | null
}

const TIMELINE_STEPS: { state: TripStatus | "assigned"; label: string; icon: typeof MapPin }[] = [
  { state: "assigned",    label: "Driver assigned",        icon: CheckCircle2 },
  { state: "on_the_way",  label: "Driver on the way",      icon: Navigation },
  { state: "arrived",     label: "Driver arrived",         icon: MapPin },
  { state: "in_progress", label: "Trip in progress",       icon: Navigation },
  { state: "completed",   label: "Trip completed",         icon: CheckCircle2 },
]

const TRIP_STATUS_ORDER: (TripStatus | "assigned")[] = [
  "assigned", "on_the_way", "arrived", "in_progress", "completed",
]

function stepIndex(status: TripStatus | null | "assigned"): number {
  return TRIP_STATUS_ORDER.indexOf(status ?? "assigned")
}

export default function PassengerTrackingPage() {
  const { id: bookingId } = useParams<{ id: string }>()
  const router = useRouter()

  const [data, setData] = useState<TrackingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<google.maps.Map | null>(null)
  const driverMarkerRef = useRef<google.maps.Marker | null>(null)
  const pickupMarkerRef = useRef<google.maps.Marker | null>(null)
  const dropoffMarkerRef = useRef<google.maps.Marker | null>(null)
  const seenNotifications = useRef<Set<string>>(new Set())
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastProximityRef = useRef<ProximityState | null>(null)

  // ── map initialisation ────────────────────────────────────────
  const initMap = useCallback(() => {
    if (!mapRef.current) return
    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      zoom: 14,
      center: { lat: 6.9271, lng: 79.8612 },
      disableDefaultUI: true,
      zoomControl: true,
      styles: [
        { featureType: "all", stylers: [{ saturation: -20 }] },
        { featureType: "road", stylers: [{ lightness: 10 }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#4a5568" }] },
      ],
    })
  }, [])

  useEffect(() => {
    loadGoogleMapsAPI({ onLoad: initMap }).catch(() =>
      toast.error("Could not load map")
    )
  }, [initMap])

  // ── update markers ────────────────────────────────────────────
  const updateMarkers = useCallback((d: TrackingData) => {
    const map = googleMapRef.current
    if (!map) return

    if (d.driverLocation) {
      const pos = { lat: d.driverLocation.lat, lng: d.driverLocation.lng }
      if (!driverMarkerRef.current) {
        driverMarkerRef.current = new window.google.maps.Marker({
          map,
          position: pos,
          title: d.driver?.name ?? "Driver",
          icon: {
            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: "#F5C518",
            fillOpacity: 1,
            strokeColor: "#1a1a2e",
            strokeWeight: 2,
          },
          zIndex: 10,
        })
      } else {
        driverMarkerRef.current.setPosition(pos)
      }
    }

    if (d.pickup && !pickupMarkerRef.current) {
      pickupMarkerRef.current = new window.google.maps.Marker({
        map,
        position: { lat: d.pickup.lat, lng: d.pickup.lng! },
        title: "Your pickup",
        icon: {
          url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
        },
        label: { text: "P", color: "#fff", fontWeight: "bold" },
      })
      map.setCenter({ lat: d.pickup.lat, lng: d.pickup.lng! })
    }

    if (d.dropoff && !dropoffMarkerRef.current) {
      dropoffMarkerRef.current = new window.google.maps.Marker({
        map,
        position: { lat: d.dropoff.lat, lng: d.dropoff.lng! },
        title: "Your drop-off",
        icon: {
          url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        },
        label: { text: "D", color: "#fff", fontWeight: "bold" },
      })
    }

    // Fit bounds when driver + pickup both present
    if (d.driverLocation && d.pickup) {
      const bounds = new window.google.maps.LatLngBounds()
      bounds.extend({ lat: d.driverLocation.lat, lng: d.driverLocation.lng })
      bounds.extend({ lat: d.pickup.lat, lng: d.pickup.lng! })
      if (d.dropoff) bounds.extend({ lat: d.dropoff.lat, lng: d.dropoff.lng! })
      map.fitBounds(bounds, 80)
    }
  }, [])

  // ── fetch tracking data ───────────────────────────────────────
  const fetchTracking = useCallback(async () => {
    try {
      const res = await fetch(`/api/passenger/bookings/${bookingId}/tracking`)
      if (!res.ok) return
      const json: TrackingData = await res.json()
      setData(json)
      setIsLoading(false)
      updateMarkers(json)

      // Show toast only for new proximity state transitions
      if (
        json.notification &&
        !seenNotifications.current.has(json.notification.state)
      ) {
        seenNotifications.current.add(json.notification.state)
        toast(json.notification.message, {
          duration: 5000,
          icon: "🚌",
        })
      }

      // Also show when proximity state changes (even without a fresh notification)
      if (json.proximityState !== lastProximityRef.current) {
        lastProximityRef.current = json.proximityState
      }

      // Stop polling when trip ends
      if (json.tripStatus === "completed" || json.tripStatus === "cancelled") {
        if (pollRef.current) clearInterval(pollRef.current)
      }
    } catch {
      // silently ignore transient errors
    }
  }, [bookingId, updateMarkers])

  useEffect(() => {
    fetchTracking()
    pollRef.current = setInterval(fetchTracking, 20_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [fetchTracking])

  // ── derived ───────────────────────────────────────────────────
  const currentStepIdx = stepIndex(data?.tripStatus ?? null)
  const isCancelled = data?.tripStatus === "cancelled"
  const isCompleted = data?.tripStatus === "completed"
  const isDone = isCancelled || isCompleted

  const etaLabel =
    data?.etaMinutes !== null && data?.etaMinutes !== undefined
      ? data.etaMinutes < 1
        ? "< 1 min away"
        : `~${Math.round(data.etaMinutes)} min away`
      : null

  const distLabel =
    data?.distanceMeters !== null && data?.distanceMeters !== undefined
      ? data.distanceMeters < 1000
        ? `${Math.round(data.distanceMeters)} m away`
        : `${(data.distanceMeters / 1000).toFixed(1)} km away`
      : null

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white flex flex-col">
      {/* ── top bar ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-[#0D1424]/95 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-white/70 hover:text-white"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <p className="font-semibold text-sm leading-tight">Live Tracking</p>
          {data?.driver && (
            <p className="text-xs text-white/50">Driver: {data.driver.name}</p>
          )}
        </div>
        {!isDone && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-[#4CAF7D]">
            <span className="w-2 h-2 rounded-full bg-[#4CAF7D] animate-pulse" />
            Live
          </span>
        )}
      </div>

      {/* ── map ─────────────────────────────────────────────────── */}
      <div className="relative h-[42vh] min-h-[240px] bg-[#111827]">
        <div ref={mapRef} className="h-full w-full" />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#111827]/80">
            <Loader2 className="h-8 w-8 animate-spin text-[#4CAF7D]" />
          </div>
        )}
        {/* ETA badge */}
        {etaLabel && (
          <div className="absolute top-3 right-3 bg-[#0D1424]/90 backdrop-blur border border-white/10 rounded-xl px-3 py-1.5 text-sm font-medium text-[#F5C518]">
            {etaLabel}
          </div>
        )}
      </div>

      {/* ── proximity notification banner ───────────────────────── */}
      {data && !isDone && (
        <div className="mx-4 mt-3">
          <div
            className={`rounded-2xl px-4 py-3 flex items-center gap-3 ${
              data.proximityState === "driver_arrived"
                ? "bg-[#4CAF7D]/20 border border-[#4CAF7D]/40"
                : "bg-[#1E3A5F]/60 border border-[#3B82F6]/30"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                data.proximityState === "driver_arrived"
                  ? "bg-[#4CAF7D]/30"
                  : "bg-[#3B82F6]/20"
              }`}
            >
              {data.proximityState === "driver_arrived" ? (
                <CheckCircle2 className="h-5 w-5 text-[#4CAF7D]" />
              ) : (
                <Navigation className="h-5 w-5 text-[#60A5FA]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">{data.message}</p>
              {distLabel && (
                <p className="text-xs text-white/50 mt-0.5">{distLabel}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 3D ride preview ─────────────────────────────────────── */}
      {!isDone && (
        <div className="px-4 mt-3">
          <div className="relative h-40 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#111827] to-[#0D1424]">
            <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[#F76C3C]/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 right-4 h-40 w-40 rounded-full bg-[#0FA6A6]/20 blur-3xl" />
            <Bus3D interactive={false} />
            <span className="absolute bottom-2 left-3 font-mono-label text-[10px] text-white/40">
              Your ride
            </span>
            {etaLabel && (
              <span className="absolute bottom-2 right-3 text-xs font-semibold text-[#F5C518]">
                {etaLabel}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── timeline ────────────────────────────────────────────── */}
      <div className="px-4 mt-4 flex-1">
        <Card className="bg-[#111827] border-white/10">
          <CardContent className="pt-4 pb-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">
              Trip Progress
            </p>
            <ol className="relative border-l border-white/10 ml-3 space-y-5">
              {TIMELINE_STEPS.map((step, idx) => {
                const done = currentStepIdx > idx
                const active = currentStepIdx === idx && !isDone
                const Icon = step.icon
                return (
                  <li key={step.state} className="ml-5">
                    <span
                      className={`absolute -left-[11px] w-[22px] h-[22px] rounded-full flex items-center justify-center ring-4 ring-[#111827] ${
                        done
                          ? "bg-[#4CAF7D]"
                          : active
                          ? "bg-[#3B82F6] animate-pulse"
                          : "bg-[#1E293B]"
                      }`}
                    >
                      <Icon
                        className={`h-3 w-3 ${
                          done || active ? "text-white" : "text-white/30"
                        }`}
                      />
                    </span>
                    <p
                      className={`text-sm leading-tight ${
                        done
                          ? "text-[#4CAF7D] font-medium"
                          : active
                          ? "text-white font-semibold"
                          : "text-white/30"
                      }`}
                    >
                      {step.label}
                    </p>
                    {active && etaLabel && (
                      <p className="text-xs text-[#60A5FA] mt-0.5">{etaLabel}</p>
                    )}
                  </li>
                )
              })}

              {isCancelled && (
                <li className="ml-5">
                  <span className="absolute -left-[11px] w-[22px] h-[22px] rounded-full flex items-center justify-center ring-4 ring-[#111827] bg-red-500/70">
                    <MapPin className="h-3 w-3 text-white" />
                  </span>
                  <p className="text-sm text-red-400 font-medium">Cancelled</p>
                </li>
              )}
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* ── location info ────────────────────────────────────────── */}
      {data?.pickup && (
        <div className="px-4 mt-3 mb-6 grid grid-cols-2 gap-3">
          <div className="bg-[#111827] border border-white/10 rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-[#4CAF7D]/20 flex items-center justify-center">
                <MapPin className="h-3 w-3 text-[#4CAF7D]" />
              </div>
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wide">
                Pickup
              </span>
            </div>
            <p className="text-xs text-white/70 leading-snug line-clamp-2">
              {data.pickup.address ?? "Selected location"}
            </p>
          </div>
          {data.dropoff && (
            <div className="bg-[#111827] border border-white/10 rounded-2xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-[#1D4ED8]/20 flex items-center justify-center">
                  <MapPin className="h-3 w-3 text-[#60A5FA]" />
                </div>
                <span className="text-xs font-semibold text-white/50 uppercase tracking-wide">
                  Drop-off
                </span>
              </div>
              <p className="text-xs text-white/70 leading-snug line-clamp-2">
                {data.dropoff.address ?? "Selected location"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── last updated ─────────────────────────────────────────── */}
      {data?.driverLocation?.lastUpdatedAt && (
        <p className="text-center text-xs text-white/25 pb-4">
          Driver location updated{" "}
          {new Date(data.driverLocation.lastUpdatedAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  )
}
