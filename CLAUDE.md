# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Swift.Ride is a ride-sharing / bus-fleet management platform built with **Next.js App Router**. It has three distinct user roles — admin, driver, and passenger — each with their own pages and API surface. The project is currently in early development: the directory scaffold exists but source files have not yet been created. No `package.json` is present; confirm the package manager and dev/build commands with the user before running them.

## Architecture

The codebase follows the Next.js App Router convention with role-isolated directories:

- `app/<role>/` — page routes for each role (admin dashboard, driver portal, passenger UI)
- `app/api/<role>/` — REST API handlers for each role
- `app/auth/` — shared authentication pages and `app/api/auth/` API routes (`login`, `logout`, `register`, `me`)
- `components/<role>/` — role-specific React components; `components/ui/` for shared primitives
- `lib/`, `hooks/`, `utils/` — supporting code (utilities, custom hooks, helper libraries)
- `styles/` — global/shared styles
- `public/` — static assets

### API surface at a glance

| Namespace | Key endpoints |
|---|---|
| Auth | `/api/auth/login`, `/api/auth/logout`, `/api/auth/register`, `/api/auth/me` |
| Admin | `/api/admin/stats`, `/api/admin/buses/[id]`, `/api/admin/drivers/[id]`, `/api/admin/routes/[id]`, `/api/admin/fleet/locations`, `/api/admin/reports/bookings`, `/api/admin/system-settings`, `/api/admin/change-password` |
| Driver | `/api/driver/profile`, `/api/driver/routes/[id]`, `/api/driver/buses/[id]/locations`, `/api/driver/duty-status`, `/api/driver/passengers/[id]`, `/api/driver/turns/[id]/start`, `/api/driver/turns/[id]/complete`, `/api/driver/change-password` |
| Passenger | `/api/passenger/bookings/[id]`, `/api/passenger/routes`, `/api/passenger/profile`, `/api/passenger/payment`, `/api/passenger/payments`, `/api/passenger/change-password` |
| Shared | `/api/buses/locations`, `/api/avatar/[id]`, `/api/upload-avatar`, `/api/routes`, `/api/payments`, `/api/webhooks` |

## Conventions to follow

- **Role isolation**: keep admin, driver, and passenger logic in their own directories. Cross-role shared code belongs in `components/ui/`, `lib/`, `hooks/`, or `utils/`.
- **Route structure**: follow the existing folder naming — dynamic segments use `[id]`, nested actions use sub-folders (e.g. `turns/[id]/start`). Do not flatten nested routes.
- **New API routes**: create a `route.ts` (or `route.js`) inside the appropriate `app/api/<role>/<resource>/` folder.
- **New pages**: add a `page.tsx` inside the appropriate `app/<role>/<feature>/` folder.
- **New shared UI**: add to `components/ui/`; role-specific components go in `components/<role>/`.
