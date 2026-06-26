"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
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
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { User } from "lucide-react"

interface Driver {
  _id: string
  name: string
  email: string
  phone?: string
  licenseNumber?: string
  assignedRouteId?: string
  assignedRouteName?: string
  status: "available" | "on_duty" | "off_duty"
  createdAt: string
}

interface Route {
  _id: string
  name: string
  origin: string
  destination: string
  departureTime: string
}

export function DriverManagement() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [selectedRouteId, setSelectedRouteId] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch drivers
        const driversResponse = await fetch("/api/admin/drivers")
        if (driversResponse.ok) {
          const driversData = await driversResponse.json()
          setDrivers(driversData)
        }

        // Fetch routes
        const routesResponse = await fetch("/api/admin/routes")
        if (routesResponse.ok) {
          const routesData = await routesResponse.json()
          setRoutes(routesData)
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

  const handleAssignRoute = (driver: Driver) => {
    setSelectedDriver(driver)
    setSelectedRouteId(driver.assignedRouteId || "")
    setIsAssignDialogOpen(true)
  }

  const handleAssignSubmit = async () => {
    if (!selectedDriver) return

    try {
      const response = await fetch(`/api/admin/drivers/${selectedDriver._id}/assign-route`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          routeId: selectedRouteId || null,
        }),
      })

      if (response.ok) {
        const data = await response.json()

        // Update driver in state
        setDrivers(
          drivers.map((driver) =>
            driver._id === selectedDriver._id
              ? {
                  ...driver,
                  assignedRouteId: selectedRouteId || undefined,
                  assignedRouteName: selectedRouteId ? routes.find((r) => r._id === selectedRouteId)?.name : undefined,
                  status: selectedRouteId ? "on_duty" : "available",
                }
              : driver,
          ),
        )

        toast.success(selectedRouteId ? "Route assigned" : "Route unassigned", {
          description: selectedRouteId
            ? "Driver has been assigned to the route successfully."
            : "Driver has been unassigned from the route.",
        })

        // Close dialog
        setIsAssignDialogOpen(false)
      } else {
        const error = await response.json()
        throw new Error(error.message || "Failed to assign route")
      }
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "An error occurred while assigning the route",
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-32" />
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
        <h3 className="text-lg font-medium">Drivers</h3>
      </div>

      {drivers.length === 0 ? (
        <div className="text-center py-8 border rounded-md">
          <User className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No drivers found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Drivers will appear here once they register in the system.
          </p>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current Assignment</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((driver) => (
                <TableRow key={driver._id}>
                  <TableCell className="font-medium">{driver.name}</TableCell>
                  <TableCell>{driver.email}</TableCell>
                  <TableCell>{driver.phone || "N/A"}</TableCell>
                  <TableCell>
                    <div
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        driver.status === "on_duty"
                          ? "bg-teal/15 text-teal"
                          : driver.status === "off_duty"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-primary/10 text-primary"
                      }`}
                    >
                      {driver.status === "on_duty"
                        ? "On Duty"
                        : driver.status === "off_duty"
                          ? "Off Duty"
                          : "Available"}
                    </div>
                  </TableCell>
                  <TableCell>{driver.assignedRouteName || "Not assigned"}</TableCell>
                  <TableCell>{formatDate(driver.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleAssignRoute(driver)}>
                      {driver.assignedRouteId ? "Reassign" : "Assign Route"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign Route to Driver</DialogTitle>
            <DialogDescription>
              {selectedDriver?.name ? `Assign a route to ${selectedDriver.name}.` : "Assign a route to this driver."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="route">Select Route</Label>
              <Select value={selectedRouteId} onValueChange={setSelectedRouteId}>
                <SelectTrigger id="route">
                  <SelectValue placeholder="Select a route" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Unassign)</SelectItem>
                  {routes.map((route) => (
                    <SelectItem key={route._id} value={route._id}>
                      {route.name} ({route.origin} to {route.destination})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignSubmit}>Confirm Assignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

