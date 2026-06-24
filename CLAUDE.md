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
```

No test runner is configured — there are no test scripts in `package.json`.

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string (`mongodb+srv://...`) |
| `JWT_SECRET` | ≥32-char random string for signing JWTs |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_...`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_...`) |
| `NEXT_PUBLIC_APP_URL` | App base URL used for Stripe redirects |

`lib/db.ts` overrides DNS to Google's servers (`8.8.8.8`) to fix MongoDB SRV resolution on the local network.

## Architecture

### Directory layout

- `app/<role>/` — page routes for each role
- `app/api/<role>/` — API handlers for each role
- `app/auth/` — shared login/register pages; `app/api/auth/` for auth endpoints
- `components/<role>/` — role-specific React components
- `components/ui/` — shared shadcn/ui primitives (Radix-based)
- `components/layouts/` — per-role shell layouts with sidebars/navbars
- `lib/` — DB connection, auth helpers, Mongoose models, Stripe client, validation, rate limiting, audit logging
- `hooks/` — React hooks (`use-toast.ts`)

### Authentication & authorization

Authentication is enforced in two places:

1. **`middleware.ts`** — runs on every non-static request. Verifies `swift_token`, redirects unauthenticated users to `/auth/login`, and enforces role boundaries: `/admin*` → admin only, `/driver*` → driver only, `/passenger*` → passenger only. Both page and API paths are covered.
2. **API route guards** — each handler calls `getAuthUser(request)` from `lib/auth.ts` and re-checks the role. This is a defense-in-depth guard in case the middleware is bypassed.

`lib/auth.ts` exposes two ways to get the current user:
- `getAuthUser(request)` — for API route handlers (reads from `NextRequest.cookies`)
- `getCurrentUser()` — for Server Components (reads via `next/headers`)

JWTs are signed with `jose` (HS256, 7-day expiry). Passwords are hashed with `bcryptjs` (cost 12) inside the Mongoose `pre('save')` hook on `User`. The `toJSON` transform strips the `password` field before any user object is serialized.

### Data models (`lib/models/`)

| Model | Key fields | Notes |
|---|---|---|
| `User` | `role`, `isActive`, `walletBalance`, `licenseNumber`, `assignedBusId` | Single collection for all roles; discriminated by `role` enum |
| `Bus` | `status`, `driverId`, `currentRouteId`, `currentLocation {lat,lng}` | Location updated by driver in real time |
| `Route` | `stops[]`, `fare`, `assignedBusIds[]` | Stops carry optional `lat/lng` and an ordering index |
| `Booking` | `passengerId`, `routeId`, `busId`, `turnId`, `status`, `paymentStatus`, `stripePaymentIntentId` | Status: `pending→confirmed→completed/cancelled`; paymentStatus: `pending→paid/refunded` |
| `Turn` | `driverId`, `busId`, `routeId`, `scheduledDate`, `startTime`, `endTime`, `status` | Represents a single driver-bus-route run; status: `scheduled→active→completed/cancelled` |
| `Payment` | `passengerId`, `bookingId`, `stripePaymentIntentId`, `status` | Created as `pending` when a PaymentIntent is made; updated to `paid` on Stripe webhook |

### Payment flow

1. Passenger calls `POST /api/passenger/payment` → creates a Stripe `PaymentIntent` + a `pending` Payment record; returns `clientSecret` to the client.
2. Client uses `@stripe/react-stripe-js` to collect card details and confirm the intent.
3. Stripe calls `POST /api/payments/webhook` → `checkout.session.completed` event updates the `Booking` (`isPaid`, `paymentStatus: completed`) and the `Payment` record.

There is also a `POST /api/payments/create-checkout` (Stripe Checkout Session path) and a `GET/POST /api/payments` for direct payment queries.

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
