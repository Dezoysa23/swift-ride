import DriverSidebar from '@/components/layouts/DriverSidebar'

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <DriverSidebar />
      <main className="flex-1 overflow-y-auto bg-background p-6 pt-20 lg:pt-6">{children}</main>
    </div>
  )
}
