# Cinematic Van-Headlight Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `app/auth/login/page.tsx` with a full-bleed, always-dark, cinematic van-headlight login experience that wires correctly to the existing `POST /api/auth/login` contract, without touching any other auth page, API route, or middleware.

**Architecture:** Five new presentational/interactive components under `components/auth/login/` (SVG van, glow/beam layer, animated backdrop, labeled input, and the form card that owns the real fetch call), one CSS file of keyframes, a one-line font addition in `app/layout.tsx`, and a thin orchestrator that replaces the current login page.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, `next/font/google`, `lucide-react` (already a dependency), `sonner` (already used for auth toasts), plain CSS keyframes (no Framer Motion — not installed, not needed).

## Global Constraints

- Do not modify `components/auth/auth-shell.tsx` or any of `app/auth/register|forgot-password|reset-password|verify-email/page.tsx`. They keep using `AuthShell` exactly as today.
- Do not modify any API route, `lib/auth.ts`, or `middleware.ts`. The login request/response contract is fixed and verified (see Task 6).
- Do not add Framer Motion, Three.js, or any external/remote image URL. CSS keyframes only.
- Never log `email`, `password`, or full API response bodies to the console.
- `ROLE_HOME` used for post-login redirect must be `{ admin: '/admin/dashboard', driver: '/driver', passenger: '/passenger' }` — this is the real map from `middleware.ts`, not the reference doc's (wrong) assumption of `/driver/dashboard` / `/passenger/dashboard`.
- Button copy says "Sign in" / "Signing in…", never "Log in" or "logging page" (per explicit user instruction).
- Use `var(--font-display)` for headings and `var(--font-manrope)` for body text in inline styles — never the literal string `'Space Grotesk'`/`'Manrope'` — because `next/font` self-hosts fonts under generated family names; only the CSS variables it exposes are guaranteed to resolve.
- Colors are hardcoded hex (bespoke dark palette), not Tailwind/shadcn tokens — same pattern already used by `components/driver/active-trip.tsx` and the passenger tracking page.
- All new components go in `components/auth/login/`. Only `app/auth/login/page.tsx` and `app/layout.tsx` are modified in `app/`.

---

### Task 1: Animation keyframes

**Files:**
- Create: `components/auth/login/login-animations.css`

**Interfaces:**
- Produces: global CSS classes `sr-van-float`, `sr-tap-ring`, `sr-tap-ring--b`, `sr-glow-breath`, `sr-road-flow`, `sr-route-drift`, `sr-float-up`, `sr-spin`, `sr-headlight-flash`, all disabled under `prefers-reduced-motion: reduce`. Consumed by Tasks 4, 5, 6.

- [ ] **Step 1: Create the CSS file**

```css
@keyframes sr-vanFloat   { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
@keyframes sr-tapPulse   { 0%, 100% { transform: scale(1); opacity: .85; } 50% { transform: scale(1.28); opacity: .15; } }
@keyframes sr-glowBreath { 0%, 100% { transform: translate(-50%,-50%) scale(1); } 50% { transform: translate(-50%,-50%) scale(1.06); } }
@keyframes sr-roadFlow   { from { background-position: 0 0; } to { background-position: -120px 0; } }
@keyframes sr-floatUp    { 0% { transform: translateY(0); opacity: 0; } 20% { opacity: .9; } 100% { transform: translateY(-120px); opacity: 0; } }
@keyframes sr-spin       { to { transform: rotate(360deg); } }
@keyframes sr-routeDrift { from { background-position: 0 0, 0 0; } to { background-position: 900px 0, -900px 0; } }
@keyframes sr-headlightFlash {
  0%, 100% { filter: drop-shadow(0 0 30px rgba(255,228,90,1)) brightness(1.5); }
  45%, 55% { filter: drop-shadow(0 0 80px rgba(255,244,150,1)) brightness(2.7); }
}

.sr-van-float       { animation: sr-vanFloat 6s ease-in-out infinite; }
.sr-tap-ring         { transform-box: fill-box; transform-origin: center; animation: sr-tapPulse 2s ease-out infinite; }
.sr-tap-ring--b      { animation-delay: .4s; }
.sr-glow-breath      { animation: sr-glowBreath 5s ease-in-out infinite; }
.sr-road-flow        { animation: sr-roadFlow 1.1s linear infinite; }
.sr-route-drift      { animation: sr-routeDrift 40s linear infinite; }
.sr-float-up         { animation: sr-floatUp 5s ease-in-out infinite; }
.sr-spin             { animation: sr-spin .7s linear infinite; }
.sr-headlight-flash  { animation: sr-headlightFlash 1.3s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .sr-van-float, .sr-tap-ring, .sr-glow-breath, .sr-road-flow, .sr-route-drift,
  .sr-float-up, .sr-spin, .sr-headlight-flash { animation: none !important; }
}
```

