# Swift Ride — Deployment Checklist

Production-readiness notes and the steps required before going live. See `.env.example` for the
full list of environment variables (placeholders only — never commit real values).

## 1. Environment variables (set in your host, e.g. Vercel → Project → Settings → Environment Variables)

Server-only (must NOT be exposed to the browser):
- `MONGODB_URI` — production cluster/database
- `JWT_SECRET` — 32+ random chars
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `GOOGLE_MAPS_SERVER_API_KEY`
- `MAPS_PRICE_BASE_FARE`, `MAPS_PRICE_PER_KM`, `MAPS_PRICE_PER_MINUTE`, `MAPS_PRICE_MINIMUM_FARE` (optional)

Public (browser-exposed — safe by design):
- `NEXT_PUBLIC_APP_URL` — your real production URL (used for reset links + Stripe redirects)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

Email (not yet wired — see §5):
- `EMAIL_FROM` + one provider's key (`RESEND_API_KEY` / `SENDGRID_API_KEY` / `SMTP_*`)

## 2. Build & checks
- `npm run build` — must pass (currently green, 77 routes).
- `npm run type-check` — must pass (currently clean).
- `npm run lint` — configured via `.eslintrc.json` (`next/core-web-vitals`); runs non-interactively and passes with **0 errors** (only non-blocking `react-hooks/exhaustive-deps` warnings). Note: `next lint` is deprecated and removed in Next.js 16 — migrate to the ESLint CLI flat config when upgrading.

## 3. Google Cloud API key restrictions (do this in the Google Cloud Console)
- **Browser key** (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`): restrict by **HTTP referrer** to your production domain(s); restrict to **Maps JavaScript API** + **Places API**.
- **Server key** (`GOOGLE_MAPS_SERVER_API_KEY`): restrict by **API** to **Routes API** + **Geocoding API**; optionally restrict by server IP. Never use it in the browser.
- Set **quotas / budget alerts** on the project to cap cost (the in-app rate limiting below is best-effort only — see §6).

## 4. Database
- Use a dedicated **production** MongoDB database (separate from local/dev).
- Indexes are declared in the Mongoose models (`User`, `Booking`, `Turn`, `DriverLocation`, etc.) and are created automatically on first connect. `User.role`, `User.resetToken` (sparse), and the booking/turn/location indexes are in place.
- Take a **backup / enable point-in-time recovery** in Atlas before launch.
- `lib/db.ts` overrides DNS to Google (8.8.8.8) to fix SRV resolution on some local networks — harmless in most cloud environments, but verify SRV resolution works on your host.

## 5. Email (Resend) — REQUIRED in production
Email is integrated via **Resend** (`lib/email.ts`) and powers both **email verification** and **password reset**:
- New self-registrations are created `emailVerified: false`, emailed a **6-digit code** (hashed + 10-min expiry, max 5 attempts), and cannot log in until they verify at `/auth/verify-email`. Resend is rate-limited (3 / 10 min).
- Password-reset links are emailed (token stored hashed, 10-min expiry).
- **Legacy users** (created before this feature, no `emailVerified` field) are NOT blocked — only accounts explicitly marked `false` must verify.
- Without `RESEND_API_KEY`: in **dev**, emails log to the console (so you can test); in **production**, emails are NOT sent (logged as an error). **You must set `RESEND_API_KEY` for production.**

To finish setup:
1. Create a Resend account, **verify your sending domain**, and create an API key.
2. Set `RESEND_API_KEY` and `EMAIL_FROM` (using your verified domain) in your host env.
3. Test: register a new account → confirm the code email arrives → verify → land on the dashboard.

## 6. Rate limiting (best-effort)
`lib/rateLimit.ts` is **in-memory** and per-process. On serverless/multi-instance hosting (Vercel) it
only partially protects, and it trusts the first `x-forwarded-for` hop. For hard guarantees, move to a
shared store (e.g. **Upstash Redis**) keyed by the platform-injected client IP. This is the main
remaining production-scale hardening item.
Rate limiting is currently applied to: login, register, **verify-email**, **resend-verification**,
forgot-password, reset-password, all change-password routes, all `/api/maps/*` routes, driver location
updates, and **`/api/admin/live-locations`**. In addition, `resend-verification` has a **persisted
60-second per-account cooldown** (via `lastVerificationEmailSentAt`) that survives restarts and works
across instances even before Redis is added.

## 7. Secrets hygiene
- `.env.local` is git-ignored and untracked. Confirm no real secrets are ever committed.
- All server secrets are referenced only in server files; the browser only sees `NEXT_PUBLIC_*`.

## 8. Final manual smoke test (on the deployed URL)
- Register → login → role redirect (admin/driver/passenger).
- Passenger: search route, book, pay (Stripe test mode), track active trip.
- Driver: go on duty, location updates, manage turn/passengers.
- Admin: dashboard, live map (online drivers + active bookings only).
- Confirm browser devtools Network/console shows no server secret values.
