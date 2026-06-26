import * as React from 'react'
import Link from 'next/link'
import { ShieldCheck, MapPin, Wallet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Logo, LogoMark } from '@/components/ui/logo'
import { Eyebrow } from '@/components/ui/eyebrow'
import { GlowBlob } from '@/components/ui/glow-blob'
import { ThemeToggle } from '@/components/ui/theme-toggle'

const highlights = [
  { icon: MapPin, title: 'Live tracking', body: 'Watch your ride approach in real time.' },
  { icon: Wallet, title: 'Fixed fares', body: 'See the price up front — no surprises.' },
  { icon: ShieldCheck, title: 'Vetted drivers', body: 'Every trip monitored and insured.' },
]

interface AuthShellProps {
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
}

/** Premium split-screen scaffold for the auth pages: brand panel + form card. */
export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-foreground p-12 text-background lg:flex lg:flex-col lg:justify-between">
        <GlowBlob tone="coral" size={460} className="-left-24 -top-24 !opacity-40" />
        <GlowBlob tone="teal" size={420} className="-bottom-24 left-1/3 !opacity-30" />

        <Link href="/" className="relative z-10 w-fit">
          <Logo wordmarkClassName="text-xl text-background" />
        </Link>

        <div className="relative z-10 max-w-md">
          <Eyebrow tone="gold">Premium mobility platform</Eyebrow>
          <h2 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight">
            Move through the city like it&apos;s{' '}
            <span className="text-gradient-brand">yours.</span>
          </h2>
          <div className="mt-10 space-y-5">
            {highlights.map(({ icon: Icon, title: t, body }) => (
              <div key={t} className="flex items-start gap-3.5">
                <span className="mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-lg bg-background/10 text-gold">
                  <Icon size={17} />
                </span>
                <div>
                  <div className="font-semibold">{t}</div>
                  <div className="text-sm text-background/60">{body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 font-mono-label text-[11px] text-background/40">
          2M+ rides · 120+ cities · 4.9★ rated
        </div>
      </aside>

      {/* Form panel */}
      <main className="relative flex items-center justify-center bg-background p-6 sm:p-10">
        <div className="absolute right-5 top-5">
          <ThemeToggle />
        </div>
        <Card className="w-full max-w-md border-border/70">
          <CardHeader className="space-y-2 text-center">
            <div className="mb-1 flex justify-center lg:hidden">
              <LogoMark className="h-12 w-12 text-2xl" />
            </div>
            <CardTitle className="font-display text-2xl font-bold">{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </CardHeader>
          {children}
        </Card>
      </main>
    </div>
  )
}
