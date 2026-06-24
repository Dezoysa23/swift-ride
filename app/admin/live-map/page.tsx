import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { LiveLocationMap } from '@/components/admin/live-location-map'

export default async function AdminLiveMapPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') redirect('/auth/login')

  return <LiveLocationMap />
}
