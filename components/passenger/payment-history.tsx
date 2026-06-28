import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Receipt, CreditCard, Wallet, MapPin } from "lucide-react"

interface Payment {
  _id: string
  bookingId: string
  amount: number
  paymentMethod: string
  status: "completed" | "failed" | "pending"
  createdAt: string
  booking: {
    route: {
      name: string
      origin: string
      destination: string
    }
  }
}

export function PaymentHistory() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await fetch("/api/passenger/payments")
        if (response.ok) {
          const data = await response.json()
          setPayments(data.data ?? [])
        }
      } catch (error) {
        console.error("Failed to fetch payments:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPayments()
  }, [])

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case "credit card":
        return <CreditCard className="h-4 w-4" />
      case "debit card":
        return <CreditCard className="h-4 w-4" />
      default:
        return <Wallet className="h-4 w-4" />
    }
  }

  const renderPaymentCard = (payment: Payment) => (
    <Card key={payment._id} className="mb-4">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg">{payment.booking.route.name}</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Receipt className="h-4 w-4" />
                <span>Payment ID: {payment._id.substring(0, 8)}</span>
              </div>
            </div>
            <Badge
              variant={
                payment.status === "completed"
                  ? "success"
                  : payment.status === "pending"
                  ? "secondary"
                  : "destructive"
              }
            >
              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <div className="text-sm text-muted-foreground">From</div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{payment.booking.route.origin}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-sm text-muted-foreground">To</div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{payment.booking.route.destination}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-4 mt-2">
            <div className="flex flex-col">
              <div className="text-sm text-muted-foreground">Payment Method</div>
              <div className="flex items-center gap-2 font-medium">
                {getPaymentMethodIcon(payment.paymentMethod)}
                <span>{payment.paymentMethod}</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-sm text-muted-foreground">Amount</div>
              <div className="font-semibold">LKR {payment.amount.toFixed(2)}</div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Paid on {new Date(payment.createdAt).toLocaleString()}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
      </CardHeader>
      {payments.length > 0 ? (
        payments.map(renderPaymentCard)
      ) : (
        <div className="text-center py-8">
          <Receipt className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No Payment History</h3>
          <p className="text-sm text-muted-foreground mt-1">
            You haven&apos;t made any payments yet.
          </p>
        </div>
      )}
    </div>
  )
} 