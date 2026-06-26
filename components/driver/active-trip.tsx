"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  MapPin,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react"

export type TripStatus =
  | "assigned"
  | "on_the_way"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled"

interface ActiveBooking {
  _id: string
  passengerId: { name?: string; phone?: string } | null
  pickupAddress?: string
  pickupLat?: number
  pickupLng?: number
  dropoffAddress?: string
  dropoffLat?: number
  dropoffLng?: number
  distanceKm?: number
  durationMinutes?: number
  estimatedPrice?: number
  tripStatus?: TripStatus
  fare: number
}

interface ActiveTripProps {
  booking: ActiveBooking
  onStatusChange?: (newStatus: TripStatus) => void
}

const STATUS_ACTIONS: Record<
  TripStatus,
  { label: string; next: TripStatus; color: string; icon: typeof Navigation } | null
> = {
  assigned:    { label: "Start Navigation", next: "on_the_way",  color: "bg-[#1D4ED8] hover:bg-[#1e40af]", icon: Navigation },
  on_the_way:  { label: "Mark Arrived",      next: "arrived",     color: "bg-[#D97706] hover:bg-[#b45309]", icon: MapPin },
  arrived:     { label: "Start Trip",        next: "in_progress", color: "bg-[#4CAF7D] hover:bg-[#3d9970]", icon: Navigation },
  in_progress: { label: "Complete Trip",     next: "completed",   color: "bg-[#4CAF7D] hover:bg-[#3d9970]", icon: CheckCircle2 },
  completed:   null,
  cancelled:   null,
}

const STATUS_LABELS: Record<TripStatus, string> = {
  assigned:    "Assigned",
  on_the_way:  "On the Way",
  arrived:     "Arrived",
  in_progress: "In Progress",
  completed:   "Completed",
  cancelled:   "Cancelled",
}

export function ActiveTrip({ booking, onStatusChange }: ActiveTripProps) {
  const [tripStatus, setTripStatus] = useState<TripStatus>(
    booking.tripStatus ?? "assigned"
  )
  const [isUpdating, setIsUpdating] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)

  const action = STATUS_ACTIONS[tripStatus]
  const isDone = tripStatus === "completed" || tripStatus === "cancelled"

  const updateStatus = async (next: TripStatus) => {
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/driver/trips/${booking._id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Failed to update trip status")
        return
      }
      setTripStatus(next)
      setCancelConfirm(false)
      onStatusChange?.(next)

      const labels: Record<TripStatus, string> = {
        assigned:    "Trip assigned",
        on_the_way:  "Navigation started — heading to pickup",
        arrived:     "Marked as arrived at pickup",
        in_progress: "Trip in progress",
        completed:   "Trip completed",
        cancelled:   "Trip cancelled",
      }
      toast.success(labels[next])
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Card className="bg-[#111827] border-white/10 text-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-white/80">
            Active Trip
          </CardTitle>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              tripStatus === "completed"
                ? "bg-[#4CAF7D]/20 text-[#4CAF7D]"
                : tripStatus === "cancelled"
                ? "bg-red-500/20 text-red-400"
                : tripStatus === "in_progress"
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-blue-500/20 text-blue-400"
            }`}
          >
            {STATUS_LABELS[tripStatus]}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Passenger */}
        {booking.passengerId?.name && (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-8 h-8 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white font-bold text-xs">
              {booking.passengerId.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium leading-tight">{booking.passengerId.name}</p>
              {booking.passengerId.phone && (
                <p className="text-white/40 text-xs">{booking.passengerId.phone}</p>
              )}
            </div>
          </div>
        )}

        {/* Pickup */}
        {booking.pickupAddress && (
          <div className="flex items-start gap-2.5 text-sm">
            <div className="mt-0.5 w-5 h-5 rounded-full bg-[#4CAF7D]/20 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-3 w-3 text-[#4CAF7D]" />
            </div>
            <div>
              <p className="text-xs text-white/40 mb-0.5">Pickup</p>
              <p className="text-white/80 text-xs leading-snug">{booking.pickupAddress}</p>
            </div>
          </div>
        )}

        {/* Drop-off */}
        {booking.dropoffAddress && (
          <div className="flex items-start gap-2.5 text-sm">
            <div className="mt-0.5 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-3 w-3 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-white/40 mb-0.5">Drop-off</p>
              <p className="text-white/80 text-xs leading-snug">{booking.dropoffAddress}</p>
            </div>
          </div>
        )}

        {/* Fare / distance */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="bg-[#0D1424] rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-white/40 uppercase tracking-wide mb-0.5">Fare</p>
            <p className="text-sm font-bold text-[#F5C518]">Rs.{booking.fare.toFixed(0)}</p>
          </div>
          {booking.distanceKm && (
            <div className="bg-[#0D1424] rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-white/40 uppercase tracking-wide mb-0.5">Dist</p>
              <p className="text-sm font-bold">{booking.distanceKm.toFixed(1)} km</p>
            </div>
          )}
          {booking.durationMinutes && (
            <div className="bg-[#0D1424] rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-white/40 uppercase tracking-wide mb-0.5">ETA</p>
              <p className="text-sm font-bold">{Math.round(booking.durationMinutes)} min</p>
            </div>
          )}
        </div>

        {/* Status action button */}
        {!isDone && action && (
          <Button
            className={`w-full h-12 text-white font-semibold rounded-xl ${action.color}`}
            onClick={() => updateStatus(action.next)}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <action.icon className="h-4 w-4 mr-2" />
            )}
            {action.label}
          </Button>
        )}

        {/* Cancel */}
        {!isDone && (
          cancelConfirm ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-white/10 text-white/70 text-xs"
                onClick={() => setCancelConfirm(false)}
              >
                Keep trip
              </Button>
              <Button
                className="flex-1 bg-destructive hover:bg-destructive/90 text-white text-xs"
                onClick={() => updateStatus("cancelled")}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm cancel"}
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
              onClick={() => setCancelConfirm(true)}
            >
              <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
              Cancel Trip
            </Button>
          )
        )}

        {/* Done state */}
        {isCompleted(tripStatus) && (
          <div className="text-center py-2">
            <CheckCircle2 className="h-8 w-8 text-[#4CAF7D] mx-auto mb-1" />
            <p className="text-sm text-[#4CAF7D] font-semibold">Trip completed</p>
          </div>
        )}
        {tripStatus === "cancelled" && (
          <div className="text-center py-2">
            <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-1" />
            <p className="text-sm text-red-400 font-semibold">Trip cancelled</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function isCompleted(s: TripStatus): s is "completed" {
  return s === "completed"
}