- [ ] **Step 2: Commit**

```bash
git add components/auth/login/login-animations.css
git commit -m "feat(login): add cinematic keyframe animations"
```

---

### Task 2: AuthInput component

**Files:**
- Create: `components/auth/login/auth-input.tsx`

**Interfaces:**
- Produces: `export function AuthInput(props: { label: string; type?: 'email' | 'password' | 'text'; value: string; onChange: (v: string) => void; placeholder?: string; autoComplete?: string; disabled?: boolean; icon?: ReactNode; labelAside?: ReactNode })`. Consumed by Task 6.

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useId, useState, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface Props {
  label: string
  type?: 'email' | 'password' | 'text'
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  disabled?: boolean
  icon?: ReactNode
  labelAside?: ReactNode
}

export function AuthInput({
  label, type = 'text', value, onChange, placeholder, autoComplete, disabled, icon, labelAside,
}: Props) {
  const id = useId()
  const [reveal, setReveal] = useState(false)
  const [focus, setFocus] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (reveal ? 'text' : 'password') : type

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
        <label htmlFor={id} style={{ fontSize: 12.5, fontWeight: 600, color: '#B7C6D3' }}>{label}</label>
        {labelAside}
      </div>
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
            {icon}
          </span>
        )}
        <input
          id={id}
          type={inputType}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            width: '100%',
            padding: `14px ${isPassword ? 46 : 14}px 14px ${icon ? 42 : 14}px`,
            borderRadius: 13,
            border: `1px solid ${focus ? '#FFC9A3' : 'rgba(255,255,255,0.1)'}`,
            boxShadow: focus ? '0 0 0 4px rgba(255,201,163,0.18)' : 'none',
            background: '#0B1C2C',
            color: '#EAF0F5',
            fontSize: 14.5,
            fontFamily: 'var(--font-manrope), system-ui, sans-serif',
            outline: 'none',
            transition: 'border-color .2s, box-shadow .2s',
          }}
        />
        {isPassword && (
          <button
            type="button"
            aria-label={reveal ? 'Hide password' : 'Show password'}
            onClick={() => setReveal((r) => !r)}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: '#6E8497', display: 'flex',
            }}
          >
            {reveal ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: no errors mentioning `auth-input.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/auth/login/auth-input.tsx
git commit -m "feat(login): add AuthInput component"
```

---

### Task 3: MotionBackground component

**Files:**
- Create: `components/auth/login/motion-background.tsx`

**Interfaces:**
- Produces: `export default function MotionBackground(props: { showRoutes?: boolean })`. Consumed by Task 8.

- [ ] **Step 1: Create the component**

```tsx
export default function MotionBackground({ showRoutes = true }: { showRoutes?: boolean }) {
  return (
    <>
      {showRoutes && (
        <div
          aria-hidden
          className="sr-route-drift"
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.5,
            pointerEvents: 'none',
            backgroundImage:
              'repeating-linear-gradient(115deg, transparent 0 46px, rgba(22,58,88,0.18) 46px 48px),' +
              'repeating-linear-gradient(-115deg, transparent 0 60px, rgba(255,201,163,0.05) 60px 61px)',
            backgroundSize: '900px 100%, 900px 100%',
          }}
        />
      )}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(120% 80% at 50% 120%, rgba(0,0,0,0.55) 0%, transparent 60%)',
        }}
      />
    </>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: no errors mentioning `motion-background.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/auth/login/motion-background.tsx
git commit -m "feat(login): add MotionBackground component"
```

---

### Task 4: HeadlightGlow component

**Files:**
- Create: `components/auth/login/headlight-glow.tsx`

**Interfaces:**
- Consumes: CSS classes `sr-glow-breath`, `sr-float-up`, `sr-road-flow` from Task 1.
- Produces: `export default function HeadlightGlow(props: { on: boolean; intensity?: number })`. Consumed by Task 8.

- [ ] **Step 1: Create the component**

```tsx
import type { CSSProperties } from 'react'

const beamBg =
  'linear-gradient(to bottom, rgba(255,251,228,0.72), rgba(255,214,50,0.5) 28%, rgba(255,201,163,0.14) 60%, transparent 84%)'

export default function HeadlightGlow({ on, intensity = 1 }: { on: boolean; intensity?: number }) {
  const glowOpacity = on ? intensity : 0
  const beam = (rotate: number, left: string): CSSProperties => ({
    position: 'absolute',
    left,
    top: '50%',
    width: '34%',
    height: '80%',
    transform: `translateX(-50%) rotate(${rotate}deg)`,
    transformOrigin: 'top center',
    background: beamBg,
    clipPath: 'polygon(41% 0, 59% 0, 100% 100%, 0 100%)',
    filter: 'blur(7px)',
    pointerEvents: 'none',
    zIndex: 1,
    opacity: glowOpacity,
    transition: 'opacity 1.3s ease',
  })

  const particles = [
    { left: '40%', top: '60%', s: 5, c: '#FFE45C', g: '#FFD21E', dur: '4.5s', d: '0s' },
    { left: '52%', top: '66%', s: 4, c: '#FFC9A3', g: '#FFC9A3', dur: '5.6s', d: '.8s' },
    { left: '46%', top: '70%', s: 3, c: '#FFE45C', g: '#FFD21E', dur: '6.2s', d: '1.6s' },
    { left: '58%', top: '62%', s: 4, c: '#FFC9A3', g: '#FFC9A3', dur: '5s', d: '2.4s' },
    { left: '36%', top: '64%', s: 3, c: '#FFE45C', g: '#FFD21E', dur: '5.8s', d: '3s' },
  ]

  return (
    <>
      <div
        aria-hidden
        className="sr-glow-breath"
        style={{
          position: 'absolute',
          left: '50%',
          top: '56%',
          width: 640,
          height: 640,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(255,250,225,0.8) 0%, rgba(255,214,50,0.6) 20%, rgba(255,201,163,0.34) 40%, rgba(255,201,163,0) 62%)',
          filter: 'blur(6px)',
          pointerEvents: 'none',
          transform: 'translate(-50%,-50%)',
          zIndex: 1,
          opacity: glowOpacity,
          transition: 'opacity 1.2s ease',
        }}
      />

      <div aria-hidden style={beam(-11, '31%')} />
      <div aria-hidden style={beam(11, '69%')} />

      <div
        aria-hidden
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2, opacity: glowOpacity, transition: 'opacity 1s ease' }}
      >
        {particles.map((p, i) => (
          <span
            key={i}
            className="sr-float-up"
            style={{
              position: 'absolute',
              left: p.left,
              top: p.top,
              width: p.s,
              height: p.s,
              borderRadius: '50%',
              background: p.c,
              boxShadow: `0 0 8px ${p.g}`,
              animationDuration: p.dur,
              animationDelay: p.d,
            }}
          />
        ))}
      </div>

      <div
        aria-hidden
        className="sr-road-flow"
        style={{
          position: 'absolute',
          left: '8%',
          right: '8%',
          bottom: -6,
          height: 16,
          zIndex: 2,
          backgroundImage: 'repeating-linear-gradient(90deg,#FFD21E 0 34px,transparent 34px 76px)',
          backgroundSize: '120px 3px',
          backgroundPosition: '0 center',
          backgroundRepeat: 'repeat-x',
          WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 22%,#000 78%,transparent)',
          maskImage: 'linear-gradient(90deg,transparent,#000 22%,#000 78%,transparent)',
          opacity: on ? 1 : 0,
          transition: 'opacity 1s ease',
        }}
      />
    </>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: no errors mentioning `headlight-glow.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/auth/login/headlight-glow.tsx
git commit -m "feat(login): add HeadlightGlow component"
```

