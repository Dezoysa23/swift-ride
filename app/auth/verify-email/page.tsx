'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CardContent, CardFooter } from '@/components/ui/card'
import { AuthShell } from '@/components/auth/auth-shell'

const ROLE_HOME: Record<string, string> = {
  admin: '/admin/dashboard',
  driver: '/driver',
  passenger: '/passenger',
}

function VerifyEmailForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!/^\d{6}$/.test(code)) {
      toast.error('Enter the 6-digit code from your email')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Verification failed')
      toast.success('Email verified!')
      const role = data.user?.role
      router.push(ROLE_HOME[role] ?? '/')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (!email) {
      toast.error('Missing email. Please register or sign in again.')
      return
    }
    setResending(true)
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not resend code')
      toast.success('A new code has been sent.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setResending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="space-y-4">
        {email ? (
          <p className="text-sm text-muted-foreground text-center">
            We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>.
          </p>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="code">Verification code</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="text-center text-lg tracking-[0.4em]"
          />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Verifying…' : 'Verify email'}
        </Button>
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-sm text-primary hover:underline disabled:opacity-50"
        >
          {resending ? 'Sending…' : 'Resend code'}
        </button>
      </CardFooter>
    </form>
  )
}

export default function VerifyEmailPage() {
  return (
    <AuthShell title="Verify your email" description="Enter the code we emailed you to activate your account.">
      <Suspense
        fallback={
          <CardContent>
            <p className="text-sm text-center text-muted-foreground">Loading…</p>
          </CardContent>
        }
      >
        <VerifyEmailForm />
      </Suspense>
      <CardFooter className="justify-center pb-6">
        <p className="text-sm text-muted-foreground">
          <Link href="/auth/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardFooter>
    </AuthShell>
  )
}
