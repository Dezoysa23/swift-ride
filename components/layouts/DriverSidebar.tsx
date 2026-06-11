'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Bus, Users, Map, User, LogOut, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

const navItems = [
  { href: '/driver', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/driver/route', label: 'My Route', icon: Map },
  { href: '/driver/bus', label: 'My Bus', icon: Bus },
  { href: '/driver/passengers', label: 'Passengers', icon: Users },
  { href: '/driver/profile', label: 'Profile', icon: User },
]

export default function DriverSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [driverName, setDriverName] = useState('Driver')
  const [driverAvatar, setDriverAvatar] = useState('')

  useEffect(() => {
    fetch('/api/driver/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setDriverName(d.data.name || 'Driver')
          setDriverAvatar(d.data.avatar || '')
        }
      })
      .catch(() => {})
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      toast.success('Logged out successfully')
      router.push('/auth/login')
    } catch {
      toast.error('Logout failed')
    } finally {
      setLoggingOut(false)
    }
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  const initials = driverName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside className="flex flex-col w-64 h-screen bg-slate-800 text-white flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
          SR
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-base leading-tight">Swift Ride</span>
          <Badge
            variant="secondary"
            className="mt-0.5 text-[10px] px-1.5 py-0 h-4 bg-blue-500/20 text-blue-300 border-blue-500/30 w-fit"
          >
            Driver
          </Badge>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Icon size={18} className="flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User at bottom */}
      <div className="border-t border-slate-700 px-3 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors">
              <Avatar className="w-8 h-8">
                <AvatarImage src={driverAvatar} alt={driverName} />
                <AvatarFallback className="bg-blue-600 text-white text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-white truncate">{driverName}</p>
                <p className="text-xs text-slate-400 truncate">Driver</p>
              </div>
              <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/driver/profile" className="cursor-pointer">
                <User size={14} className="mr-2" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-red-600 focus:text-red-600 cursor-pointer"
            >
              <LogOut size={14} className="mr-2" />
              {loggingOut ? 'Logging out…' : 'Logout'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
