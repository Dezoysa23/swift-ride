"use client"

import type React from "react"
import { useEffect, useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Locate, MapPin } from "lucide-react"
import { loadGoogleMapsAPI } from "@/utils/google-maps-loader"

declare global {
  interface Window {
    google: any
  }
}

interface LocationUpdaterProps {
  routeId: string
  busId: string
  isOnDuty: boolean
}

export function LocationUpdater({ routeId, busId, isOnDuty }: LocationUpdaterProps) {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isAutoUpdateEnabled, setIsAutoUpdateEnabled] = useState(false)
  const [updateInterval, setUpdateInterval] = useState(60)
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const autoUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const watchPositionIdRef = useRef<number | null>(null)

  // Memoized map marker update
  const updateMapMarker = useCallback(() => {
    if (!googleMapRef.current || !currentLocation) return

    if (markerRef.current) {
      markerRef.current.setMap(null)
    }

    markerRef.current = new google.maps.Marker({
      position: currentLocation,
      map: googleMapRef.current,
      icon: {
        url: "https://maps.google.com/mapfiles/ms/icons/bus.png",
        scaledSize: new google.maps.Size(32, 32),
      },
      title: "Bus Location",
    })

    googleMapRef.current.setCenter(currentLocation)
  }, [currentLocation])

  // Memoized map initialization
  const initializeMap = useCallback(() => {
    if (!mapRef.current) return

    const defaultCenter = { lat: 6.9271, lng: 79.8612 } // Colombo, Sri Lanka
    const center = currentLocation || defaultCenter

    googleMapRef.current = new google.maps.Map(mapRef.current, {
      zoom: 15,
      center,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    })

    if (currentLocation) {
      updateMapMarker()
    }
  }, [currentLocation, updateMapMarker])

  // Load Google Maps using shared loader
  useEffect(() => {
    const loadMap = async () => {
      try {
        await loadGoogleMapsAPI({
          onLoad: initializeMap
        });
      } catch (error) {
        console.error('Failed to load Google Maps:', error);
        toast.error("Error", { description: "Failed to load map. Please refresh the page." });
      }
    };

    loadMap();

  }, [initializeMap])

  // Location data effect
  useEffect(() => {
    const fetchBusLocation = async () => {
      try {
        const response = await fetch(`/api/driver/buses/${busId}/locations`)
        if (response.ok) {
          const data = await response.json()
          data.currentLocation && setCurrentLocation(data.currentLocation)
        }
      } catch (error) {
        console.error("Failed to fetch bus location:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBusLocation()
  }, [busId])

  // Map update effect
  useEffect(() => {
    if (googleMapRef.current && currentLocation) {
      updateMapMarker()
    }
  }, [currentLocation, updateMapMarker])

  // Duty status effect
  useEffect(() => {
    if (!isOnDuty && isAutoUpdateEnabled) {
      setIsAutoUpdateEnabled(false)
      autoUpdateIntervalRef.current && clearInterval(autoUpdateIntervalRef.current)
      watchPositionIdRef.current && navigator.geolocation.clearWatch(watchPositionIdRef.current)

      toast("Auto-update disabled", {
        description: "You must be on duty to use auto-update.",
      })
    }
  }, [isOnDuty, isAutoUpdateEnabled])

  // Geolocation functions
  const getCurrentLocation = () => {
    return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }),
          reject,
          { enableHighAccuracy: true }
        )
      } else {
        reject(new Error("Geolocation not supported"))
      }
    })
  }

  const handleUpdateLocation = async () => {
    if (!isOnDuty) {
      toast.error("Error", { description: "You must be on duty to update your location." })
      return
    }

    setIsUpdating(true)
    try {
      const location = await getCurrentLocation()
      const response = await fetch(`/api/driver/buses/${busId}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: location.lat, lng: location.lng }),
      })

      if (!response.ok) throw new Error("Failed to update location")

      setCurrentLocation(location)
      toast.success("Location updated", {
        description: "Your current location has been updated successfully.",
      })
    } catch (error) {
      console.error("Error updating location:", error)
      toast.error("Error", { description: "Failed to update your location. Please try again." })
    } finally {
      setIsUpdating(false)
    }
  }

  // Auto-update handlers
  const toggleAutoUpdate = () => {
    if (!isOnDuty) {
      toast.error("Error", { description: "You must be on duty to enable auto-update." })
      return
    }

    if (isAutoUpdateEnabled) {
      disableAutoUpdate()
    } else {
      enableAutoUpdate()
    }
  }

  const enableAutoUpdate = () => {
    handleUpdateLocation()
    setupWatchPosition()
    setupIntervalBackup()
    setIsAutoUpdateEnabled(true)
    toast.success("Auto-update enabled", {
      description: `Your location will be automatically updated every ${updateInterval} seconds.`,
    })
  }

  const disableAutoUpdate = () => {
    autoUpdateIntervalRef.current && clearInterval(autoUpdateIntervalRef.current)
    watchPositionIdRef.current && navigator.geolocation.clearWatch(watchPositionIdRef.current)
    setIsAutoUpdateEnabled(false)
    toast("Auto-update disabled", {
      description: "Your location will no longer be automatically updated.",
    })
  }

  const setupWatchPosition = () => {
    watchPositionIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        try {
          await fetch(`/api/driver/buses/${busId}/locations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: location.lat, lng: location.lng }),
          })
          setCurrentLocation(location)
        } catch (error) {
          console.error("Error updating location:", error)
        }
      },
      (error) => console.error("Geolocation error:", error),
      { enableHighAccuracy: true, maximumAge: 10000 }
    )
  }

  const setupIntervalBackup = () => {
    autoUpdateIntervalRef.current = setInterval(
      () => handleUpdateLocation(),
      updateInterval * 1000
    )
  }

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(10, Number.parseInt(e.target.value) || 60)
    setUpdateInterval(value)

    if (isAutoUpdateEnabled) {
      autoUpdateIntervalRef.current && clearInterval(autoUpdateIntervalRef.current)
      setupIntervalBackup()
      toast.success("Update interval changed", {
        description: `Your location will now be updated every ${value} seconds.`,
      })
    }
  }

  // Cleanup effect
  useEffect(() => {
    return () => {
      markerRef.current?.setMap(null)
      autoUpdateIntervalRef.current && clearInterval(autoUpdateIntervalRef.current)
      watchPositionIdRef.current && navigator.geolocation.clearWatch(watchPositionIdRef.current)
    }
  }, [])

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />
  }

  return (
    <div className="space-y-4">
      <div className="h-[400px] w-full rounded-lg overflow-hidden">
        <div ref={mapRef} className="h-full w-full" />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-update">Auto-Update Location</Label>
            <p className="text-sm text-muted-foreground">
              Automatically update your location while on duty
            </p>
          </div>
          <Switch
            id="auto-update"
            checked={isAutoUpdateEnabled}
            onCheckedChange={toggleAutoUpdate}
            disabled={!isOnDuty}
          />
        </div>

        {isAutoUpdateEnabled && (
          <div className="flex items-center gap-4">
            <div className="w-full max-w-xs">
              <Label htmlFor="update-interval">Update Interval (seconds)</Label>
              <input
                id="update-interval"
                type="range"
                min="10"
                max="300"
                step="10"
                value={updateInterval}
                onChange={handleIntervalChange}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>10s</span>
                <span>{updateInterval}s</span>
                <span>5m</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Current Location</h3>
            {currentLocation ? (
              <p className="text-sm text-muted-foreground">
                Lat: {currentLocation.lat.toFixed(6)}, Lng: {currentLocation.lng.toFixed(6)}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No location data available</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleUpdateLocation}
              disabled={isUpdating || !isOnDuty}
            >
              <Locate className="mr-2 h-4 w-4" />
              {isUpdating ? "Updating..." : "Update Now"}
            </Button>
          </div>
        </div>
      </div>

      {!isOnDuty && (
        <div className="p-4 border rounded-md bg-gold/20 text-gold">
          <p className="text-sm font-medium flex items-center">
            <MapPin className="mr-2 h-4 w-4" />
            You must be on duty to update your location.
          </p>
        </div>
      )}
    </div>
  )
}
