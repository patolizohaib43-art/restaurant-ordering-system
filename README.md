# Restaurant Online Ordering & Management System

A complete, self-hosted online ordering platform for a single restaurant:
customer menu browsing and checkout, secure order tracking (no customer
account required), an admin panel for managing the menu/orders/deals/
coupons, thermal receipt printing, moderated reviews, and a sales
reporting dashboard.

**Status: Phase 7 — Production Readiness (final phase).** All prior
phases (1–6: foundation, customer ordering, admin panel, receipt
printing & notifications, reports, PWA & mobile UX) are complete. This
phase hardens the app for a real deployment and documents how to run it.

---

## Tech Stack

- **Next.js 14** (App Router) + **TypeScript** (strict mode)
- **Tailwind CSS**
- **PostgreSQL** + **Prisma ORM**
- **jose** (JWT, Edge-compatible) + **bcryptjs** for admin auth
- **zod** for server-side input validation
- PWA (installable, offline fallback page, service worker)
- No Vercel-only APIs — deployable on Vercel *or* a plain Linux VPS
  without a rewrite (see [DEPLOYMENT.md](./DEPLOYMENT.md) and
  [VPS_DEPLOYMENT.md](./VPS_DEPLOYMENT.md))

---

## Project Structure

```
restaurant-ordering-system/
├── prisma/
│   ├── schema.prisma        # Full database schema (indexes, constraints)
│   └── seed.ts               # Creates first admin + sample menu/settings
├── public/
│   ├── manifest.json, sw.js, offline.html   # PWA
│   └── uploads/               # Local image uploads (see limitation below)
├── src/
│   ├── app/
│   │   ├── (customer)/        # Public customer-facing routes
│   │   ├── admin/             # Admin panel (auth required)
│   │   ├── api/                # API routes (customer + /api/admin/*)
│   │   ├── robots.ts, sitemap.ts
│   │   └── layout.tsx
│   ├── components/            # customer/ admin/ shared/
│   ├── lib/                   # db, auth, pricing, reports, tokens, timezone, rate-limit…
│   ├── validation/            # zod schemas — the only source of truth for input shape
│   ├── middleware.ts          # Edge middleware: guards /admin and /api/admin
│   └── types/
├── .env.example
├── DEPLOYMENT.md               # Vercel demo deployment
├── VPS_DEPLOYMENT.md           # Linux VPS production deployment
└── README.md                   # This file
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in real values. **Never commit
`.env`.** See that file for the full, current list with inline
explanations. Notable ones:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Signs admin session tokens — long random string, unique per environment |
| `ADMIN_SESSION_COOKIE_NAME` | Cookie name for the admin session |
| `RESTAURANT_TIMEZONE` | IANA timezone (e.g. `Asia/Karachi`) — see "Timezone Strategy" below |
| `NEXT_PUBLIC_APP_URL` | Public base URL, used for the sitemap and metadata |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` | Used only by `prisma/seed.ts` to create the first admin |

---

## Local Development

```bash
npm install
cp .env.example .env        # then edit .env with real values
npm run prisma:migrate      # creates tables (dev-mode migration)
npm run prisma:seed         # creates first admin + sample menu
npm run dev
```

