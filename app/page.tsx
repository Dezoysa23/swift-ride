import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

const ROLE_HOME: Record<string, string> = {
  admin: '/admin/dashboard',
  driver: '/driver',
  passenger: '/passenger',
}

export default async function Home() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  redirect(ROLE_HOME[user.role] ?? '/auth/login')
}
