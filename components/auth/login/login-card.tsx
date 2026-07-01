'use client'

import { useState, type FormEvent, type Ref } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Mail, Lock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { AuthInput } from './auth-input'

const ROLE_HOME: Record<string, string> = {
  admin: '/admin/dashboard',
  driver: '/driver',
  passenger: '/passenger',
}

function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())
}

interface Props {
  on: boolean
  cardRef?: Ref<HTMLDivElement>
}

export function LoginCard({ on, cardRef }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const busy = loading || success

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setError('')

    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (res.status === 403 && data.needsVerification) {
        setLoading(false)
        toast.info('Please verify your email to continue.')
        router.push(`/auth/verify-email?email=${encodeURIComponent(data.email ?? email)}`)
        return
      }

      if (!res.ok) {
        setLoading(false)
        setError(res.status === 401 ? 'Invalid email or password.' : (data.error ?? 'Something went wrong. Please try again.'))
        return
      }

      setLoading(false)
      setSuccess(true)
      toast.success('Welcome back!')
      router.push(ROLE_HOME[data.user.role] ?? '/')
      router.refresh()
    } catch {
      setLoading(false)
      setError('Something went wrong. Please try again.')
    }
  }

  const ctaLabel = success ? 'Welcome back!' : loading ? 'Signing in...' : 'Sign in'

  return (
    <section
      style={{
        flex: '0.85 1 360px',
        minWidth: 300,
        opacity: on ? 1 : 0,
        transform: on ? 'translateX(clamp(16px,4vw,60px))' : 'translateY(26px) scale(0.98)',
        filter: on ? 'blur(0px)' : 'blur(10px)',
        visibility: on ? 'visible' : 'hidden',
        transition: 'opacity .9s ease, transform .9s cubic-bezier(.22,.61,.36,1), filter .9s ease',
      }}
    >
      <div
        ref={cardRef}
        style={{
          position: 'relative',
          padding: 'clamp(26px,4vw,38px)',
          borderRadius: 24,
          background: 'linear-gradient(165deg, rgba(14,42,66,0.92), rgba(9,17,26,0.92))',
          border: '1px solid rgba(255,201,163,0.14)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
          backdropFilter: 'blur(14px)',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 12.5, fontWeight: 600, color: '#A8C256' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#A8C256', boxShadow: '0 0 10px #A8C256' }} />
          Lights on - Welcome back to Swift Ride
        </div>
        <h2 style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 600, fontSize: 26, margin: '0 0 6px', color: '#F4F6F8' }}>
          Sign in to continue your journey.
        </h2>
        <p style={{ margin: '0 0 22px', fontSize: 13.5, color: '#9DB0C0' }}>
          Enter your details below to access your rides.
        </p>

        {error && (
          <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '11px 14px', borderRadius: 12, background: 'rgba(214,69,69,0.13)', border: '1px solid rgba(214,69,69,0.35)', color: '#FFB4B4', fontSize: 13 }}>
            <AlertCircle size={17} color="#FF8B8B" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <AuthInput
            label="Email address" type="email" value={email} onChange={setEmail}
            placeholder="you@example.com" autoComplete="email" disabled={busy} icon={<Mail size={18} color="#6E8497" />}
          />
          <AuthInput
            label="Password" type="password" value={password} onChange={setPassword}
            placeholder="Enter your password" autoComplete="current-password" disabled={busy} icon={<Lock size={18} color="#6E8497" />}
            labelAside={
              <Link href="/auth/forgot-password" style={{ fontSize: 12.5, color: '#9DB0C0' }}>
                Forgot password?
              </Link>
            }
          />

          <button
            type="submit"
            disabled={busy}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
              marginTop: 6, padding: 15, border: 'none', borderRadius: 14, cursor: busy ? 'default' : 'pointer',
              fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 15.5, color: '#0A0B0D',
              background: success ? 'linear-gradient(150deg,#B7D06A,#A8C256)' : 'linear-gradient(150deg,#FFE45C,#FFD21E)',
              boxShadow: '0 12px 34px rgba(255,210,30,0.3)', transition: 'background .3s',
            }}
          >
            {loading && <Loader2 size={17} className="sr-spin" />}
            {success && <CheckCircle2 size={18} />}
            {ctaLabel}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '22px 0 18px' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: 12, color: '#6E8497' }}>New to Swift Ride?</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>
        <Link
          href="/auth/register"
          style={{
            display: 'block', width: '100%', textAlign: 'center', padding: 13, borderRadius: 13,
            border: '1px solid rgba(255,201,163,0.28)', background: 'transparent', color: '#FFD9BE',
            fontWeight: 600, fontSize: 14.5, textDecoration: 'none',
          }}
        >
          Create an account
        </Link>
      </div>
    </section>
  )
}
