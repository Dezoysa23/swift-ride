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
            <div inert={on || undefined} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', opacity: on ? 0 : 1, pointerEvents: on ? 'none' : 'auto', transition: 'opacity .5s ease' }}>
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
            <div inert={on ? undefined : true} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', opacity: on ? 1 : 0, pointerEvents: on ? 'auto' : 'none', transition: 'opacity .5s ease .2s' }}>
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
