"use client"

import Link from "next/link"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Bus, Calendar, Clock, MapPin, QrCode, Badge, TicketIcon, Trash2, Navigation } from "lucide-react"
import { Users } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { QRCodeSVG } from "qrcode.react"
import { Printer } from "lucide-react"

// Add the PaymentButton import at the top of the file
import { PaymentButton } from "@/components/passenger/payment-button"

interface Route {
  _id: string
  name: string
  origin: string
  destination: string
  turns: {
    departureTime: string
    arrivalTime: string
    fare: number
    availableSeats: number
  }[]
  status: string
}

interface Booking {
  _id: string
  routeId: string
  turnIndex: number
  passengers: number
  status: string
  paymentStatus: string
  paymentIntentId?: string
  totalFare: number
  route: Route
  createdAt: string
}

interface BookingsListProps {
  activeBookings: Booking[]
  pastBookings: Booking[]
  isLoading: boolean
}

export function BookingsList({ activeBookings, pastBookings, isLoading }: BookingsListProps) {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isQrOpen, setIsQrOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [bookingToDelete, setBookingToDelete] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  const handlePrint = () => {
    setIsPrinting(true)
    window.print()
    setTimeout(() => setIsPrinting(false), 1000)
  }

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/passenger/bookings/${bookingId}/cancel`, {
        method: "POST",
      })

      if (response.ok) {
        toast.success("Booking cancelled", {
          description: "Your booking has been cancelled successfully.",
        })
        // Refresh bookings after cancellation
        window.location.reload()
      } else {
        throw new Error("Failed to cancel booking")
      }
    } catch (error) {
      toast.error("Error", {
        description: "Failed to cancel booking. Please try again.",
      })
    }
  }

  const confirmDelete = (bookingId: string) => {
    setBookingToDelete(bookingId)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!bookingToDelete) return
    try {
      const response = await fetch(`/api/passenger/bookings/${bookingToDelete}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Success", { description: "Booking deleted successfully" })
        setIsDeleteDialogOpen(false)
        window.location.reload()
      } else {
        toast.error("Error", { description: data.message || "Failed to delete booking" })
      }
    } catch (error) {
      console.error("Error deleting booking:", error)
      toast.error("Error", { description: "Failed to delete booking. Please try again." })
    }
  }

  const renderSkeletons = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const renderBookingCard = (booking: Booking) => {
    if (!booking.route) {
      return (
        <Card key={booking._id}>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">Route Information Unavailable</h3>
                  <div className="text-sm text-muted-foreground mt-1">
                    Booking ID: {booking._id}
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className={`px-2 py-1 text-xs font-semibold rounded-full ${booking.status === "confirmed" ? "bg-teal/15 text-teal" : "bg-muted text-foreground"}`}>
                    {booking.status}
                  </div>
                  <div className={`px-2 py-1 text-xs font-semibold rounded-full ${booking.paymentStatus === "completed" ? "bg-teal/15 text-teal" : "bg-destructive/10 text-destructive"}`}>
                    {booking.paymentStatus}
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                This booking&apos;s route information is no longer available.
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    const turn = booking.route.turns[booking.turnIndex]
    if (!turn) return null

    return (
      <Card key={booking._id}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{booking.route.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <MapPin className="h-4 w-4" />
                  <span>{booking.route.origin} → {booking.route.destination}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <div className={`px-2 py-1 text-xs font-semibold rounded-full ${booking.status === "confirmed" ? "bg-teal/15 text-teal" : "bg-muted text-foreground"}`}>
                  {booking.status}
                </div>
                <div className={`px-2 py-1 text-xs font-semibold rounded-full ${booking.paymentStatus === "completed" ? "bg-teal/15 text-teal" : "bg-destructive/10 text-destructive"}`}>
                  {booking.paymentStatus}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {new Date(turn.departureTime).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {new Date(turn.departureTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4" />
                {booking.passengers} passenger{booking.passengers > 1 ? "s" : ""}
              </div>
              {/* Show delete button only for past bookings */}
              {booking.route && new Date(booking.route.turns[booking.turnIndex].departureTime) <= new Date() && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => confirmDelete(booking._id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <div className="font-semibold">
                Rs. {(turn.fare * booking.passengers).toFixed(2)}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {/* Track driver — available for all active bookings */}
              {(booking.status === "pending" || booking.status === "confirmed") && (
                <Button
                  variant="outline"
                  className="flex-1 min-w-[110px] border-primary text-primary hover:bg-primary/10"
                  asChild
                >
                  <Link href={`/passenger/tracking/${booking._id}`}>
                    <Navigation className="h-4 w-4 mr-2" />
                    Track Driver
                  </Link>
                </Button>
              )}
              <Button
                variant="outline"
                className="flex-1 min-w-[110px]"
                onClick={() => {
                  setSelectedBooking(booking)
                  setIsDialogOpen(true)
                }}
              >
                <QRCodeSVG value={booking._id} className="h-4 w-4 mr-2" />
                View Ticket
              </Button>
              {booking.status === "pending" && booking.paymentStatus === "pending" && (
                <Button
                  variant="default"
                  className="flex-1 bg-teal hover:bg-teal/90"
                  onClick={async () => {
                    try {
                      const response = await fetch(`/api/passenger/bookings/${booking._id}/confirm`, {
                        method: "POST",
                      })

                      if (!response.ok) {
                        throw new Error("Failed to process payment")
                      }

                      const { clientSecret } = await response.json()

                      // Redirect to the payment confirmation page
                      window.location.href = `/passenger/bookings?payment=${booking._id}&client_secret=${clientSecret}`
                    } catch (error) {
                      toast.error("Error", {
                        description: "Failed to process payment. Please try again.",
                      })
                    }
                  }}
                >
                  Complete Payment
                </Button>
              )}
              {booking.status === "pending" && (
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleCancelBooking(booking._id)}
                >
                  Cancel Booking
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          {selectedBooking && selectedBooking.route && (
            <div className="space-y-6">
              <DialogHeader>
                <DialogTitle>Bus Ticket</DialogTitle>
                <DialogDescription>
                  Please show this ticket when boarding the bus
                </DialogDescription>
              </DialogHeader>

              <div className="bg-card rounded-lg p-6 space-y-4 border-2 border-dashed border-border print:border-none">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">SwiftRide</h3>
                    <p className="text-sm text-muted-foreground">SwiftRide - Your Trusted Travel Partner</p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">Ticket #{selectedBooking._id.slice(-6)}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(selectedBooking.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">From</div>
                    <div className="font-semibold text-foreground">{selectedBooking.route.origin}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">To</div>
                    <div className="font-semibold text-foreground">{selectedBooking.route.destination}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Date</div>
                    <div className="font-semibold text-foreground">
                      {new Date(selectedBooking.route.turns[selectedBooking.turnIndex].departureTime).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Time</div>
                    <div className="font-semibold text-foreground">
                      {new Date(selectedBooking.route.turns[selectedBooking.turnIndex].departureTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Passengers</div>
                    <div className="font-semibold text-foreground">{selectedBooking.passengers}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Fare</div>
                    <div className="font-semibold text-foreground">Rs. {selectedBooking.totalFare.toFixed(2)}</div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="bg-muted p-4 rounded-lg">
                    <QRCodeSVG
                      value={JSON.stringify({
                        id: selectedBooking._id,
                        route: selectedBooking.route.name,
                        passengers: selectedBooking.passengers,
                        status: selectedBooking.status
                      })}
                      size={150}
                      level="H"
                      includeMargin
                    />
                  </div>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  Status: <span className="font-semibold">{selectedBooking.status.toUpperCase()}</span>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Close
                </Button>
                <Button
                  onClick={handlePrint}
                  disabled={isPrinting}
                  className="bg-teal hover:bg-teal/90"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  {isPrinting ? 'Printing...' : 'Print Ticket'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this booking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-4 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="active">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="active">Active Bookings</TabsTrigger>
          <TabsTrigger value="past">Past Bookings</TabsTrigger>
        </TabsList>
      <TabsContent value="active">
        {isLoading ? (
          renderSkeletons()
        ) : activeBookings.length > 0 ? (
          <div className="space-y-4">
            {activeBookings.map(renderBookingCard)}
          </div>
        ) : (
          <div className="text-center py-8">
            <h3 className="font-semibold text-lg">No active bookings</h3>
            <p className="text-muted-foreground mt-1">You don&apos;t have any upcoming trips.</p>
            <Button className="mt-4" asChild>
              <Link href="/passenger/routes">Book a Trip</Link>
            </Button>
          </div>
        )}
      </TabsContent>
      <TabsContent value="past">
        {isLoading ? (
          renderSkeletons()
        ) : pastBookings.length > 0 ? (
          <div className="space-y-4">
            {pastBookings.map(renderBookingCard)}
          </div>
        ) : (
          <div className="text-center py-8">
            <h3 className="font-semibold text-lg">No past bookings</h3>
            <p className="text-muted-foreground mt-1">You haven&apos;t taken any trips yet.</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
    </>
  )
}