---

### Task 5: VanLightReveal component

**Files:**
- Create: `components/auth/login/van-light-reveal.tsx`

**Interfaces:**
- Consumes: CSS classes `sr-van-float`, `sr-tap-ring`, `sr-tap-ring--b`, `sr-headlight-flash` from Task 1.
- Produces: `export default function VanLightReveal(props: { on: boolean; onTurnOn: () => void; onTurnOff: () => void; float?: boolean })`. Consumed by Task 8.

- [ ] **Step 1: Create the component**

```tsx
interface Props {
  on: boolean
  onTurnOn: () => void
  onTurnOff: () => void
  float?: boolean
}

export default function VanLightReveal({ on, onTurnOn, onTurnOff, float = true }: Props) {
  const lampOpacity = on ? 1 : 0
  const tapRingOpacity = on ? 0 : 1

  return (
    <svg
      viewBox="0 0 440 380"
      aria-hidden
      onDoubleClick={onTurnOff}
      className={float ? 'sr-van-float' : undefined}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 3,
        overflow: 'visible',
        cursor: 'pointer',
      }}
    >
      <defs>
        <linearGradient id="sr-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#212936" />
          <stop offset="1" stopColor="#0C121A" />
        </linearGradient>
        <linearGradient id="sr-body2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#161D27" />
          <stop offset="1" stopColor="#0A0F16" />
        </linearGradient>
        <linearGradient id="sr-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#123049" />
          <stop offset="1" stopColor="#07131F" />
        </linearGradient>
        <radialGradient id="sr-lensOff" cx="0.5" cy="0.45" r="0.7">
          <stop offset="0" stopColor="#48535F" />
          <stop offset="1" stopColor="#1C232D" />
        </radialGradient>
        <radialGradient id="sr-lensOn" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0" stopColor="#FFFCEB" />
          <stop offset="0.45" stopColor="#FFE45C" />
          <stop offset="1" stopColor="#FFB100" />
        </radialGradient>
        <radialGradient id="sr-shadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(0,0,0,0.6)" />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      <ellipse cx="220" cy="342" rx="180" ry="26" fill="url(#sr-shadow)" />

      <rect x="46" y="150" width="26" height="26" rx="9" fill="url(#sr-body2)" stroke="#16344F" strokeWidth="1.5" />
      <rect x="368" y="150" width="26" height="26" rx="9" fill="url(#sr-body2)" stroke="#16344F" strokeWidth="1.5" />
      <rect x="70" y="158" width="16" height="7" rx="3.5" fill="#161D27" />
      <rect x="354" y="158" width="16" height="7" rx="3.5" fill="#161D27" />

      <rect x="104" y="290" width="46" height="52" rx="20" fill="#090B0F" />
      <rect x="290" y="290" width="46" height="52" rx="20" fill="#090B0F" />
      <rect x="114" y="300" width="26" height="30" rx="12" fill="#16344F" />
      <rect x="300" y="300" width="26" height="30" rx="12" fill="#16344F" />

      <rect x="70" y="50" width="300" height="252" rx="48" fill="url(#sr-body)" stroke="#020304" strokeWidth="1" />
      <rect x="92" y="58" width="256" height="24" rx="14" fill="#ffffff" opacity="0.05" />
      <rect x="74" y="150" width="10" height="120" rx="5" fill="#16344F" opacity="0.55" />
      <rect x="356" y="150" width="10" height="120" rx="5" fill="#16344F" opacity="0.55" />
      <path d="M118 52 Q90 52 78 78" fill="none" stroke="#FFC9A3" strokeWidth="3" strokeLinecap="round"
            opacity={on ? 0.8 : 0} style={{ transition: 'opacity 1.1s ease' }} />

      <rect x="104" y="90" width="232" height="72" rx="24" fill="url(#sr-glass)" />
      <path d="M124 158 L188 96 L214 96 L150 158 Z" fill="#ffffff" opacity="0.07" />
      <rect x="104" y="90" width="232" height="72" rx="24" fill="none" stroke="#0A1926" strokeWidth="2" />

      <rect x="118" y="184" width="204" height="12" rx="6" fill="#232C38" />
      <rect x="118" y="184" width="204" height="12" rx="6" fill="url(#sr-lensOn)" opacity={lampOpacity}
            className={on ? 'sr-headlight-flash' : undefined}
            style={{ transition: 'opacity 1.1s ease' }} />
      <circle cx="220" cy="190" r="15" fill="#0B121A" stroke="#16344F" strokeWidth="2" />
      <path d="M214 190h12M220 184v12" stroke="#FFD21E" strokeWidth="2" strokeLinecap="round"
            opacity={lampOpacity} style={{ transition: 'opacity 1.1s ease' }} />

      <rect x="96" y="212" width="248" height="60" rx="26" fill="url(#sr-body2)" />
      <rect x="150" y="230" width="140" height="8" rx="4" fill="#0A0F16" />
      <rect x="162" y="246" width="116" height="7" rx="3.5" fill="#0A0F16" />
      <rect x="86" y="262" width="268" height="40" rx="20" fill="#0E141C" />
      <rect x="180" y="276" width="80" height="18" rx="9" fill="#16344F" opacity="0.7" />

      <g style={{ cursor: 'pointer' }} onClick={onTurnOn}>
        <rect x="104" y="176" width="58" height="28" rx="14" fill="url(#sr-lensOff)" stroke="#0A0F16" strokeWidth="1.5" />
        <rect x="104" y="176" width="58" height="28" rx="14" fill="url(#sr-lensOn)" opacity={lampOpacity}
              className={on ? 'sr-headlight-flash' : undefined} style={{ transition: 'opacity 1.1s ease' }} />
        <g opacity={tapRingOpacity} style={{ transition: 'opacity .5s ease' }}>
          <circle cx="133" cy="190" r="26" fill="none" stroke="#FFD21E" strokeWidth="2" className="sr-tap-ring" />
        </g>
      </g>

      <g style={{ cursor: 'pointer' }} onClick={onTurnOn}>
        <rect x="278" y="176" width="58" height="28" rx="14" fill="url(#sr-lensOff)" stroke="#0A0F16" strokeWidth="1.5" />
        <rect x="278" y="176" width="58" height="28" rx="14" fill="url(#sr-lensOn)" opacity={lampOpacity}
              className={on ? 'sr-headlight-flash' : undefined} style={{ transition: 'opacity 1.1s ease' }} />
        <g opacity={tapRingOpacity} style={{ transition: 'opacity .5s ease' }}>
          <circle cx="307" cy="190" r="26" fill="none" stroke="#FFD21E" strokeWidth="2" className="sr-tap-ring sr-tap-ring--b" />
        </g>
      </g>
    </svg>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: no errors mentioning `van-light-reveal.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/auth/login/van-light-reveal.tsx
