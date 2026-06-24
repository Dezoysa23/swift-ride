"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Bus, Edit, Plus, Trash } from "lucide-react"

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
  driverId?: string
}

interface BusType {
  _id: string
  registrationNumber: string
  model: string
  capacity: number
}

export function RouteManagement() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [buses, setBuses] = useState<BusType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    origin: "",
    destination: "",
    turns: [
      {
        departureTime: "",
        arrivalTime: "",
        fare: "",
        availableSeats: "40"
      }
    ],
    busId: "",
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch routes
        const routesResponse = await fetch("/api/admin/routes")
        if (routesResponse.ok) {
          const routesData = await routesResponse.json()
          setRoutes(routesData)
        }

        // Fetch buses
        const busesResponse = await fetch("/api/admin/buses")
        if (busesResponse.ok) {
          const busesData = await busesResponse.json()
          setBuses(busesData)
        }
      } catch (error) {
        console.error("Failed to fetch data:", error)
        toast.error("Error", { description: "Failed to load data. Please try again." })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    if (name === "busId") {
      // Find the selected bus
      const selectedBus = buses.find(bus => bus._id === value)
      // Update form data with bus ID and set available seats to bus capacity
      setFormData(prev => ({
        ...prev,
        busId: value,
        turns: prev.turns.map(turn => ({
          ...turn,
          availableSeats: selectedBus ? selectedBus.capacity.toString() : "40"
        }))
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      origin: "",
      destination: "",
      turns: [
        {
          departureTime: "",
          arrivalTime: "",
          fare: "",
          availableSeats: "40"
        }
      ],
      busId: "",
    })
    setCurrentRoute(null)
    setIsEditMode(false)
  }

  const handleEditRoute = (route: Route) => {
    setCurrentRoute(route)
    setFormData({
      name: route.name,
      origin: route.origin,
      destination: route.destination,
      turns: route.turns.map((turn) => ({
        departureTime: new Date(turn.departureTime).toISOString().slice(0, 16),
        arrivalTime: new Date(turn.arrivalTime).toISOString().slice(0, 16),
        fare: turn.fare.toString(),
        availableSeats: turn.availableSeats.toString(),
      })),
      busId: route.busId,
    })
    setIsEditMode(true)
    setIsDialogOpen(true)
  }

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm("Are you sure you want to delete this route?")) return

    try {
      const response = await fetch(`/api/admin/routes/${routeId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Route deleted", { description: "The route has been deleted successfully." })
        // Remove from state
        setRoutes(routes.filter((route) => route._id !== routeId))
      } else {
        throw new Error("Failed to delete route")
      }
    } catch (error) {
      toast.error("Error", { description: "Failed to delete route. Please try again." })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const payload = {
        ...formData,
        turns: formData.turns.map(t => ({
          ...t,
          fare: Number.parseFloat(t.fare),
          availableSeats: Number.parseInt(t.availableSeats, 10),
        })),
      }

      let response

      if (isEditMode && currentRoute) {
        // Update existing route
        response = await fetch(`/api/admin/routes/${currentRoute._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })
      } else {
        // Create new route
        response = await fetch("/api/admin/routes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })
      }

      if (response.ok) {
        const data = await response.json()

        if (isEditMode) {
          // Update in state
          setRoutes(routes.map((route) => (route._id === currentRoute?._id ? { ...route, ...data } : route)))
          toast.success("Route updated", { description: "The route has been updated successfully." })
        } else {
          // Add to state
          setRoutes([...routes, data])
          toast.success("Route created", { description: "The new route has been created successfully." })
        }

        // Close dialog and reset form
        setIsDialogOpen(false)
        resetForm()
      } else {
        const error = await response.json()
        throw new Error(error.message || "Failed to save route")
      }
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "An error occurred while saving the route",
      })
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
  }

  const handleAddTurn = () => {
    // Get the selected bus's capacity
    const selectedBus = buses.find(bus => bus._id === formData.busId)
    const defaultSeats = selectedBus ? selectedBus.capacity.toString() : "40"

    setFormData(prev => ({
      ...prev,
      turns: [
        ...prev.turns,
        {
          departureTime: "",
          arrivalTime: "",
          fare: "",
          availableSeats: defaultSeats
        }
      ]
    }))
  }

  const handleRemoveTurn = (index: number) => {
    setFormData(prev => ({
      ...prev,
      turns: prev.turns.filter((_, i) => i !== index)
    }))
  }

  const handleTurnChange = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      turns: prev.turns.map((turn, i) => 
        i === index ? { ...turn, [field]: value } : turn
      )
    }))
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="border rounded-md">
          <div className="h-10 px-4 border-b flex items-center">
            <Skeleton className="h-4 w-full" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border-b last:border-0">
              <div className="grid grid-cols-6 gap-4">
                <Skeleton className="h-4 col-span-1" />
                <Skeleton className="h-4 col-span-1" />
                <Skeleton className="h-4 col-span-1" />
                <Skeleton className="h-4 col-span-1" />
                <Skeleton className="h-4 col-span-1" />
                <Skeleton className="h-4 col-span-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Routes</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm()
                setIsEditMode(false)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Route
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{isEditMode ? "Edit Route" : "Add New Route"}</DialogTitle>
              <DialogDescription>
                {isEditMode ? "Update the route details below." : "Fill in the route details below."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Route Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., City Express"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="busId">Bus</Label>
                    <Select value={formData.busId} onValueChange={(value) => handleSelectChange("busId", value)}>
                      <SelectTrigger id="busId">
                        <SelectValue placeholder="Select a bus" />
                      </SelectTrigger>
                      <SelectContent>
                        {buses.map((bus) => (
                          <SelectItem key={bus._id} value={bus._id}>
                            {bus.registrationNumber} - {bus.model} ({bus.capacity} seats)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="origin">Origin</Label>
                    <Input
                      id="origin"
                      name="origin"
                      value={formData.origin}
                      onChange={handleInputChange}
                      placeholder="e.g., Colombo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="destination">Destination</Label>
                    <Input
                      id="destination"
                      name="destination"
                      value={formData.destination}
                      onChange={handleInputChange}
                      placeholder="e.g., Kandy"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Turns</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddTurn}>
                      Add Turn
                    </Button>
                  </div>
                  {formData.turns.map((turn, index) => (
                    <div key={index} className="grid gap-4 p-4 border rounded-lg">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Turn {index + 1}</h4>
                        {index > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveTurn(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Departure Time</Label>
                          <Input
                            type="datetime-local"
                            value={turn.departureTime}
                            onChange={(e) => handleTurnChange(index, "departureTime", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Arrival Time</Label>
                          <Input
                            type="datetime-local"
                            value={turn.arrivalTime}
                            onChange={(e) => handleTurnChange(index, "arrivalTime", e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Fare (Rs)</Label>
                          <Input
                            type="number"
                            value={turn.fare}
                            onChange={(e) => handleTurnChange(index, "fare", e.target.value)}
                            placeholder="e.g., 10.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Available Seats</Label>
                          <Input
                            type="number"
                            value={turn.availableSeats}
                            onChange={(e) => handleTurnChange(index, "availableSeats", e.target.value)}
                            placeholder="e.g., 40"
                            max={buses.find(bus => bus._id === formData.busId)?.capacity || 40}
                            disabled
                          />
                          <p className="text-sm text-muted-foreground">
                            Based on selected bus capacity
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {isEditMode ? "Update Route" : "Add Route"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {routes.length === 0 ? (
        <div className="text-center py-8 border rounded-md">
          <Bus className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No routes found</h3>
          <p className="text-sm text-muted-foreground mt-1">Get started by creating a new route.</p>
          <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Route
          </Button>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route Name</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead>Fare</TableHead>
                <TableHead>Available Seats</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((route) => (
                <TableRow key={route._id}>
                  <TableCell className="font-medium">{route.name}</TableCell>
                  <TableCell>{route.origin}</TableCell>
                  <TableCell>{route.destination}</TableCell>
                  <TableCell>
                    {route.turns.length > 0 ? formatDateTime(route.turns[0].departureTime) : "N/A"}
                  </TableCell>
                  <TableCell>
                    {route.turns.length > 0 ? `Rs.${route.turns[0].fare.toFixed(2)}` : "N/A"}
                  </TableCell>
                  <TableCell>
                    {route.turns.length > 0 ? route.turns[0].availableSeats : "N/A"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditRoute(route)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteRoute(route._id)}>
                        <Trash className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

