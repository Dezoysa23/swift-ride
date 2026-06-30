'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Bus, Users, Map, User, LogOut, ChevronDown, Menu, X } from 'lucide-react'
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
  const [mobileOpen, setMobileOpen] = useState(false)
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
    <>
      {/* Mobile top bar — hidden on lg+ */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-white/10 bg-[#0e2730] px-4 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="-ml-1 p-1 text-white/70 hover:text-white"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <Link href="/driver">
          <Logo wordmarkClassName="text-white text-base" />
        </Link>
        <ThemeToggle onDark />
      </div>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-50 flex h-screen w-64 flex-shrink-0 flex-col bg-[#0e2730] text-white transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-5 py-5">
          <Link href="/driver" className="flex min-w-0 items-center gap-2.5">
            <Logo wordmarkClassName="text-white text-base" />
            <Badge variant="teal" className="hidden xl:inline-flex">Driver</Badge>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle onDark />
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1 text-white/70 hover:text-white lg:hidden"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
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
                onClick={() => setMobileOpen(false)}
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
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-white/10">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={driverAvatar} alt={driverName} />
                  <AvatarFallback className="bg-coral text-coral-foreground text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium text-white">{driverName}</p>
                  <p className="truncate text-xs text-white/50">Driver</p>
                </div>
                <ChevronDown size={14} className="flex-shrink-0 text-white/50" />
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
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut size={14} className="mr-2" />
                {loggingOut ? 'Logging out…' : 'Logout'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  )
}
