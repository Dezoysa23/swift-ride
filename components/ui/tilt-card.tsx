'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Max tilt in degrees. */
  max?: number
  /** Lift toward the viewer on hover, in px. */
  lift?: number
}

/**
 * Wraps content in a 3D mouse-parallax tilt. Pure CSS transforms (no deps),
 * GPU-accelerated, and disabled under prefers-reduced-motion / on touch.
 */
function TiltCard({ max = 9, lift = 6, className, children, style, ...props }: TiltCardProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [t, setT] = React.useState('')
  const reduce = React.useRef(false)

  React.useEffect(() => {
    reduce.current =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
        window.matchMedia?.('(pointer: coarse)').matches)
  }, [])

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduce.current) return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    setT(
      `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateZ(${lift}px)`
    )
  }

  function onLeave() {
    setT('')
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn('transform-gpu transition-transform duration-200 ease-out [transform-style:preserve-3d]', className)}
      style={{ transform: t || undefined, ...style }}
      {...props}
    >
      {children}
    </div>
  )
}

export { TiltCard }
