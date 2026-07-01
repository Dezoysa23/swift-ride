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
