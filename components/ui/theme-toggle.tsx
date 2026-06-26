'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
  /** Use on dark surfaces (sidebars) to invert the idle colors. */
  onDark?: boolean
}

/** Light/dark theme switch. Hydration-safe (renders a stable placeholder until mounted). */
function ThemeToggle({ className, onDark = false }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'inline-grid h-9 w-9 place-items-center rounded-full border transition-colors',
        onDark
          ? 'border-white/15 text-white/80 hover:bg-white/10 hover:text-white'
          : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
        className
      )}
    >
      {mounted && isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}

export { ThemeToggle }
