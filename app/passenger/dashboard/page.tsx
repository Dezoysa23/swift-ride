"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, CreditCard, TicketIcon } from "lucide-react"
import { BookingsList } from "@/components/passenger/bookings-list"
import { RoutesList } from "@/components/passenger/routes-list"
import { LiveMap } from "@/components/passenger/live-map"
import { PaymentHistory } from "@/components/passenger/payment-history"

interface Booking {
  _id: string
  routeId: string
  status: string
  paymentStatus: string
  fare: number
  createdAt: string
}

export default function PassengerDashboard() {
  const { user } = useAuth()
  const [activeBookings, setActiveBookings] = useState<Booking[]>([])
  const [pastBookings, setPastBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await fetch("/api/passenger/bookings")
        if (response.ok) {
          const data = await response.json()
          const all: Booking[] = data.data ?? []
          setActiveBookings(all.filter((b) => ['pending', 'confirmed'].includes(b.status)))
          setPastBookings(all.filter((b) => ['completed', 'cancelled'].includes(b.status)))
        }
      } catch (error) {
        console.error("Failed to fetch bookings:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBookings()
  }, [])

  return (
    <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back{user?.name ? `, ${user.name}` : ''}!</h1>
          <p className="text-muted-foreground">
            Manage your bookings, track buses in real-time, and plan your journeys.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
              <TicketIcon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeBookings.length}</div>
              <p className="text-xs text-muted-foreground">Upcoming trips</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Past Trips</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pastBookings.length}</div>
              <p className="text-xs text-muted-foreground">Completed journeys</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Next Departure</CardTitle>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activeBookings.length > 0 && activeBookings[0].createdAt
                  ? new Date(activeBookings[0].createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                {activeBookings.length > 0
                  ? new Date(activeBookings[0].createdAt).toLocaleDateString()
                  : "No upcoming trips"}
              </p>
            </CardContent>
          </Card>
          {/* <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Buses Nearby</CardTitle>
              <MapPin className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">Within 1km radius</p>
            </CardContent>
          </Card> */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Payment Status</CardTitle>
              <CreditCard className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activeBookings.filter((booking: Booking) => booking.paymentStatus === "paid").length}/{activeBookings.length}
              </div>
              <p className="text-xs text-muted-foreground">Paid bookings</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
            <TabsTrigger value="routes">Available Routes</TabsTrigger>
            <TabsTrigger value="map">Live Map</TabsTrigger>
            <TabsTrigger value="payments">Payment History</TabsTrigger>
          </TabsList>
          <TabsContent value="bookings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>My Bookings</CardTitle>
                <CardDescription>View and manage your upcoming and past bookings.</CardDescription>
              </CardHeader>
              <CardContent>
                <BookingsList activeBookings={activeBookings as any[]} pastBookings={pastBookings as any[]} isLoading={isLoading} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="routes" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Routes</CardTitle>
                <CardDescription>Browse and book available bus routes.</CardDescription>
              </CardHeader>
              <CardContent>
                <RoutesList />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="map" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Live Bus Tracking</CardTitle>
                <CardDescription>Track buses in real-time on the map.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[500px] w-full">
                  <LiveMap />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="payments" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>View your payment history.</CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentHistory />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  )
}

