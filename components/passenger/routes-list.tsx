"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Bus, Calendar, Clock, MapPin, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"

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
  busId: string
}

interface BookingsListProps {
  activeBookings: any[]
  pastBookings: any[]
  isLoading: boolean
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const PaymentForm = ({ clientSecret, onSuccess, onCancel }: { clientSecret: string; onSuccess: () => void; onCancel: () => void }) => {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setIsProcessing(true)
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/passenger/bookings',
        },
        redirect: 'if_required',
      })

      if (error) {
        console.error("Payment error:", error)
        toast.error("Payment Failed", { description: error.message || "Payment failed" })
      } else {
        onSuccess()
        toast.success("Success", { description: "Payment successful!" })
      }
    } catch (error) {
      console.error("Payment error:", error)
      toast.error("Payment Failed", { description: "An unexpected error occurred" })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold text-gray-900">Complete Your Payment</h3>
        <p className="text-gray-500">Your booking will be confirmed after payment</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <PaymentElement options={{
            layout: {
              type: 'tabs',
              defaultCollapsed: false,
              radios: false,
              spacedAccordionItems: true
            },
            fields: {
              billingDetails: {
                name: 'auto',
                email: 'auto'
              }
            }
          }} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            <span className="flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Cancel
            </span>
          </Button>

          <Button
            type="submit"
            disabled={isProcessing}
            className="w-full sm:w-auto order-1 sm:order-2 bg-green-600 hover:bg-green-700"
          >
            <span className="flex items-center justify-center gap-2">
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
                    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
                  </svg>
                  Complete Payment
                </>
              )}
            </span>
          </Button>
        </div>
      </form>

      <div className="text-center text-sm text-gray-500 mt-4">
        <p className="flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Secured by Stripe
        </p>
      </div>
    </div>
  )
}

export function RoutesList() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [selectedTurn, setSelectedTurn] = useState<number>(0)
  const [passengers, setPassengers] = useState("1")
  const [isBookingLoading, setIsBookingLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [paymentIntent, setPaymentIntent] = useState<{ clientSecret: string; booking: any } | null>(null)

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const response = await fetch("/api/passenger/routes")
        if (response.ok) {
          const data = await response.json()
          setRoutes(Array.isArray(data) ? data : (data.data ?? []))
        }
      } catch (error) {
        console.error("Failed to fetch routes:", error)
        toast.error("Error", { description: "Failed to load routes. Please try again." })
      } finally {
        setIsLoading(false)
      }
    }

    fetchRoutes()
  }, [])

  const handleBookRoute = async () => {
    if (!selectedRoute) return

    setIsBookingLoading(true)

    try {
      // 1. Create booking and get payment intent
      const response = await fetch("/api/passenger/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          routeId: selectedRoute._id,
          turnIndex: selectedTurn,
          passengers: Number.parseInt(passengers),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Booking failed")
      }

      const data = await response.json()
      setPaymentIntent(data)
    } catch (error) {
      toast.error("Booking failed", {
        description: error instanceof Error ? error.message : "An error occurred during booking",
      })
      setIsBookingLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
  }

  if (routes.length === 0) {
    return (
      <div className="text-center py-8 border rounded-md">
        <Bus className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">No routes available</h3>
        <p className="text-sm text-muted-foreground mt-1">Check back later for new routes.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {routes.map((route) => (
          <Card key={route._id}>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">{route.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <MapPin className="h-4 w-4" />
                    <span>{route.origin} → {route.destination}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Turns</Label>
                  <Select
                    value={selectedTurn.toString()}
                    onValueChange={(value) => {
                      setSelectedTurn(Number.parseInt(value))
                      setSelectedRoute(route)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a turn" />
                    </SelectTrigger>
                    <SelectContent>
                      {route.turns.map((turn, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              {new Date(turn.departureTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })} - {new Date(turn.arrivalTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Number of Passengers</Label>
                  <Input
                    type="number"
                    min="1"
                    max={selectedRoute?.turns[selectedTurn]?.availableSeats || 1}
                    value={passengers}
                    onChange={(e) => setPassengers(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={() => {
                    setSelectedRoute(route)
                    setIsDialogOpen(true)
                  }}
                >
                  Book Now
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Booking</DialogTitle>
            <DialogDescription>
              Please review your booking details before confirming.
            </DialogDescription>
          </DialogHeader>

          {selectedRoute && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Route:</span>
                  <span className="text-sm">{selectedRoute.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">From:</span>
                  <span className="text-sm">{selectedRoute.origin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">To:</span>
                  <span className="text-sm">{selectedRoute.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Departure:</span>
                  <span className="text-sm">
                    {new Date(selectedRoute.turns[selectedTurn].departureTime).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Arrival:</span>
                  <span className="text-sm">
                    {new Date(selectedRoute.turns[selectedTurn].arrivalTime).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Passengers:</span>
                  <span className="text-sm">{passengers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Total Price:</span>
                  <span className="text-sm">
                    Rs. {(selectedRoute.turns[selectedTurn].fare * Number.parseInt(passengers)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {!paymentIntent ? (
              <>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBookRoute} disabled={isBookingLoading}>
                  {isBookingLoading ? "Processing..." : "Proceed to Payment"}
                </Button>
              </>
            ) : (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: paymentIntent.clientSecret,
                  appearance: { theme: 'stripe' },
                }}
              >
                <PaymentForm
                  clientSecret={paymentIntent.clientSecret}
                  onSuccess={async () => {
                    // After successful payment, confirm the booking
                    const confirmResponse = await fetch(`/api/passenger/bookings/${paymentIntent.booking._id}/confirm`, {
                      method: "POST",
                    })

                    if (confirmResponse.ok) {
                      toast.success("Booking successful", {
                        description: "Your booking has been confirmed.",
                      })
                      window.location.href = "/passenger/bookings"
                    } else {
                      toast.error("Booking confirmation failed", {
                        description: "Please contact support",
                      })
                    }
                  }}
                  onCancel={() => {
                    setPaymentIntent(null)
                    setIsDialogOpen(false)
                  }}
                />
              </Elements>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
