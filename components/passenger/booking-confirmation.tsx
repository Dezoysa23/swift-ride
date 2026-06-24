"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Calendar, Clock, MapPin, Users } from "lucide-react"
import { loadStripe } from "@stripe/stripe-js"
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js"

if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set")
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

interface BookingConfirmationProps {
  route: {
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
  }
  turnIndex: number
  passengers: number
}

function PaymentForm({ clientSecret, onSuccess }: { clientSecret: string, onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/passenger/dashboard`,
        },
      })

      if (error) {
        toast.error("Payment failed", { description: error.message })
      } else {
        onSuccess()
      }
    } catch (error) {
      toast.error("Error", { description: "An unexpected error occurred" })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
      >
        {isProcessing ? "Processing..." : "Pay Now"}
      </Button>
    </form>
  )
}

export function BookingConfirmation({ route, turnIndex, passengers }: BookingConfirmationProps) {
  const router = useRouter()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const turn = route.turns[turnIndex]
  const totalFare = turn.fare * passengers

  const handleConfirmBooking = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/passenger/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          routeId: route._id,
          turnIndex,
          passengers,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create booking")
      }

      const data = await response.json()
      setClientSecret(data.clientSecret)
    } catch (error) {
      toast.error("Error", { description: "Failed to create booking. Please try again." })
    } finally {
      setIsLoading(false)
    }
  }

  if (!clientSecret) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Confirm Booking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">{route.name}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{route.origin} → {route.destination}</span>
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

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {passengers} {passengers === 1 ? "Passenger" : "Passengers"}
            </span>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <span className="font-semibold">Total Fare:</span>
            <span className="font-semibold">${totalFare.toFixed(2)}</span>
          </div>

          <Button
            onClick={handleConfirmBooking}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Creating Booking..." : "Confirm Booking"}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Payment</CardTitle>
      </CardHeader>
      <CardContent>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm
            clientSecret={clientSecret}
            onSuccess={() => {
              toast.success("Payment successful", { description: "Your booking has been confirmed." })
              router.push("/passenger/dashboard")
            }}
          />
        </Elements>
      </CardContent>
    </Card>
  )
} 