# Cinematic Van-Headlight Login — Design Spec

Date: 2026-07-01
Status: Approved

## Summary

Replace `app/auth/login/page.tsx` with a full-bleed, cinematic "van headlights" login
experience: a dark stage shows an electric van with its headlights off. Tapping a
headlight (or a "Turn on lights" button) flashes the lights on — glow, twin beams,
drifting particles, lit road dashes — and reveals a glass login card. The card wires
to the existing `/api/auth/login` endpoint with no backend changes.

This touches **only** the login page. Every other auth page (`register`,
`forgot-password`, `reset-password`, `verify-email`) keeps using the existing
`AuthShell` split-screen scaffold, unchanged.

## Why a bespoke look (not brand tokens)

The reference design's palette (matte black / Prussian blue / yellow / peach / green)
does not match the app's shadcn-token brand system (coral/teal/gold, light+dark
themed). The codebase already has precedent for this: `components/driver/active-trip.tsx`
and `app/passenger/tracking/[id]/page.tsx` are intentionally bespoke, hardcoded-dark,
non-tokenized "immersive" screens. The login page follows that same precedent — it's
a deliberate one-off, not a tokenization target.

Consequence: no `ThemeToggle`, no light mode, on this page. Login will look and feel
different from the rest of the auth flow by design.

## Files

New:
- `components/auth/login/van-light-reveal.tsx` — inline-SVG van. Click either headlight → turn on. Double-click van → turn off.
- `components/auth/login/headlight-glow.tsx` — central bloom, twin beam cones, particles, lit road dashes.
- `components/auth/login/motion-background.tsx` — Prussian radial backdrop + drifting route-line texture + floor vignette.
- `components/auth/login/login-card.tsx` — glass card, form, error/loading/success states. Owns `email`/`password`/`error`/`loading`/`success` state and the `fetch('/api/auth/login')` call directly (no separate adapter file).
- `components/auth/login/auth-input.tsx` — labeled, icon-prefixed input; password field gets show/hide toggle.
- `components/auth/login/login-animations.css` — all `@keyframes` + helper classes; disabled under `prefers-reduced-motion`.

Modified:
- `app/auth/login/page.tsx` — rewritten as thin orchestrator: `on` (lights) boolean state, `cardRef`, `turnOn`/`turnOff` handlers, renders `MotionBackground` + `VanLightReveal` + `HeadlightGlow` + prompt/hint slot + `LoginCard`.
- `app/layout.tsx` — add `Manrope` via `next/font/google` (weights 400/500/600/700), exposed as a CSS variable (e.g. `--font-manrope`) alongside the existing `Space_Grotesk`/`Plus_Jakarta_Sans`/`IBM_Plex_Mono` font vars. Applied only inside the login page's markup, not globally.

Untouched:
- `components/auth/auth-shell.tsx`, all other `app/auth/*` pages, `lib/auth.ts`, `middleware.ts`, all API routes.

## Backend contract (verified against current code, not the reference doc)

`POST /api/auth/login` with `{ email, password }`.

| Response | Card behavior |
|---|---|
| `200 { success: true, user: { role, ... } }` | success state (green check, "Welcome back!"), `toast.success`, then `router.push(ROLE_HOME[user.role])` + `router.refresh()` |
| `403 { needsVerification: true, email }` | `toast.info(...)`, `router.push('/auth/verify-email?email=' + encodeURIComponent(email))` — no inline banner, matches existing behavior |
| `401 { error: "Invalid credentials" }` | inline error: "Invalid email or password." |
| `403 { error: "Account is deactivated" }` | inline error: pass through (already user-safe) |
| `400 { error: ... }` | inline error: pass through (already user-safe, e.g. "Invalid email format") |
| `429 { error: ... }` | inline error: pass through |
| anything else / network failure | inline error: "Something went wrong. Please try again." |

`ROLE_HOME` (from `middleware.ts`, authoritative — reference README's map was wrong):
`admin → /admin/dashboard`, `driver → /driver`, `passenger → /passenger`.

Never logs email/password/full response bodies to the console.

Links: "Forgot password?" → `/auth/forgot-password`; "Create an account" → `/auth/register`. Both real existing routes.

## Visual design

Palette (hardcoded, not tokenized): matte black `#0A0B0D`; Prussian `#0E2438`/surface
`#123049`/line `#16344F`; input bg `#0B1C2C`; yellow `#FFD21E`/light `#FFE45C`; peach
`#FFC9A3`/warm `#FFB587`; green `#A8C256`/light `#B7D06A`; text `#EAF0F5`/strong
`#F4F6F8`/muted `#9DB0C0`/dim `#6E8497`. Error `#FF8B8B` on `rgba(214,69,69,0.13)`.

Typography: Space Grotesk (already loaded) for display/headings; Manrope (newly
added) for body text, per the reference spec.

Layout: van stage (`flex:1.15 1 360px`) + card (`flex:0.85 1 360px`), both
`min-width:300px`, wraps to stacked mobile with no media queries — as in the
reference. Fixed-height prompt/hint slot (`min-height:196px`) to avoid layout shift
during the off→on cross-fade.

Motion: CSS keyframes only (no Framer Motion — not installed, not needed for this).
`vanFloat` 6s, `tapPulse` 2s, `glowBreath` 5s, `roadFlow` 1.1s, `floatUp` ~5s,
`headlightFlash` 1.3s, `routeDrift` 40s, reveal transitions ~0.9s
`cubic-bezier(.22,.61,.36,1)`.

## Accessibility

- "Turn on lights" / "Turn off lights" buttons are real, keyboard-reachable buttons
  that trigger the same state change as clicking a headlight / double-clicking the
  van (double-click alone is not keyboard-reachable).
- Real `<label htmlFor>` on every input; password toggle and create-account link are
  real `<button>`/`<Link>` with `aria-label` where icon-only.
- Error banner: `role="alert"`.
- `prefers-reduced-motion`: all keyframe animations disabled; card reveal becomes
  instant (not skipped) — the form is never permanently hidden or animation-gated.

## Testing plan

Automated: `npm run lint`, `npm run type-check`, `npm run build`.

Manual: happy-path login redirecting per role (admin/driver/passenger), wrong
password, deactivated account, unverified-email redirect to `/auth/verify-email`,
forgot-password and register links, mobile/tablet/desktop stacking with no
horizontal scroll, keyboard-only flow, `prefers-reduced-motion` behavior, no
secrets/passwords logged to console.

## Explicitly out of scope

- Any change to `AuthShell` or the other four auth pages.
- Any change to API routes, JWT logic, or middleware.
- Framer Motion, Three.js/react-three-fiber, or any external image asset.
- Tokenizing the new page's colors into `tailwind.config.ts`/`globals.css`.
