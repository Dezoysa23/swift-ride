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
