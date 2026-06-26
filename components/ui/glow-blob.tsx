import * as React from 'react'
import { cn } from '@/lib/utils'

interface GlowBlobProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: 'coral' | 'teal' | 'gold'
  /** Diameter in px (defaults to 420). */
  size?: number
}

const toneMap = {
  coral: 'hsl(var(--coral))',
  teal: 'hsl(var(--teal))',
  gold: 'hsl(var(--gold))',
} as const

/**
 * Decorative blurred radial glow. Purely visual — pointer-events disabled and
 * hidden from assistive tech. Position it with utility classes on `className`.
 */
function GlowBlob({ tone = 'coral', size = 420, className, style, ...props }: GlowBlobProps) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute -z-10 animate-glow-pulse rounded-full', className)}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${toneMap[tone]} 0%, transparent 68%)`,
        filter: 'blur(64px)',
        opacity: 0.22,
        ...style,
      }}
      {...props}
    />
  )
}

export { GlowBlob }
