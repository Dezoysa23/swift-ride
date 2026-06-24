"use client"

import { RoutesList } from "@/components/passenger/routes-list"

export default function PassengerRoutesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Available Routes</h1>
        <p className="text-muted-foreground">Browse and book available bus routes for your journey.</p>
      </div>

      <RoutesList />
    </div>
  )
}