App runs at `http://localhost:3000`. Admin panel at `/admin/login`
using the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` you set in `.env`.

**Change the seed admin password immediately after first login on any
environment that isn't purely local/throwaway.**

---

## Database Model (summary)

`Admin`, `Category`, `Product`, `ProductAddon`, `Deal`, `Coupon`,
`Order`, `OrderItem`, `OrderItemAddon`, `OrderStatusHistory`, `Review`,
`RestaurantSettings`, `Notification`. Full detail is in
`prisma/schema.prisma`, which is the single source of truth — every
model there has inline comments explaining non-obvious design choices
(e.g. why order line items snapshot product name/price instead of
just referencing the product).

Key security-relevant design decisions:
- **Orders are never accessed by sequential ID.** Every order has a
  high-entropy `trackingToken` (24 random bytes, base64url) generated
  server-side via Node's `crypto.randomBytes`. This token is the only
  way a customer can view their order — never the order number alone.
- **Prices are never trusted from the client.** `src/lib/pricing.ts`
  recomputes subtotal, discount, delivery fee, tax, and total entirely
  from current database values (product price, addon price, coupon
  rules, deal rules, restaurant settings) every time an order is
  placed. Only `productId` / `addonId` / `quantity` selections are
  read from the request body.
- **Reviews require proof of purchase.** A review can only be
  submitted against a `trackingToken` whose order is `DELIVERED` or
  `COMPLETED`, for a product that was actually in that order, and only
  once per `(orderId, productId)` pair (enforced by a DB unique
  constraint, not just application logic).

---

## Admin Authentication

- Passwords hashed with **bcrypt** (cost factor 12) — never stored in
  plaintext, never logged.
- Sessions are **JWTs signed with `jose`** (works identically in the
  Node API routes and the Edge runtime used by `middleware.ts`).
- The session token is stored in an **HttpOnly, SameSite=Lax cookie**,
  marked `Secure` automatically when `NODE_ENV=production`. HttpOnly
  prevents JavaScript (and therefore XSS) from reading it; SameSite=Lax
  blocks it from being sent on cross-site form/JS requests, which is
  the practical CSRF defense for this app's cookie-based JSON APIs.
- **`src/middleware.ts`** runs on every request to `/admin/*` and
  `/api/admin/*` and rejects anything without a valid session — pages
  redirect to `/admin/login`, APIs get a `401 { success: false }` JSON
  body. This is real server-side enforcement, not just hiding UI.
- **Defense in depth:** the protected admin layout
  (`src/app/admin/(protected)/layout.tsx`) independently re-checks the
  session server-side and redirects if missing, in case middleware is
  ever misconfigured.
- **Brute-force protection:** `POST /api/admin/auth/login` is rate
  limited (10 attempts / 15 minutes per IP) via `src/lib/rate-limit.ts`.
  See that file's header comment for an important limitation on
  serverless hosts (the counters live in one process's memory, so
  Vercel's multi-instance routing weakens — but does not eliminate —
  this protection; a shared store like Upstash Redis is recommended for
  strict production brute-force protection).
- **No hardcoded credentials anywhere.** The only admin account created
  automatically is the one `prisma/seed.ts` makes from
  `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env vars, and only if you
  choose to run the seed script.

---

## Timezone Strategy

Sales reports, the admin dashboard's "Today" figures, and the "is the
restaurant open right now" indicator all need a concept of "today" and
"the current time of day." Relying on the server process's own local
timezone is unsafe: Vercel serverless functions run in **UTC** by
default, while a VPS might be configured for any timezone — the same
code would silently produce different "Today's Sales" numbers on the
two platforms.

This app fixes that with one explicit setting: **`RESTAURANT_TIMEZONE`**
(an IANA name, e.g. `Asia/Karachi`, `America/New_York`). All day/month
boundary logic goes through `src/lib/timezone.ts`, which computes
wall-clock time in that timezone using `Intl.DateTimeFormat` —
independent of the server's own local timezone. Set this in every
environment (`.env` locally, and in your hosting provider's environment
variables in production); it defaults to `UTC` if unset.

---

## Rate Limiting / Abuse Protection

`src/lib/rate-limit.ts` provides a small in-memory, fixed-window rate
limiter applied to the endpoints most worth throttling:

| Endpoint | Limit |
|---|---|
| `POST /api/admin/auth/login` | 10 / 15 min per IP |
| `POST /api/orders` (place order) | 15 / 15 min per IP |
| `POST /api/orders/lookup` | 20 / 15 min per IP |
| `POST /api/reviews` | 20 / 15 min per IP |
| `POST /api/coupons/validate` | 30 / 15 min per IP |

This is a practical, dependency-free baseline. Its one real limitation
(documented in the file itself) is that on serverless platforms like
Vercel, each invocation can land on a different ephemeral instance, so
the counters aren't perfectly shared. For stricter guarantees in
production, put a shared store (e.g. Upstash Redis) or your platform's
edge/WAF rate limiting in front of these routes.

---

## Thermal Receipt Printing — Capabilities & Limitations

Receipt rendering (`src/components/admin/receipt/`) supports 58mm and
80mm paper widths, driven by a dedicated print stylesheet
(`receipt.css`) that hides everything except the receipt when printing.

**Important, honest limitation:** a normal mobile or desktop browser
**cannot silently/directly print to a Bluetooth or USB thermal printer**
on its own. What this app does is open the browser's standard print
dialog with a correctly formatted receipt — from there, printing
depends on the OS/printer driver setup already present on that device:

- **Windows / USB or network thermal printers:** works via the normal
  OS print dialog once the printer's Windows driver is installed.
- **Android thermal printers (USB or Bluetooth):** most consumer
  Android browsers cannot print directly to a raw thermal/ESC-POS
  printer without either (a) a manufacturer print app that registers
  as an Android print service, or (b) a small native/local print
  bridge app. This is a platform limitation, not something fixable in
  browser JavaScript.
- **Network thermal printers:** can work well if the printer exposes
  itself as a standard OS-level printer (via IP/driver), same as the
  Windows case.

If unattended, always-on printing is required, the realistic path is a
small local print bridge/native printing solution running on the
till/counter device — architecture-compatible with this app, but not
included, since it depends on the specific printer hardware chosen.

---

## Notifications

- **Admin:** new order, new review, unread count, mark-as-read /
  mark-all-read, optional sound (`notificationSoundEnabled` setting).
- **Customer:** status-change messages surfaced on the tracking page,
  plus an optional browser Notification permission
  (`NotificationPrompt.tsx`) — entirely optional; the app works
  normally if permission is denied or unsupported.
- Implemented via polling (see `POLL_INTERVAL_MS` in the tracking page
  and the admin notification bell), not WebSockets — this keeps the
  app fully compatible with serverless hosting, where long-lived
  connections aren't available. Polling intervals are kept modest to
  avoid unnecessary load.

---

## Reports

`src/lib/reports.ts` computes sales totals, order status distribution,
top products, category performance, coupon/deal analytics, and daily
sales — all from live database queries with the *same* filters as
whatever the admin has on screen (never a cached or hardcoded
snapshot), and using the timezone strategy described above for all
date-range boundaries. CSV export (`/api/admin/reports/export`) reuses
the identical query functions, so the exported file always matches
what's on screen.

---

## Deployment

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — deploy the demo to Vercel with
  a managed PostgreSQL provider.
- **[VPS_DEPLOYMENT.md](./VPS_DEPLOYMENT.md)** — move to a Linux VPS
  (Nginx + Node/PM2 or Docker + PostgreSQL) for full long-term control.

The app deliberately avoids Vercel-only services (no Vercel KV/Blob/
Edge-only APIs), so moving between the two is a hosting change, not a
rewrite. The one exception worth knowing in advance: local image
uploads (`/api/admin/upload`) write to `public/uploads` on local disk,
which is **not persistent on Vercel** (its filesystem is read-only /
ephemeral outside of `/tmp`). On Vercel, use the **Image URL** field
instead of file upload, or point uploads at an external object store.
On a VPS this works as-is since the disk is persistent.

---

## Production Checklist (this phase's audit, summarized)

See the end of this Phase 7 delivery for the full, explicit
Completed / Requires-manual-configuration breakdown. In short: admin
auth, order/price integrity, review eligibility, coupon/deal validation,
API input validation, security headers, and Prisma indexing were all
already solid from prior phases. This phase added rate limiting on
sensitive endpoints, a real fix for a server-timezone bug affecting
reports/dashboard/"open now", `noindex` protection for private
per-order pages, and this documentation set. **A production build/lint/
typecheck run and full manual QA pass could not be executed in the
environment this phase was completed in (no package registry network
access) — run `npm run build`, `npm run lint`, and `npx tsc --noEmit`
yourself before deploying**, and see the Phase 7 delivery report for
the complete list of what still needs manual verification.

---

## Developer Credit

**Developed by ZAP Tech — Zohaib Ahmed**

(Preserved in the site footer on both the customer app and admin
panel — do not remove.)
