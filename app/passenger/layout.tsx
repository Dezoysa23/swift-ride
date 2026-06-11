import PassengerNav from '@/components/layouts/PassengerNav'

export default function PassengerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <PassengerNav />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
