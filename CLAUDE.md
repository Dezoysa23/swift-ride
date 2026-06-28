# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Swift.Ride is a bus-fleet management and ride-booking platform built with **Next.js 15 App Router** (React 19). Three distinct user roles — **admin**, **driver**, and **passenger** — each have isolated pages, API routes, and components. Data lives in MongoDB (Mongoose ODM); payments are handled by Stripe; auth uses JWT stored in an `httpOnly` cookie named `swift_token`.

## Build and run

```bash
npm install        # or pnpm install
npm run dev        # start dev server (http://localhost:3000)
npm run build      # production build
npm run lint       # ESLint
npm run type-check # tsc --noEmit (no emit; gate for type errors)
```

There is no unit-test runner. Playwright (`@playwright/test`) is installed for end-to-end browser tests, but no `test` script is wired into `package.json` — run specs directly with `npx playwright test`.

## Environment variables

Copy `.env.example` to `.env.local` and fill in. `NEXT_PUBLIC_*` keys are exposed to the browser; everything else is server-only.

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string (`mongodb+srv://...`) |
| `JWT_SECRET` | ≥32-char random string for signing JWTs |
| `NEXT_PUBLIC_APP_URL` | App base URL used for password-reset links and Stripe redirects |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_...`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_...`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Browser Maps key (restrict by HTTP referrer; Maps JS + Places) |
| `GOOGLE_MAPS_SERVER_API_KEY` | Server Maps key (Routes + Geocoding); **never** exposed to the browser |
| `MAPS_PRICE_BASE_FARE` / `MAPS_PRICE_PER_KM` / `MAPS_PRICE_PER_MINUTE` / `MAPS_PRICE_MINIMUM_FARE` | Fare-estimate tuning (optional; code has defaults) |
| `RESEND_API_KEY` | Resend API key for verification + password-reset emails (optional in dev) |
| `EMAIL_FROM` | Sender address; must use a Resend-verified domain in production |

`lib/db.ts` overrides DNS to Google's servers (`8.8.8.8`) to fix MongoDB SRV resolution on the local network.

## Architecture

### Directory layout

- `app/<role>/` — page routes for each role
- `app/api/<role>/` — API handlers for each role
- `app/auth/` — shared login/register pages; `app/api/auth/` for auth endpoints
- `components/<role>/` — role-specific React components
- `components/ui/` — shared shadcn/ui primitives (Radix-based)
- `components/layouts/` — per-role shell layouts with sidebars/navbars
- `lib/` — DB connection, auth helpers, Mongoose models, Stripe client, validation, rate limiting, audit logging, email (`email.ts`), Google Maps (`maps/google-maps.ts`), proximity/ETA logic (`location/proximity.ts`)
- `hooks/` — React hooks (`use-toast.ts`)

The premium UI uses **Three.js via `@react-three/fiber` + `@react-three/drei`** for 3D hero/motif surfaces, plus `recharts` for admin dashboards and `qrcode.react` for boarding QR codes.

### Authentication & authorization

Authentication is enforced in two places:

1. **`middleware.ts`** — runs on every non-static request. Verifies `swift_token`, redirects unauthenticated users to `/auth/login`, and enforces role boundaries: `/admin*` → admin only, `/driver*` → driver only, `/passenger*` → passenger only. Both page and API paths are covered.
2. **API route guards** — each handler calls `getAuthUser(request)` from `lib/auth.ts` and re-checks the role. This is a defense-in-depth guard in case the middleware is bypassed.

`lib/auth.ts` exposes two ways to get the current user:
- `getAuthUser(request)` — for API route handlers (reads from `NextRequest.cookies`)
- `getCurrentUser()` — for Server Components (reads via `next/headers`)

JWTs are signed with `jose` (HS256, 7-day expiry). Passwords are hashed with `bcryptjs` (cost 12) inside the Mongoose `pre('save')` hook on `User`. The `toJSON` transform strips `password`, `verificationCode`, and `resetToken` before any user object is serialized.

`middleware.ts` keeps a `PUBLIC_PATHS` allow-list (login, register, forgot/reset-password, verify-email/resend-verification, and their `/api/auth/*` counterparts). Logged-in users hitting a public path are bounced to their role home (`ROLE_HOME`).

### Email verification & password reset

- **`lib/email.ts`** wraps Resend. With no `RESEND_API_KEY`, dev logs the email to the console and returns `true`; production returns `false` and logs an error (fails safe, never throws). Verification codes are 6-digit numeric, hashed with SHA-256 before storage, TTL 10 min, max 5 attempts (`VERIFICATION_CODE_TTL_MS`, `MAX_VERIFICATION_ATTEMPTS`).
- On `User`, only the **hash** of a code/reset-token is stored (`verificationCode`, `resetToken`). `emailVerified` has **no default** — legacy users with the field absent are treated as verified; only new self-registrations get the verification gate.
- Flow: `register` → `verify-email` (code) / `resend-verification`; `forgot-password` → emailed link → `reset-password` (hashed token, 10-min expiry).

