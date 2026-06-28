"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { RouteDetails } from "@/components/driver/route-details"
import { PassengerList } from "@/components/driver/passenger-list"
import { LocationUpdater } from "@/components/driver/location-updater"
import { ActiveTrip } from "@/components/driver/active-trip"
import type { TripStatus } from "@/components/driver/active-trip"
import { Bus, Clock, MapPin, Users } from "lucide-react"

interface DriverRoute {
  _id: string
  name: string
  origin: string
  destination: string
  departureTime: string
  arrivalTime: string
  busId: string
  busRegistration: string
  passengerCount: number
}

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

export default function DriverDashboard() {
  const { user } = useAuth()
  const [assignedRoute, setAssignedRoute] = useState<DriverRoute | null>(null)
  const [activeBooking, setActiveBooking] = useState<ActiveBooking | null>(null)
  const [isOnDuty, setIsOnDuty] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        const [routeRes, bookingRes] = await Promise.all([
          fetch("/api/driver/route"),
          fetch("/api/driver/active-booking"),
        ])
        if (routeRes.ok) {
          const data = await routeRes.json()
          setAssignedRoute(data.data ?? null)
        }
        if (bookingRes.ok) {
          const data = await bookingRes.json()
          setActiveBooking(data.booking ?? null)
        }
      } catch (error) {
        console.error("Failed to fetch driver data:", error)
        toast.error("Error", { description: "Failed to load your assigned route. Please try again." })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDriverData()
  }, [])

  const handleDutyToggle = async () => {
    try {
      const response = await fetch("/api/driver/duty-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: !isOnDuty ? 'active' : 'inactive' }),
      })

      if (response.ok) {
        setIsOnDuty(!isOnDuty)
        toast(!isOnDuty ? "You are now on duty" : "You are now off duty", {
          description: !isOnDuty
            ? "Your location will be shared with passengers."
            : "Your location will no longer be shared.",
        })
      } else {
        throw new Error("Failed to update duty status")
      }
    } catch (error) {
      toast.error("Error", { description: "Failed to update your duty status. Please try again." })
    }
  }

  return (
    <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Welcome{user?.name ? `, ${user.name}` : ''}!</h1>
          <p className="text-muted-foreground">Manage your assigned route and update your location.</p>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isOnDuty ? "bg-green-500" : "bg-red-500"}`}></div>
            <span className="font-medium">Status: {isOnDuty ? "On Duty" : "Off Duty"}</span>
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="duty-mode" checked={isOnDuty} onCheckedChange={handleDutyToggle} disabled={!assignedRoute} />
            <Label htmlFor="duty-mode">{isOnDuty ? "Go Off Duty" : "Go On Duty"}</Label>
          </div>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        ) : !assignedRoute ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Bus className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No Route Assigned</h3>
              <p className="text-sm text-muted-foreground mt-1">
                You haven&apos;t been assigned to any route yet. Please contact the administrator.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Route</CardTitle>
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{assignedRoute.name}</div>
                  <p className="text-xs text-muted-foreground">
                    {assignedRoute.origin} to {assignedRoute.destination}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Departure</CardTitle>
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Date(assignedRoute.departureTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(assignedRoute.departureTime).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Bus</CardTitle>
                  <Bus className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{assignedRoute.busRegistration}</div>
                  <p className="text-xs text-muted-foreground">Registration Number</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Passengers</CardTitle>
                  <Users className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{assignedRoute.passengerCount}</div>
                  <p className="text-xs text-muted-foreground">Booked passengers</p>
                </CardContent>
              </Card>
            </div>

            {activeBooking && (
              <ActiveTrip
                booking={activeBooking}
                onStatusChange={(newStatus) =>
                  setActiveBooking((prev) =>
                    prev ? { ...prev, tripStatus: newStatus } : prev
                  )
                }
              />
            )}

            <Tabs defaultValue="route" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="route">Route Details</TabsTrigger>
                <TabsTrigger value="passengers">Passenger List</TabsTrigger>
                <TabsTrigger value="location">Update Location</TabsTrigger>
              </TabsList>
              <TabsContent value="route" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Route Details</CardTitle>
                    <CardDescription>View details of your assigned route.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RouteDetails routeId={assignedRoute._id} />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="passengers" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Passenger List</CardTitle>
                    <CardDescription>View the list of passengers for your route.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PassengerList routeId={assignedRoute._id} />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="location" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Update Location</CardTitle>
                    <CardDescription>Update your current location for passengers to track.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LocationUpdater routeId={assignedRoute._id} busId={assignedRoute.busId} isOnDuty={isOnDuty} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
  )
}
