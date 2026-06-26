'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Bus, Users, Map, User, LogOut, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/ui/logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
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
    <aside className="flex flex-col w-64 h-screen bg-[#0e2730] text-white flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center justify-between gap-2 px-5 py-5 border-b border-white/10">
        <Link href="/driver" className="flex items-center gap-2.5 min-w-0">
          <Logo wordmarkClassName="text-white text-base" />
          <Badge variant="teal" className="hidden xl:inline-flex">Driver</Badge>
        </Link>
        <ThemeToggle onDark />
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
                  ? 'bg-coral text-coral-foreground shadow-glow-coral'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={18} className="flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User at bottom */}
      <div className="border-t border-white/10 px-3 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/10 transition-colors">
              <Avatar className="w-8 h-8">
                <AvatarImage src={driverAvatar} alt={driverName} />
                <AvatarFallback className="bg-coral text-coral-foreground text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-white truncate">{driverName}</p>
                <p className="text-xs text-white/50 truncate">Driver</p>
              </div>
              <ChevronDown size={14} className="text-white/50 flex-shrink-0" />
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
              className="text-destructive focus:text-destructive cursor-pointer"
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
