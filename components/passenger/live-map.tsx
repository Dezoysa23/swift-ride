"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Bus, Locate, MapPin } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { loadGoogleMapsAPI } from "@/utils/google-maps-loader"

interface BusLocation {
  _id: string
  busNumber: string
  plateNumber: string
  currentRouteId?: {
    _id: string
    name: string
    routeNumber: string
  }
  currentLocation: {
    lat: number
    lng: number
    updatedAt?: string
  }
}

declare global {
  interface Window {
    google: any
  }
}

export function LiveMap() {
  const [buses, setBuses] = useState<BusLocation[]>([])
  const [selectedBus, setSelectedBus] = useState<BusLocation | null>(null)
  const [isMapSdkLoading, setIsMapSdkLoading] = useState(true)
  const [isBusesLoading, setIsBusesLoading] = useState(true)
  const [isMapInitialized, setIsMapInitialized] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const userMarkerRef = useRef<google.maps.Marker | null>(null)

  // Load Google Maps SDK — map div is always in the DOM so mapRef.current is stable
  useEffect(() => {
    loadGoogleMapsAPI({
      onLoad: () => {
        initializeMap()
        setIsMapSdkLoading(false)
      },
    }).catch((error) => {
      console.error("Failed to load Google Maps:", error)
      toast.error("Error", { description: "Failed to load map. Please refresh the page." })
      setIsMapSdkLoading(false)
    })

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null))
      userMarkerRef.current?.setMap(null)
      infoWindowRef.current?.close()
    }
  }, [])

  // Fetch bus locations and poll every 10 s
  useEffect(() => {
    const fetchBusLocations = async () => {
      try {
        const response = await fetch("/api/buses/locations")
        if (response.ok) {
          const data = await response.json()
          setBuses(data.data ?? [])
        }
      } catch (error) {
        console.error("Failed to fetch bus locations:", error)
        toast.error("Error", { description: "Failed to load bus locations. Please try again." })
      } finally {
        setIsBusesLoading(false)
      }
    }

    fetchBusLocations()
    const intervalId = setInterval(fetchBusLocations, 10000)
    return () => clearInterval(intervalId)
  }, [])

  // Update markers whenever bus data or map initialization state changes
  useEffect(() => {
    if (isMapInitialized && buses.length > 0) {
      updateBusMarkers()
    }
  }, [buses, isMapInitialized])

  const initializeMap = () => {
    if (!mapRef.current) {
      console.error("Map container not found")
      return
    }

    infoWindowRef.current = new window.google.maps.InfoWindow()

    const defaultCenter = { lat: 6.9271, lng: 79.8612 } // Colombo, Sri Lanka

    try {
      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        zoom: 12,
        center: defaultCenter,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          { featureType: "transit.station.bus", stylers: [{ visibility: "on" }] },
          { featureType: "transit.line", stylers: [{ visibility: "on" }] },
        ],
      })
      setIsMapInitialized(true)
    } catch (error) {
      console.error("Error creating map:", error)
      toast.error("Error", { description: "Failed to initialize map. Please refresh the page." })
      return
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          setUserLocation(userPos)
          if (googleMapRef.current) {
            googleMapRef.current.setCenter(userPos)
          }
          userMarkerRef.current = new window.google.maps.Marker({
            position: userPos,
            map: googleMapRef.current,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: "#4285F4",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
            title: "Your Location",
          })
        },
        () => {
          toast("Location access denied", {
            description: "We couldn't access your location. Using default map view.",
          })
        },
      )
    }
  }

  const updateBusMarkers = () => {
    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []

    buses.forEach((bus) => {
      if (!googleMapRef.current || !bus.currentLocation) return

      const routeName = bus.currentRouteId?.name ?? "Unknown Route"
      const updatedAt = bus.currentLocation.updatedAt
        ? new Date(bus.currentLocation.updatedAt).toLocaleTimeString()
        : "Unknown"

      const marker = new window.google.maps.Marker({
        position: bus.currentLocation,
        map: googleMapRef.current,
        icon: {
          url: "https://maps.google.com/mapfiles/ms/icons/bus.png",
          scaledSize: new window.google.maps.Size(32, 32),
        },
        title: routeName,
        animation: window.google.maps.Animation.DROP,
      })

      const infoWindowContent = `
        <div style="padding: 8px; max-width: 200px; color: black;">
          <h3 style="font-weight: bold; margin-bottom: 4px;">${routeName}</h3>
          <p style="margin: 0; font-size: 12px;">Last updated: ${updatedAt}</p>
        </div>
      `

      marker.addListener("click", () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(infoWindowContent)
          infoWindowRef.current.open(googleMapRef.current, marker)
          setSelectedBus(bus)
        }
      })

      markersRef.current.push(marker)
    })
  }

  const handleCenterOnUser = () => {
    if (googleMapRef.current && userLocation) {
      googleMapRef.current.setCenter(userLocation)
      googleMapRef.current.setZoom(15)
    } else {
      toast("Location not available", {
        description: "We couldn't access your location.",
      })
    }
  }

  const handleCenterOnBus = (bus: BusLocation) => {
    if (!googleMapRef.current || !bus.currentLocation) return

    googleMapRef.current.setCenter(bus.currentLocation)
    googleMapRef.current.setZoom(16)

    const routeName = bus.currentRouteId?.name ?? "Unknown Route"
    const updatedAt = bus.currentLocation.updatedAt
      ? new Date(bus.currentLocation.updatedAt).toLocaleTimeString()
      : "Unknown"

    const marker = markersRef.current.find(
      (m) =>
        m.getPosition()?.lat() === bus.currentLocation.lat &&
        m.getPosition()?.lng() === bus.currentLocation.lng,
    )

    if (marker && infoWindowRef.current) {
      const infoWindowContent = `
        <div style="padding: 8px; max-width: 200px; color: black;">
          <h3 style="font-weight: bold; margin-bottom: 4px;">${routeName}</h3>
          <p style="margin: 0; font-size: 12px;">Last updated: ${updatedAt}</p>
        </div>
      `
      infoWindowRef.current.setContent(infoWindowContent)
      infoWindowRef.current.open(googleMapRef.current, marker)
      setSelectedBus(bus)
    }
  }

  const isLoading = isMapSdkLoading || isBusesLoading

  return (
    <div className="space-y-4">
      <div className="relative h-[500px] w-full rounded-lg overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}
        <div ref={mapRef} className="h-full w-full" style={{ height: "500px" }} />
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="h-10 w-10 rounded-full shadow-md"
            onClick={handleCenterOnUser}
          >
            <Locate className="h-5 w-5" />
            <span className="sr-only">Center on my location</span>
          </Button>
        </div>

        <div className="absolute bottom-4 left-4 z-10 bg-background/90 p-3 rounded-lg shadow-md backdrop-blur-sm">
          <div className="text-sm font-medium mb-2">Buses Nearby: {buses.length}</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Bus className="h-3 w-3" />
            <span>Live updates every 10 seconds</span>
          </div>
        </div>
      </div>

      {buses.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {buses.map((bus) => (
            <Card
              key={bus._id}
              className={`cursor-pointer transition-colors ${selectedBus?._id === bus._id ? "border-primary" : ""}`}
              onClick={() => handleCenterOnBus(bus)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{bus.currentRouteId?.name ?? "Unknown Route"}</h3>
                    <p className="text-xs text-muted-foreground">
                      Last updated:{" "}
                      {bus.currentLocation?.updatedAt
                        ? new Date(bus.currentLocation.updatedAt).toLocaleTimeString()
                        : "Unknown"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCenterOnBus(bus)
                    }}
                  >
                    <MapPin className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && buses.length === 0 && (
        <div className="text-center py-8 border rounded-md">
          <Bus className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No buses available</h3>
          <p className="text-sm text-muted-foreground mt-1">
            There are no buses currently active in your area.
          </p>
        </div>
      )}
    </div>
  )
}