git commit -m "feat(login): add VanLightReveal component"
```

---

### Task 6: LoginCard component — real backend wiring

This is the task that talks to the actual auth API. The contract below was read directly from `app/api/auth/login/route.ts` and `middleware.ts` — do not substitute the reference doc's assumptions.

**Files:**
- Create: `components/auth/login/login-card.tsx`

**Interfaces:**
- Consumes: `AuthInput` from Task 2 (`import { AuthInput } from './auth-input'`); CSS class `sr-spin` from Task 1.
- Produces: `export function LoginCard(props: { on: boolean; cardRef?: Ref<HTMLDivElement> })`. Consumed by Task 8.
- Calls `POST /api/auth/login` with JSON body `{ email, password }`. Response handling:
  - `200 { success: true, user: { role: 'admin'|'driver'|'passenger', ... } }` → `router.push(ROLE_HOME[user.role])`, `router.refresh()`
  - `403` with `data.needsVerification === true` → `router.push('/auth/verify-email?email=' + encodeURIComponent(data.email ?? email))`
  - `401` → inline error "Invalid email or password."
  - any other non-OK status → inline error `data.error` (already user-safe text from the API) or a generic fallback
  - network/parse failure → inline error "Something went wrong. Please try again."

- [ ] **Step 1: Create the component**

```tsx
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
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: no errors mentioning `login-card.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/auth/login/login-card.tsx
git commit -m "feat(login): add LoginCard wired to POST /api/auth/login"
```

