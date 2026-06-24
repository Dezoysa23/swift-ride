"use client"

import { useEffect, useState, useRef } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Bus, MapPin, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { loadGoogleMapsAPI } from "@/utils/google-maps-loader"

declare global {
  interface Window {
    google: any
  }
}
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface BusLocation {
  _id: string
  routeId: string
  routeName: string
  busId: string
  registrationNumber: string
  driverName: string
  currentLocation: {
    lat: number
    lng: number
  }
  lastUpdated: string
}

export function FleetMap() {
  const [buses, setBuses] = useState<BusLocation[]>([])
  const [filteredBuses, setFilteredBuses] = useState<BusLocation[]>([])
  const [selectedBus, setSelectedBus] = useState<BusLocation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<Record<string, google.maps.Marker>>({})
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const boundsRef = useRef<google.maps.LatLngBounds | null>(null)

  useEffect(() => {
    // Load Google Maps API using shared loader
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

    return () => {
      // Clean up markers
      Object.values(markersRef.current).forEach((marker) => marker.setMap(null))

      if (infoWindowRef.current) {
        infoWindowRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    // Fetch bus locations
    const fetchBusLocations = async () => {
      try {
        const response = await fetch("/api/admin/fleet/locations")
        if (response.ok) {
          const data = await response.json()
          setBuses(data)
          setFilteredBuses(data)
        }
      } catch (error) {
        console.error("Failed to fetch bus locations:", error)
        toast.error("Error", { description: "Failed to load bus locations. Please try again." })
      } finally {
        setIsLoading(false)
      }
    }

    fetchBusLocations()

    // Set up polling for real-time updates
    const intervalId = setInterval(fetchBusLocations, 10000) // Update every 10 seconds

    return () => clearInterval(intervalId)
  }, [])

  useEffect(() => {
    // Filter buses based on search term
    if (searchTerm.trim() === "") {
      setFilteredBuses(buses)
    } else {
      const term = searchTerm.toLowerCase()
      const filtered = buses.filter(
        (bus) =>
          bus.routeName.toLowerCase().includes(term) ||
          bus.registrationNumber.toLowerCase().includes(term) ||
          bus.driverName.toLowerCase().includes(term),
      )
      setFilteredBuses(filtered)
    }
  }, [searchTerm, buses])

  useEffect(() => {
    // Update markers when buses or map changes
    if (googleMapRef.current && filteredBuses.length > 0) {
      updateBusMarkers()
    }
  }, [filteredBuses, googleMapRef.current])

  const initializeMap = () => {
    if (!mapRef.current) return

    // Create info window
    infoWindowRef.current = new google.maps.InfoWindow()

    // Create bounds
    boundsRef.current = new google.maps.LatLngBounds()

    // Default center (can be a city center)
    const defaultCenter = { lat: 6.9271, lng: 79.8612 } // Colombo, Sri Lanka

    // Create map
    googleMapRef.current = new google.maps.Map(mapRef.current, {
      zoom: 10,
      center: defaultCenter,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        {
          featureType: "transit.station.bus",
          stylers: [{ visibility: "on" }],
        },
        {
          featureType: "transit.line",
          stylers: [{ visibility: "on" }],
        },
      ],
    })

    // Update bus markers if data is already loaded
    if (filteredBuses.length > 0) {
      updateBusMarkers()
    }
  }

  const updateBusMarkers = () => {
    if (!googleMapRef.current || !boundsRef.current) return

    // Track existing bus IDs
    const existingBusIds = new Set(filteredBuses.map((bus) => bus._id))

    // Remove markers for buses that are no longer in the filtered list
    Object.keys(markersRef.current).forEach((busId) => {
      if (!existingBusIds.has(busId)) {
        markersRef.current[busId].setMap(null)
        delete markersRef.current[busId]
      }
    })

    // Reset bounds
    boundsRef.current = new google.maps.LatLngBounds()

    // Add or update markers for each bus
    filteredBuses.forEach((bus) => {
      const position = new google.maps.LatLng(bus.currentLocation.lat, bus.currentLocation.lng)

      // Extend bounds
      boundsRef.current?.extend(position)

      // If marker already exists, update its position
      if (markersRef.current[bus._id]) {
        markersRef.current[bus._id].setPosition(position)
      } else {
        // Create new marker
        const marker = new google.maps.Marker({
          position,
          map: googleMapRef.current,
          icon: {
            url: "https://maps.google.com/mapfiles/ms/icons/bus.png",
            scaledSize: new google.maps.Size(32, 32),
          },
          title: bus.routeName,
          animation: google.maps.Animation.DROP,
        })

        // Add click listener
        marker.addListener("click", () => {
          if (infoWindowRef.current) {
            const infoWindowContent = `
             <div class="p-3 max-w-xs bg-white rounded-xl shadow-md text-black">
  <h3 class="text-lg font-semibold mb-1">${bus.routeName}</h3>
  <p class="text-sm">🚌 <span class="font-medium">Bus:</span> ${bus.registrationNumber}</p>
  <p class="text-sm">👨‍✈️ <span class="font-medium">Driver:</span> ${bus.driverName}</p>
  <p class="text-sm text-gray-600">⏱ <span class="font-medium">Last updated:</span> ${new Date(bus.lastUpdated).toLocaleTimeString()}</p>
</div>

            `
            infoWindowRef.current.setContent(infoWindowContent)
            infoWindowRef.current.open(googleMapRef.current, marker)
            setSelectedBus(bus)
          }
        })

        // Store marker reference
        markersRef.current[bus._id] = marker
      }
    })

    // Fit map to bounds if we have buses
    if (filteredBuses.length > 0 && boundsRef.current) {
      googleMapRef.current.fitBounds(boundsRef.current)

      // Don't zoom in too far
      const listener = google.maps.event.addListener(googleMapRef.current, "idle", () => {
        if (googleMapRef.current && googleMapRef.current.getZoom() > 15) {
          googleMapRef.current.setZoom(15)
        }
        google.maps.event.removeListener(listener)
      })
    }
  }

  const handleCenterOnBus = (bus: BusLocation) => {
    if (googleMapRef.current) {
      googleMapRef.current.setCenter(bus.currentLocation)
      googleMapRef.current.setZoom(16)

      // Open info window for this bus
      const marker = markersRef.current[bus._id]
      if (marker && infoWindowRef.current) {
        const infoWindowContent = `
          <div style="padding: 8px; max-width: 250px;">
            <h3 style="font-weight: bold; margin-bottom: 4px;">${bus.routeName}</h3>
            <p style="margin: 0; font-size: 12px;">Bus: ${bus.registrationNumber}</p>
            <p style="margin: 0; font-size: 12px;">Driver: ${bus.driverName}</p>
            <p style="margin: 0; font-size: 12px;">Last updated: ${new Date(bus.lastUpdated).toLocaleTimeString()}</p>
          </div>
        `
        infoWindowRef.current.setContent(infoWindowContent)
        infoWindowRef.current.open(googleMapRef.current, marker)
        setSelectedBus(bus)
      }
    }
  }

  const handleFitAllBuses = () => {
    if (googleMapRef.current && boundsRef.current && filteredBuses.length > 0) {
      googleMapRef.current.fitBounds(boundsRef.current)
    } else {
      toast("No buses to display", { description: "There are no buses currently active." })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search buses..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Button variant="outline" onClick={handleFitAllBuses}>
          <MapPin className="mr-2 h-4 w-4" />
          Show All Buses
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="p-4">
            <CardTitle>Live Fleet Map</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative h-[500px] w-full">
              <div ref={mapRef} className="h-full w-full" />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/60 z-10">
                  <Skeleton className="h-full w-full" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4">
            <CardTitle>Active Buses ({filteredBuses.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredBuses.length > 0 ? (
              <div className="max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Route</TableHead>
                      <TableHead>Bus</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBuses.map((bus) => (
                      <TableRow key={bus._id} className={selectedBus?._id === bus._id ? "bg-muted" : ""}>
                        <TableCell className="font-medium">{bus.routeName}</TableCell>
                        <TableCell>{bus.registrationNumber}</TableCell>
                        <TableCell>{bus.driverName}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleCenterOnBus(bus)}>
                            <MapPin className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 h-[300px]">
                <Bus className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No buses found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

