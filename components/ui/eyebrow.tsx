import * as React from 'react'
import { cn } from '@/lib/utils'

interface EyebrowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional leading number, e.g. "01" → renders "01 — LABEL" */
  index?: string
  /** Accent color for the label text. */
  tone?: 'teal' | 'coral' | 'gold' | 'muted'
}

const toneMap = {
  teal: 'text-teal',
  coral: 'text-coral',
  gold: 'text-gold',
  muted: 'text-muted-foreground',
} as const

/** Mono uppercase section label, e.g. `01 — THE FLEET`. */
function Eyebrow({ index, tone = 'teal', className, children, ...props }: EyebrowProps) {
  return (
    <div
      className={cn('font-mono-label text-xs font-medium', toneMap[tone], className)}
      {...props}
    >
      {index ? `${index} — ` : ''}
      {children}
    </div>
  )
}

export { Eyebrow }