---

### Task 7: Add Manrope font

**Files:**
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: CSS custom property `--font-manrope` available on `<html>`, inherited everywhere. Consumed by Tasks 2, 6, 8 via `fontFamily: 'var(--font-manrope), ...'`.

- [ ] **Step 1: Add the Manrope import and instance**

In `app/layout.tsx`, change the font import line:

```ts
import { Plus_Jakarta_Sans, Space_Grotesk, IBM_Plex_Mono, Manrope } from 'next/font/google'
```

Add a new font instance after the existing `mono` declaration:

```ts
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
})
```

- [ ] **Step 2: Apply the variable to `<html>`**

Change the `<html>` className to include it:

```tsx
<html lang="en" suppressHydrationWarning className={`${sans.variable} ${display.variable} ${mono.variable} ${manrope.variable}`}>
```

- [ ] **Step 3: Type-check and build**

Run: `npm run type-check`
Expected: no errors

Run: `npm run build`
Expected: build succeeds (confirms the new Google Font resolves and downloads at build time)

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(login): load Manrope font for the cinematic login page"
```

---

### Task 8: Replace the login page

**Files:**
- Modify: `app/auth/login/page.tsx` (full replacement)

**Interfaces:**
- Consumes: `MotionBackground` (Task 3), `VanLightReveal` (Task 5), `HeadlightGlow` (Task 4), `LoginCard` (Task 6), `Logo` from `@/components/ui/logo` (existing), CSS from Task 1.

- [ ] **Step 1: Replace the file contents**

```tsx
'use client'

