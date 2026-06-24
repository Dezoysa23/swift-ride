import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Passenger Dashboard",
  description: "Manage your bookings and view payment history",
}

export default function PassengerDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
} 