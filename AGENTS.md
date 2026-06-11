---
name: Swift.Ride AI instructions
---

# Swift.Ride AI Agent Instructions

This workspace appears to be a React/Next-style application with a route-based UI and role-specific areas for `admin`, `driver`, and `passenger`.

## Key project structure

- `app/` is the primary workspace for route definitions, pages, and API endpoints.
- `components/` contains reusable UI components organized by role and shared components under `ui/`.
- `hooks/`, `lib/`, and `utils/` are supporting code directories.
- `public/` holds static assets.
- `styles/` contains global or shared styling resources.

## What to prioritize

- Change code in `app/` and `components/` first for user-facing and routing updates.
- Keep the admin/driver/passenger boundaries intact unless the task explicitly requires a cross-role refactor.
- Follow existing route and API folder conventions such as dynamic segments like `[id]`.

## Important notes

- No `package.json`, `README.md`, or other root metadata files were present in the current workspace snapshot.
- If build or test commands are needed, ask the user for package manager and command details before making assumptions.
- Do not assume backend details beyond the visible `app/api/*`, `app/auth/*`, and `app/webhooks/*` routes.

## When editing

- Preserve route folder structure and file naming conventions.
- Prefer adding new shared UI elements under `components/ui/` or `components/<role>/` as appropriate.
- Keep role-specific behavior localized to `app/admin/`, `app/driver/`, or `app/passenger/` unless a shared feature is explicitly requested.

## If more information is needed

- Request the project's package metadata, build/test commands, or any existing style/architecture documentation.
- Confirm whether the app uses Next.js App Router or another React routing approach if it cannot be inferred from source files.