import { useRef, useState } from 'react'
import { Lightbulb, LightbulbOff } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import MotionBackground from '@/components/auth/login/motion-background'
import VanLightReveal from '@/components/auth/login/van-light-reveal'
import HeadlightGlow from '@/components/auth/login/headlight-glow'
import { LoginCard } from '@/components/auth/login/login-card'
import '@/components/auth/login/login-animations.css'

export default function LoginPage() {
  const [on, setOn] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const turnOn = () => {
    if (on) return
    setOn(true)
    setTimeout(() => {
      const el = cardRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      if (r.top > window.innerHeight * 0.55) {
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        window.scrollTo({ top: window.scrollY + r.top - 20, behavior: reduce ? 'auto' : 'smooth' })
      }
    }, 700)
  }

  const turnOff = () => {
    if (!on) return
    setOn(false)
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <div
      style={{
        position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden',
        background: 'radial-gradient(1100px 700px at 30% 18%, #0E2438 0%, #0A0F16 46%, #070809 100%)',
        fontFamily: 'var(--font-manrope), system-ui, sans-serif', color: '#EAF0F5',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <MotionBackground showRoutes />

      <header style={{ position: 'relative', zIndex: 6, padding: '26px clamp(20px,5vw,54px)' }}>
        <Logo wordmarkClassName="text-xl" />
      </header>

      <main
        style={{
          position: 'relative', zIndex: 5, flex: 1, display: 'flex', flexWrap: 'wrap',
          alignItems: 'center', justifyContent: 'center', gap: 'clamp(24px,4vw,56px)',
          width: '100%', maxWidth: 1200, margin: '0 auto', padding: '8px clamp(20px,5vw,54px) 56px',
        }}
      >
        <section aria-hidden style={{ position: 'relative', flex: '1.15 1 360px', minWidth: 300, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 520, aspectRatio: '1 / 0.82' }}>
            <HeadlightGlow on={on} intensity={1} />
            <VanLightReveal on={on} onTurnOn={turnOn} onTurnOff={turnOff} />
          </div>

          <div style={{ position: 'relative', zIndex: 4, marginTop: 14, width: '100%', minHeight: 196 }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', opacity: on ? 0 : 1, pointerEvents: on ? 'none' : 'auto', transition: 'opacity .5s ease' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 13px', borderRadius: 999, background: 'rgba(22,58,88,0.5)', border: '1px solid rgba(255,201,163,0.25)', fontSize: 11.5, fontWeight: 600, letterSpacing: '0.14em', color: '#FFC9A3' }}>
                READY TO RIDE?
              </div>
              <h1 style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 600, fontSize: 'clamp(22px,3vw,30px)', margin: '14px 0 6px', color: '#F4F6F8' }}>
                Turn on the lights to sign in.
              </h1>
              <p style={{ margin: '0 0 18px', fontSize: 13.5, color: '#9DB0C0' }}>
                Tap the headlights to start, or use the button below.
              </p>
              <button type="button" onClick={turnOn} aria-label="Turn on lights and continue to sign in"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '13px 24px', border: 'none', borderRadius: 14, cursor: 'pointer', fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 15, color: '#0A0B0D', background: 'linear-gradient(150deg,#FFE45C,#FFD21E)', boxShadow: '0 10px 30px rgba(255,210,30,0.32)' }}>
                <Lightbulb size={18} /> Turn on lights
              </button>
            </div>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', opacity: on ? 1 : 0, pointerEvents: on ? 'auto' : 'none', transition: 'opacity .5s ease .2s' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: 'rgba(168,194,86,0.14)', border: '1px solid rgba(168,194,86,0.4)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em', color: '#B7D06A' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#A8C256', boxShadow: '0 0 8px #A8C256' }} />
                LIGHTS ON
              </div>
              <p style={{ margin: '14px 0 14px', fontSize: 13, color: '#9DB0C0' }}>Double-click the van to switch the lights off.</p>
              <button type="button" onClick={turnOff} aria-label="Turn off lights"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(11,28,44,0.6)', color: '#C6D3DE', cursor: 'pointer', fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 13.5 }}>
                <LightbulbOff size={16} /> Turn off lights
              </button>
            </div>
          </div>
        </section>

        <LoginCard on={on} cardRef={cardRef} />
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: no errors

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors (warnings about inline styles, if any, are acceptable — the rest of the codebase's bespoke dark screens follow the same pattern)

- [ ] **Step 4: Commit**

```bash
git add app/auth/login/page.tsx
git commit -m "feat(login): replace login page with cinematic van-headlight experience"
```

---

### Task 9: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Confirm no untouched files were touched**

Run: `git diff --stat HEAD~8..HEAD` (or `git status` if uncommitted) and confirm the changed-file list is exactly: the 6 new files under `components/auth/login/`, `app/layout.tsx`, and `app/auth/login/page.tsx`. `components/auth/auth-shell.tsx` and the other four `app/auth/*/page.tsx` files must show zero diff.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds with 0 errors

- [ ] **Step 3: Start the dev server and drive the real flow in a browser**

Run: `npm run dev` (background)

Using a browser automation tool (Playwright MCP or equivalent), navigate to `http://localhost:3000/auth/login` and verify:
1. Page loads, van visible, headlights dim, "Turn on lights" button present, login card not visible/interactive.
2. Click "Turn on lights" → headlights flash, glow/beams appear, login card fades/slides into view within ~1s.
3. Double-click the van → lights turn back off, card hides again.
4. Turn lights on again, submit the form with an invalid password against a real seeded user (or a deliberately wrong password) → inline red error "Invalid email or password." appears, no console error, no password visible in Network tab request body beyond the expected POST payload (expected — it's a form submission over HTTPS-equivalent local dev; just confirm nothing else logs it).
5. Submit with a valid, verified user's credentials (if a seeded test account is available) → success state (green button, checkmark, "Welcome back!"), toast, redirect to the correct `ROLE_HOME` path for that user's role.
6. If an unverified test account is available, submit with it → redirected to `/auth/verify-email?email=...`.
7. Resize the viewport to 375px width → van and card stack vertically, no horizontal scroll.
8. Resize to 1440px width → side-by-side layout, van left, card right.
9. Tab through the page with keyboard only → "Turn on lights" button is reachable and activates the reveal; once revealed, email/password/forgot-password/create-account are all reachable in order.
10. Emulate `prefers-reduced-motion: reduce` → card still reveals (not stuck hidden), no animation.

If the dev server can't reach MongoDB in this environment (no `MONGODB_URI` configured for the sandbox), skip steps 4-6 here and hand them to the user as manual follow-up — but steps 1-3, 7-10 must be verified directly.

- [ ] **Step 4: Report results**

Summarize what was verified directly vs. what still needs the user's manual check (see plan output for the final report format), then stop — do not commit anything further in this task.

---

## Self-Review Notes

- Spec coverage: full-bleed layout (Task 8), bespoke palette (all tasks, hardcoded hex), Manrope font (Task 7), real `ROLE_HOME`/verification-redirect contract (Task 6), accessibility requirements (keyboard buttons, labels, `role="alert"`, reduced-motion CSS guard — Tasks 1, 2, 6, 8), responsive stacking (Task 8's flex-wrap layout), AuthShell/other pages untouched (Task 9 verifies via diff).
- No placeholders: every task has complete, runnable code.
- Type consistency checked: `LoginCard`'s `cardRef?: Ref<HTMLDivElement>` matches `useRef<HTMLDivElement>(null)` passed from Task 8; `AuthInput`'s prop names (`label`, `type`, `value`, `onChange`, `placeholder`, `autoComplete`, `disabled`, `icon`, `labelAside`) match every call site in Task 6; `VanLightReveal`'s `{ on, onTurnOn, onTurnOff, float }` matches Task 8's usage; `HeadlightGlow`'s `{ on, intensity }` matches Task 8's usage.
