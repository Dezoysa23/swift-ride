import * as React from 'react'
import { cn } from '@/lib/utils'
import { Eyebrow } from '@/components/ui/eyebrow'

interface SectionHeadingProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  eyebrow?: React.ReactNode
  eyebrowIndex?: string
  eyebrowTone?: 'teal' | 'coral' | 'gold' | 'muted'
  title: React.ReactNode
  description?: React.ReactNode
  /** Center-align the block. */
  centered?: boolean
}

/** Eyebrow + display title + optional description — the standard section header. */
function SectionHeading({
  eyebrow,
  eyebrowIndex,
  eyebrowTone = 'teal',
  title,
  description,
  centered = false,
  className,
  ...props
}: SectionHeadingProps) {
  return (
    <div className={cn(centered && 'mx-auto text-center', 'max-w-2xl space-y-3', className)} {...props}>
      {eyebrow ? (
        <Eyebrow index={eyebrowIndex} tone={eyebrowTone} className={cn(centered && 'flex justify-center')}>
          {eyebrow}
        </Eyebrow>
      ) : null}
      <h2 className="font-display text-3xl font-bold leading-[1.05] tracking-tight sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {description ? (
        <p className="text-base leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}

export { SectionHeading }
