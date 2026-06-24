"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Turn {
  _id: string
  routeId: string
  departureTime: string
  arrivalTime: string
  status: "pending" | "in_progress" | "completed"
  currentStop: number
  totalStops: number
  availableSeats: number
}

interface TurnManagementProps {
  routeId: string
}

export function TurnManagement({ routeId }: TurnManagementProps) {
  const [currentTurn, setCurrentTurn] = useState<Turn | null>(null)
  const [nextTurn, setNextTurn] = useState<Turn | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchTurns()
  }, [routeId])

  const fetchTurns = async () => {
    try {
      const response = await fetch(`/api/driver/routes/${routeId}/turns`)
      if (response.ok) {
        const data = await response.json()
        setCurrentTurn(data.currentTurn)
        setNextTurn(data.nextTurn)
      }
    } catch (error) {
      console.error("Failed to fetch turns:", error)
      toast.error("Error", {
        description: "Failed to load turn information. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const completeTurn = async () => {
    try {
      const response = await fetch(`/api/driver/turns/${currentTurn?._id}/complete`, {
        method: "POST",
      })

      if (response.ok) {
        toast.success("Success", { description: "Turn completed successfully." })
        // Refresh turns data
        fetchTurns()
      } else {
        const data = await response.json()
        throw new Error(data.message)
      }
    } catch (error) {
      console.error("Failed to complete turn:", error)
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to complete turn. Please try again.",
      })
    }
  }

  const startNextTurn = async () => {
    try {
      const response = await fetch(`/api/driver/turns/${nextTurn?._id}/start`, {
        method: "POST",
      })

      if (response.ok) {
        toast.success("Success", { description: "New turn started successfully." })
        // Refresh turns data
        fetchTurns()
      } else {
        const data = await response.json()
        throw new Error(data.message)
      }
    } catch (error) {
      console.error("Failed to start turn:", error)
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to start turn. Please try again.",
      })
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      {currentTurn && (
        <Card>
          <CardHeader>
            <CardTitle>Current Turn</CardTitle>
            <CardDescription>
              Departure: {formatTime(currentTurn.departureTime)} • Arrival: {formatTime(currentTurn.arrivalTime)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Progress</p>
                  <p className="text-2xl font-bold">
                    {currentTurn.currentStop} / {currentTurn.totalStops}
                  </p>
                  <p className="text-xs text-muted-foreground">Stops completed</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Available Seats</p>
                  <p className="text-2xl font-bold">{currentTurn.availableSeats}</p>
                  <p className="text-xs text-muted-foreground">Seats remaining</p>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={completeTurn}
                disabled={currentTurn.status === "completed"}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete Turn
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {nextTurn && (
        <Card>
          <CardHeader>
            <CardTitle>Next Turn</CardTitle>
            <CardDescription>
              Departure: {formatTime(nextTurn.departureTime)} • Arrival: {formatTime(nextTurn.arrivalTime)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Ready to start</AlertTitle>
                <AlertDescription>
                  You can start the next turn once the current turn is completed.
                </AlertDescription>
              </Alert>

              <Button
                className="w-full"
                onClick={startNextTurn}
                disabled={currentTurn?.status !== "completed"}
              >
                Start Next Turn
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!currentTurn && !nextTurn && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">No turns scheduled for this route.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
