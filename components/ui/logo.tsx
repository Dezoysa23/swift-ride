import * as React from 'react'
import { cn } from '@/lib/utils'

/** The rounded "S" brand mark. Size via `className` (w/h + text). */
function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'grid place-items-center rounded-xl bg-coral font-display font-bold text-coral-foreground shadow-glow-coral',
        'h-9 w-9 text-lg',
        className
      )}
      aria-hidden
    >
      S
    </span>
  )
}

interface LogoProps {
  className?: string
  markClassName?: string
  /** Hide the wordmark, show only the mark. */
  markOnly?: boolean
  /** Wordmark text size class. */
  wordmarkClassName?: string
}

/** Brand lockup: the "S" mark + "SwiftRide" wordmark. Non-interactive — wrap in a Link if needed. */
function Logo({ className, markClassName, markOnly = false, wordmarkClassName }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={markClassName} />
      {!markOnly && (
        <span className={cn('font-display text-lg font-bold tracking-tight', wordmarkClassName)}>
          Swift<span className="text-teal">Ride</span>
        </span>
      )}
    </span>
  )
}

export { Logo, LogoMark }
