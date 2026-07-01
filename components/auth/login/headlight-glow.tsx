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