### Google Maps integration (`lib/maps/google-maps.ts`)

Server-side only — uses `GOOGLE_MAPS_SERVER_API_KEY` and calls Google's Geocoding API, **Routes API v2** (`computeRoutes`, traffic-aware, encoded polyline), and **Places Autocomplete v1**. Each public route under `app/api/maps/*` (`autocomplete`, `geocode`, `reverse-geocode`, `route`, `estimate-price`) is a thin wrapper that normalizes Google's response into the `Normalized*` shapes. `calculateEstimatedPrice()` computes fare from distance/duration + the `MAPS_PRICE_*` env config, clamped to a minimum fare.

### Live location tracking & proximity (`lib/location/proximity.ts`)

Drivers push GPS via `app/api/location/driver/{update,online,offline}`; passengers push pickup points via `app/api/location/passenger/pickup`. `proximity.ts` computes Haversine distance + ETA and runs a **forward-only notification state machine** (`driver_assigned → on_way → getting_closer → 5_min → 2_min → arrived`): never downgrades state, never repeats, throttled to ≥60 s between sends. Per-booking proximity state lives on the `Booking` document (`tripStatus`, `lastProximityNotification*`, `driverLast*`).

### Data models (`lib/models/`)

| Model | Key fields | Notes |
|---|---|---|
| `User` | `role`, `isActive`, `walletBalance`, `licenseNumber`, `assignedBusId`, `emailVerified`, `verificationCode`, `resetToken` | Single collection for all roles; discriminated by `role` enum. Verification/reset fields store SHA-256 hashes only |
| `Bus` | `status`, `driverId`, `currentRouteId`, `currentLocation {lat,lng}` | Location updated by driver in real time |
| `Route` | `stops[]`, `fare`, `assignedBusIds[]` | Stops carry optional `lat/lng` and an ordering index |
| `Booking` | `passengerId`, `routeId`, `busId`, `turnId`, `status`, `paymentStatus`, `stripePaymentIntentId`, pickup/dropoff lat·lng, `tripStatus`, `lastProximity*` | Status: `pending→confirmed→completed/cancelled`; paymentStatus: `pending→paid/refunded`. Trip-tracking fields drive live proximity notifications |
| `Turn` | `driverId`, `busId`, `routeId`, `scheduledDate`, `startTime`, `endTime`, `status` | Represents a single driver-bus-route run; status: `scheduled→active→completed/cancelled` |
| `Payment` | `passengerId`, `bookingId`, `stripePaymentIntentId`, `status` | Created as `pending` when a PaymentIntent is made; updated to `paid` on Stripe webhook |
| `DriverLocation` | `driverId` (unique), `busId`, `routeId`, `lat/lng`, `heading`, `speed`, `status` | One live-position doc per driver (`online`/`offline`/`on_trip`); upserted on each GPS update |
| `LocationEvent` | `userId`, `bookingId`, `role`, `lat/lng`, `eventType` | Append-only audit trail of location events; **TTL index expires docs after 90 days** |

### Payment flow

1. Passenger calls `POST /api/passenger/payment` → creates a Stripe `PaymentIntent` (with `bookingId` in metadata) + a `pending` Payment record; returns `clientSecret` to the client.
2. Client uses `@stripe/react-stripe-js` to collect card details and confirm the intent.
3. Stripe calls `POST /api/webhooks` → on `payment_intent.succeeded` it sets the `Booking` to `paymentStatus: 'paid', status: 'confirmed'` and the `Payment` record to `succeeded` (matched by `stripePaymentIntentId`). The route disables body parsing and verifies the signature against `STRIPE_WEBHOOK_SECRET`.

`GET/POST /api/payments` serves direct payment queries.

### Security utilities

- **`lib/rateLimit.ts`** — in-memory IP-based rate limiter (5 attempts / 60 s window). **Not suitable for multi-process production** — replace with Redis. Used on auth endpoints.
- **`lib/auditLog.ts`** — structured JSON console logging for security-relevant events (login failures, password changes, admin actions, payments). Production target is an external log aggregator.
- **`lib/validate.ts`** — input validation helpers: `email`, `password` (complexity rules), `string`, `phone`, `number`, `enum`, `mongoId`.

## Conventions

- **Role isolation**: keep admin/driver/passenger logic in their own directories. Cross-role shared code belongs in `components/ui/`, `lib/`, `hooks/`, or `utils/`.
- **Route structure**: dynamic segments use `[id]`; nested actions use sub-folders (e.g. `turns/[id]/start`). Do not flatten.
- **New API routes**: `route.ts` inside `app/api/<role>/<resource>/`.
- **New pages**: `page.tsx` inside `app/<role>/<feature>/`.
- **Model registration guard**: all Mongoose models use `mongoose.models.X ?? mongoose.model(...)` to prevent re-registration during hot reload.
- **Currency**: fares are stored and displayed in LKR; Stripe amounts are passed in cents (multiply by 100 before sending to Stripe).
