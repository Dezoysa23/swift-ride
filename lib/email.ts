import crypto from 'crypto'
import { Resend } from 'resend'

// Server-only email helper. Uses Resend when RESEND_API_KEY is set; otherwise
// falls back to a dev console log so local development still works without a key.
// In production with no key, sending fails safely (returns false) and is logged.

const FROM = process.env.EMAIL_FROM ?? 'Swift Ride <onboarding@resend.dev>'

let client: Resend | null = null
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  if (!client) client = new Resend(key)
  return client
}

interface SendArgs {
  to: string
  subject: string
  html: string
  text: string
}

export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<boolean> {
  const resend = getResend()
  if (!resend) {
    if (process.env.NODE_ENV !== 'production') {
      // Dev fallback — never used in production.
      console.log(`\n[email:dev] To: ${to}\n[email:dev] Subject: ${subject}\n[email:dev] ${text}\n`)
      return true
    }
    console.error('Email not sent: RESEND_API_KEY is not configured')
    return false
  }
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html, text })
    if (error) {
      console.error('Resend error:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('Email send failed:', err)
    return false
  }
}

// ── Verification codes ──────────────────────────────────────────────────
export const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000 // 10 minutes
export const MAX_VERIFICATION_ATTEMPTS = 5

/** 6-digit numeric code (leading zeros allowed). */
export function generateVerificationCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}

/** Store only the hash of a code/token. */
export function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex')
}

export async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
  const subject = 'Your Swift Ride verification code'
  const text = `Your Swift Ride verification code is ${code}. It expires in 10 minutes. If you didn't sign up, you can ignore this email.`
  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:8px">
    <h2 style="margin:0 0 8px">Verify your email</h2>
    <p style="color:#475569;margin:0 0 16px">Enter this code to finish creating your Swift Ride account:</p>
    <p style="font-size:30px;font-weight:800;letter-spacing:8px;margin:0 0 16px">${code}</p>
    <p style="color:#94a3b8;font-size:13px;margin:0">This code expires in 10 minutes. If you didn't sign up, you can ignore this email.</p>
  </div>`
  return sendEmail({ to, subject, html, text })
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  const subject = 'Reset your Swift Ride password'
  const text = `Reset your Swift Ride password using this link: ${resetUrl}\nThis link expires in 10 minutes. If you didn't request this, you can ignore this email.`
  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:8px">
    <h2 style="margin:0 0 8px">Reset your password</h2>
    <p style="margin:0 0 16px"><a href="${resetUrl}" style="display:inline-block;background:#F76C3C;color:#fff;padding:12px 22px;border-radius:9px;text-decoration:none;font-weight:600">Reset password</a></p>
    <p style="color:#475569;font-size:13px;margin:0 0 8px;word-break:break-all">Or paste this link into your browser:<br>${resetUrl}</p>
    <p style="color:#94a3b8;font-size:13px;margin:0">This link expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
  </div>`
  return sendEmail({ to, subject, html, text })
}
