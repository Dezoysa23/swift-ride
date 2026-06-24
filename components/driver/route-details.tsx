"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Clock, MapPin } from "lucide-react"
import { TurnManagement } from "./turn-management"

interface RouteStop {
  name: string
  arrivalTime: string
  departureTime: string
  coordinates: {
    lat: number
    lng: number
  }
}

interface RouteDetails {
  _id: string
  name: string
  origin: string
  destination: string
  departureTime: string
  arrivalTime: string
  busId: string
  busRegistration: string
  busModel: string
  stops: RouteStop[]
}

interface RouteDetailsProps {
  routeId: string
}

export function RouteDetails({ routeId }: RouteDetailsProps) {
  const [routeDetails, setRouteDetails] = useState<RouteDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchRouteDetails = async () => {
      try {
        const response = await fetch(`/api/driver/routes/${routeId}`)
        if (response.ok) {
          const data = await response.json()
          setRouteDetails(data)
        }
      } catch (error) {
        console.error("Failed to fetch route details:", error)
        toast.error("Error", {
          description: "Failed to load route details. Please try again.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchRouteDetails()
  }, [routeId])

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!routeDetails) {
    return (
      <div className="text-center py-8">
        <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Route not found</h3>
        <p className="text-sm text-muted-foreground mt-1">The route details could not be found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Route Information</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">Route Name:</div>
            <div>{routeDetails.name}</div>
            <div className="font-medium">Origin:</div>
            <div>{routeDetails.origin}</div>
            <div className="font-medium">Destination:</div>
            <div>{routeDetails.destination}</div>
            <div className="font-medium">Departure:</div>
            <div>
              {formatTime(routeDetails.departureTime)} on {formatDate(routeDetails.departureTime)}
            </div>
            <div className="font-medium">Arrival:</div>
            <div>
              {formatTime(routeDetails.arrivalTime)} on {formatDate(routeDetails.arrivalTime)}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-medium">Bus Information</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">Bus ID:</div>
            <div>{routeDetails.busId}</div>
            <div className="font-medium">Registration:</div>
            <div>{routeDetails.busRegistration}</div>
            <div className="font-medium">Model:</div>
            <div>{routeDetails.busModel}</div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <TurnManagement routeId={routeId} />

        <div className="space-y-2">
          <h3 className="text-lg font-medium">Stops</h3>
          {routeDetails.stops && routeDetails.stops.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stop Name</TableHead>
                  <TableHead>Arrival Time</TableHead>
                  <TableHead>Departure Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routeDetails.stops.map((stop, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{stop.name}</TableCell>
                    <TableCell>{formatTime(stop.arrivalTime)}</TableCell>
                    <TableCell>{formatTime(stop.departureTime)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-4 border rounded-md">
              <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">No stops have been defined for this route.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
