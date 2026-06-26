'use client'

import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'

// Lazy-load the WebGL scene client-side only — keeps three.js out of the
// initial bundle and off the server.
const Bus3DScene = dynamic(() => import('./bus-3d-scene'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center">
      <div className="h-24 w-24 animate-glow-pulse rounded-full bg-coral/30 blur-2xl" />
    </div>
  ),
})

interface Bus3DProps {
  className?: string
  interactive?: boolean
}

/** Drop-in 3D bus. Fills its (positioned) parent — give the container a size. */
export function Bus3D({ className, interactive = true }: Bus3DProps) {
  return (
    <div className={cn('relative h-full w-full', className)}>
      <Bus3DScene interactive={interactive} />
    </div>
  )
}
