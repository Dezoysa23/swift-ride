import crypto from 'crypto'
import nodemailer from 'nodemailer'

// Server-only email helper. Uses Gmail SMTP when GMAIL_USER + GMAIL_APP_PASSWORD are set;
// otherwise falls back to a dev console log so local development still works without credentials.
// In production with no credentials, sending fails safely (returns false) and is logged.

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    })
  }
  return transporter
}

interface SendArgs {
  to: string
  subject: string
  html: string
  text: string
}

export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<boolean> {
  const transport = getTransporter()
  const from = `Swift Ride <${process.env.GMAIL_USER}>`

  if (!transport) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n[email:dev] ── EMAIL (no GMAIL credentials set) ──\n[email:dev] To:      ${to}\n[email:dev] Subject: ${subject}\n[email:dev] Body:    ${text}\n[email:dev] ────────────────────────────────\n`)
      return true
    }
    console.error('Email not sent: GMAIL_USER or GMAIL_APP_PASSWORD is not configured')
    return false
  }

  try {
    await transport.sendMail({ from, to, subject, html, text })
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
