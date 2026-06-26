"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Check, QrCode, Search, Users } from "lucide-react"
import { Input } from "@/components/ui/input"

interface Passenger {
  _id: string
  bookingId: string
  name: string
  email: string
  passengers: number
  status: "confirmed" | "checked_in" | "cancelled"
}

interface PassengerListProps {
  routeId: string
}

export function PassengerList({ routeId }: PassengerListProps) {
  const [passengers, setPassengers] = useState<Passenger[]>([])
  const [filteredPassengers, setFilteredPassengers] = useState<Passenger[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    const fetchPassengers = async () => {
      try {
        const response = await fetch(`/api/driver/routes/${routeId}/passengers`)
        if (response.ok) {
          const data = await response.json()
          setPassengers(data)
          setFilteredPassengers(data)
        }
      } catch (error) {
        console.error("Failed to fetch passengers:", error)
        toast.error("Error", {
          description: "Failed to load passenger list. Please try again.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchPassengers()
  }, [routeId])

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredPassengers(passengers)
    } else {
      const term = searchTerm.toLowerCase()
      const filtered = passengers.filter(
        (passenger) =>
          passenger.name.toLowerCase().includes(term) ||
          passenger.email.toLowerCase().includes(term) ||
          passenger.bookingId.toLowerCase().includes(term),
      )
      setFilteredPassengers(filtered)
    }
  }, [searchTerm, passengers])

  const handleCheckIn = async (passengerId: string, bookingId: string) => {
    try {
      const response = await fetch(`/api/driver/passengers/${bookingId}/boarding`, {
        method: "POST",
      })

      if (response.ok) {
        // Update passenger status in state
        setPassengers(
          passengers.map((passenger) =>
            passenger._id === passengerId ? { ...passenger, status: "checked_in" } : passenger,
          ),
        )
        setFilteredPassengers(
          filteredPassengers.map((passenger) =>
            passenger._id === passengerId ? { ...passenger, status: "checked_in" } : passenger,
          ),
        )

        toast.success("Passenger checked in", {
          description: "The passenger has been successfully checked in.",
        })
      } else {
        throw new Error("Failed to check in passenger")
      }
    } catch (error) {
      toast.error("Error", {
        description: "Failed to check in passenger. Please try again.",
      })
    }
  }

  const handleViewBooking = (passenger: Passenger) => {
    setSelectedPassenger(passenger)
    setIsDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search passengers..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredPassengers.length === 0 ? (
        <div className="text-center py-8 border rounded-md">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No passengers found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {passengers.length === 0
              ? "There are no passengers booked for this route yet."
              : "No passengers match your search criteria."}
          </p>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Booking ID</TableHead>
                <TableHead>Passengers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPassengers.map((passenger) => (
                <TableRow key={passenger._id}>
                  <TableCell className="font-medium">{passenger.name}</TableCell>
                  <TableCell>{passenger.email}</TableCell>
                  <TableCell>{passenger.bookingId.substring(0, 8)}</TableCell>
                  <TableCell>{passenger.passengers}</TableCell>
                  <TableCell>
                    <div
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        passenger.status === "checked_in"
                          ? "bg-teal/15 text-teal"
                          : passenger.status === "cancelled"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-primary/10 text-primary"
                      }`}
                    >
                      {passenger.status === "checked_in"
                        ? "Checked In"
                        : passenger.status === "cancelled"
                          ? "Cancelled"
                          : "Confirmed"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewBooking(passenger)}>
                        <QrCode className="mr-2 h-4 w-4" />
                        View
                      </Button>
                      {passenger.status === "confirmed" && (
                        <Button variant="default" size="sm" onClick={() => handleCheckIn(passenger._id, passenger.bookingId)}>
                          <Check className="mr-2 h-4 w-4" />
                          Check In
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>Passenger booking information and QR code.</DialogDescription>
          </DialogHeader>
          {selectedPassenger && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="bg-black text-white p-4 rounded-lg">
                <QrCode className="h-32 w-32" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-lg">{selectedPassenger.name}</h3>
                <p className="text-sm text-muted-foreground">Booking ID: {selectedPassenger.bookingId}</p>
                <p className="text-sm">
                  {selectedPassenger.passengers} {selectedPassenger.passengers === 1 ? "passenger" : "passengers"}
                </p>
                <div
                  className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedPassenger.status === "checked_in"
                      ? "bg-teal/15 text-teal"
                      : selectedPassenger.status === "cancelled"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-primary/10 text-primary"
                  }`}
                >
                  {selectedPassenger.status === "checked_in"
                    ? "Checked In"
                    : selectedPassenger.status === "cancelled"
                      ? "Cancelled"
                      : "Confirmed"}
                </div>
              </div>
              {selectedPassenger.status === "confirmed" && (
                <Button
                  className="mt-2"
                  onClick={() => {
                    handleCheckIn(selectedPassenger._id, selectedPassenger.bookingId)
                    setIsDialogOpen(false)
                  }}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Check In Passenger
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
