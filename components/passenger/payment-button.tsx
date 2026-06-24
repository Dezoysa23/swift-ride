"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { CreditCard } from "lucide-react"

interface PaymentButtonProps {
  bookingId: string
  isPaid: boolean
}

export function PaymentButton({ bookingId, isPaid }: PaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handlePayment = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to create checkout session")
      }

      const { url } = await response.json()

      // Redirect to Stripe Checkout
      window.location.href = url
    } catch (error) {
      console.error("Payment error:", error)
      toast.error("Payment Error", {
        description: error instanceof Error ? error.message : "Failed to process payment",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isPaid) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <CreditCard className="h-4 w-4" />
        Paid
      </Button>
    )
  }

  return (
    <Button onClick={handlePayment} disabled={isLoading} className="gap-2">
      <CreditCard className="h-4 w-4" />
      {isLoading ? "Processing..." : "Pay Now"}
    </Button>
  )
}
