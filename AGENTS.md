---
name: Swift.Ride AI instructions
---

# Swift.Ride AI Agent Instructions

This workspace is a Next.js App Router application for a ride-sharing/fleet management platform with role-based areas for `admin`, `driver`, and `passenger`.

## Key project structure

- `app/` is the primary workspace for page routes, layouts, and API route handlers.
- `components/` contains reusable UI components organized by role and shared primitives under `ui/`.
- `hooks/`, `lib/`, and `utils/` are supporting code directories.
- `public/` holds static assets.
- `styles/` contains global and shared styling resources.

## Build & run

- Install dependencies: `npm install` or `pnpm install`
- Development server: `npm run dev` or `pnpm dev`
- Production build: `npm run build` or `pnpm build`
- Start server: `npm run start` or `pnpm start`
- Lint: `npm run lint` or `pnpm lint`

## What to prioritize

- Change code in `app/` and `components/` first for user-facing and routing updates.
- Keep admin/driver/passenger boundaries intact unless the task explicitly requires a cross-role refactor.
- Prefer shared UI elements under `components/ui/` and role-specific components under `components/admin/`, `components/driver/`, or `components/passenger/`.

## Routing and API conventions

- `app/` contains pages, nested layouts, and route-based UI.
- `app/api/` contains API route handlers and route folders; use `route.ts` for endpoint implementations.
- Dynamic route segments use `[id]` and nested action folders are preserved.
- Auth flows are located under `app/auth/` and `app/api/auth/`.

## Important notes

- The repo has `package.json` and `pnpm-lock.yaml`; do not assume package metadata is missing.
- Current stack includes Next.js 15, React 19, Tailwind CSS, Stripe, Google Maps, and MongoDB.
- Environment variables and prerequisites are documented in `README.md`.
- Do not assume backend details beyond the visible `app/api/*` directories and auth routes.

## When editing

- Preserve route folder structure and file naming conventions.
- Keep role-specific behavior localized to `app/admin/`, `app/driver/`, or `app/passenger/` unless a shared feature is explicitly requested.
- Prefer adding new shared UI elements under `components/ui/` or `components/<role>/` as appropriate.

## If more information is needed

- Request package manager and command preferences only if there is uncertainty about local workspace usage.
- Confirm architecture details before changing routing conventions or auth flow behavior.
