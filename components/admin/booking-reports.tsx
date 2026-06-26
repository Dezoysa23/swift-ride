"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Download } from "lucide-react"

interface BookingStats {
  totalBookings: number
  totalRevenue: number
  averageFare: number
  completedBookings: number
  cancelledBookings: number
  mostPopularRoute: {
    routeName: string
    bookings: number
    revenue: number
  }
}

interface DailyStats {
  date: string
  bookings: number
  revenue: number
}

interface RouteStats {
  routeName: string
  bookings: number
  revenue: number
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d"]

export function BookingReports() {
  const [bookingStats, setBookingStats] = useState<BookingStats | null>(null)
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [routeStats, setRouteStats] = useState<RouteStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<"week" | "month" | "year">("week")
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().setDate(new Date().getDate() - 7)))
  const [endDate, setEndDate] = useState<Date | undefined>(new Date())

  useEffect(() => {
    fetchReportData()
  }, [dateRange, startDate, endDate])

  const fetchReportData = async () => {
    setIsLoading(true)
    try {
      // Build query params
      const params = new URLSearchParams()
      if (dateRange) params.append("range", dateRange)
      if (startDate) params.append("startDate", startDate.toISOString())
      if (endDate) params.append("endDate", endDate.toISOString())

      // Fetch booking stats
      const statsResponse = await fetch(`/api/admin/reports/bookings?${params.toString()}`)
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setBookingStats(statsData.stats)
        setDailyStats(statsData.dailyStats)
        setRouteStats(statsData.routeStats)
      }
    } catch (error) {
      console.error("Failed to fetch report data:", error)
      toast.error("Error", { description: "Failed to load report data. Please try again." })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDateRangeChange = (value: string) => {
    const today = new Date()
    let start = new Date()

    switch (value) {
      case "week":
        start = new Date(today.setDate(today.getDate() - 7))
        break
      case "month":
        start = new Date(today.setMonth(today.getMonth() - 1))
        break
      case "year":
        start = new Date(today.setFullYear(today.getFullYear() - 1))
        break
    }

    setDateRange(value as "week" | "month" | "year")
    setStartDate(start)
    setEndDate(new Date())
  }

  const handleExportCSV = () => {
    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,"

    // Headers
    csvContent += "Date,Bookings,Revenue\r\n"

    // Data rows
    dailyStats.forEach((stat) => {
      csvContent += `${stat.date},${stat.bookings},$${stat.revenue.toFixed(2)}\r\n`
    })

    // Create download link
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `booking_report_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)

    // Trigger download
    link.click()

    // Clean up
    document.body.removeChild(link)
  }

  if (isLoading && !bookingStats) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">Booking Reports</h3>
          <p className="text-sm text-muted-foreground">View booking statistics and revenue reports.</p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Select value={dateRange} onValueChange={handleDateRangeChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
                <SelectItem value="year">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Start Date</Label>
            <DatePicker selected={startDate} onSelect={setStartDate} />
          </div>

          <div className="space-y-2">
            <Label>End Date</Label>
            <DatePicker selected={endDate} onSelect={setEndDate} max={new Date()} />
          </div>

          <div className="self-end">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {bookingStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookingStats.totalBookings}</div>
              <p className="text-xs text-muted-foreground">
                {bookingStats.completedBookings} completed, {bookingStats.cancelledBookings} cancelled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rs. {bookingStats.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Average fare: Rs. {bookingStats.averageFare.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Most Popular Route</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookingStats.mostPopularRoute?.routeName || "N/A"}</div>
              <p className="text-xs text-muted-foreground">
                {bookingStats.mostPopularRoute?.bookings || 0} bookings
                {bookingStats.mostPopularRoute?.revenue ? ` • Rs. ${bookingStats.mostPopularRoute.revenue.toFixed(2)}` : ''}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="daily">Daily Statistics</TabsTrigger>
          <TabsTrigger value="routes">Route Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Booking Statistics</CardTitle>
              <CardDescription>Number of bookings and revenue by day.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ChartContainer
                  config={{
                    bookings: {
                      label: "Bookings",
                      color: "hsl(var(--chart-1))",
                    },
                    revenue: {
                      label: "Revenue (Rs)",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyStats} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" angle={-45} textAnchor="end" height={70} />
                      <YAxis yAxisId="left" orientation="left" stroke="var(--color-bookings)" />
                      <YAxis yAxisId="right" orientation="right" stroke="var(--color-revenue)" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="bookings" fill="var(--color-bookings)" name="Bookings" />
                      <Bar yAxisId="right" dataKey="revenue" fill="var(--color-revenue)" name="Revenue (Rs)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Route Statistics</CardTitle>
              <CardDescription>Bookings and revenue by route.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={routeStats}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="bookings"
                      nameKey="routeName"
                      label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {routeStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name, props) => [`${value} bookings`, props.payload.routeName]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

