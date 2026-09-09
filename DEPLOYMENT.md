# Deployment Guide — Vercel (Demo / Production)

This guide deploys the app to Vercel with a standard managed
PostgreSQL provider. It doesn't assume a specific provider — any
managed Postgres that gives you a `postgresql://` connection string
works (Neon, Supabase, Railway, Vercel Postgres, RDS, etc.).

---

## 1. Push the project to GitHub

```bash
git init                     # if not already a git repo
git add .
git commit -m "Phase 7: production readiness"
git branch -M main
git remote add origin https://github.com/<your-org>/<your-repo>.git
git push -u origin main
```

Confirm `.env` is **not** committed — it's already listed in
`.gitignore`. Only `.env.example` (names only, no secrets) should be
in the repo.

---

## 2. Import the repository into Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the GitHub
   repository.
2. Framework preset: Vercel will auto-detect **Next.js** — leave it.
3. Root directory: the repo root (where `package.json` is).
4. Don't deploy yet — set environment variables first (next step).

---

## 3. Configure production environment variables

In the Vercel project → **Settings → Environment Variables**, add
every variable from `.env.example` with real production values. At
minimum:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Your managed Postgres connection string. Include `?sslmode=require` if your provider needs it. |
| `JWT_SECRET` | Generate a unique value: `openssl rand -base64 48`. Never reuse a dev/staging secret in production. |
| `JWT_EXPIRES_IN` | e.g. `7d` |
| `ADMIN_SESSION_COOKIE_NAME` | e.g. `restaurant_admin_session` |
| `NEXT_PUBLIC_APP_URL` | Your production URL, e.g. `https://your-restaurant.vercel.app` |
| `NEXT_PUBLIC_APP_NAME` | Public-facing app/restaurant name |
| `RESTAURANT_TIMEZONE` | The restaurant's IANA timezone, e.g. `Asia/Karachi` — **do not leave this unset in production**, see README "Timezone Strategy" |
| `ORDER_TRACKING_TOKEN_BYTES` | `24` (default; increasing is fine, decreasing is not recommended) |
| `NODE_ENV` | Vercel sets this automatically — no action needed |

Set these for the **Production** environment (and Preview/Development
too if you use those Vercel environments, with their own values —
never share a `JWT_SECRET` or database between environments).

**Never** put real secrets in `.env.example` or in the repository.

---

## 4. Configure the PostgreSQL database

Provision a Postgres database with your chosen provider and copy its
connection string into `DATABASE_URL` above. Make sure:

- The database accepts connections from Vercel's IP ranges (most
  managed providers are open by default or offer a "allow from
  anywhere" toggle suitable for serverless — check your provider's
  docs for the recommended setting with Vercel specifically).
- Connection pooling is configured if your provider recommends it for
  serverless (e.g. a pooled connection string) — Prisma + serverless
  functions can otherwise exhaust connection limits under load.

---

## 5. Run the production Prisma migration

From your local machine (with `DATABASE_URL` pointed at the
**production** database), or via Vercel's deployment build step:

```bash
npx prisma migrate deploy
```

This applies committed migrations without prompting and without the
dev-only reset behavior of `prisma migrate dev` — it's the correct
command for production. If this is the very first deployment and you
have no migrations directory yet, run `npx prisma migrate dev --name init`
locally first (against a dev database) to generate one, commit it, then
use `migrate deploy` against production from then on.

---

## 6. Create/seed the initial admin securely

Set `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, and `SEED_ADMIN_NAME` as
temporary environment variables (locally, pointed at the production
`DATABASE_URL`, or via Vercel env vars temporarily) and run:

```bash
npm run prisma:seed
```

This is safe to re-run (it upserts). **Immediately log in and change
the admin password** if you used a placeholder value, then remove the
`SEED_ADMIN_*` variables if you don't want them persisted anywhere
long-term — the seed script only needs them once.

---

## 7. Build the project

Vercel runs `npm install` then `npm run build` automatically on
deploy — `postinstall` already runs `prisma generate`. No manual step
needed here beyond confirming the build succeeds (see the Vercel
deployment logs).

---

## 8. Deploy

Click **Deploy** in the Vercel dashboard (or push to `main` if you've
already connected the repo — Vercel deploys on push by default).

---

## 9. Test the production URL

At minimum, manually verify on the live URL:

- Home page and menu load
- Add a product to cart, apply the coupon `WELCOME10` (from the seed
  data) if seeded, place a test order
- Open the returned tracking link and confirm it shows the order
- Log into `/admin/login` with your real admin credentials
- Confirm the new order appears with a notification in the admin panel
- Change the order status through to Delivered, then submit a review
  from the tracking page and confirm duplicate submission is blocked
- Check `GET /api/health` returns `{ "success": true, "status": "ok" }`

---

## 10. Configure a custom domain (if required)

In Vercel → **Settings → Domains**, add your domain and follow the DNS
instructions Vercel provides (typically a CNAME or A record). Vercel
provisions HTTPS automatically once DNS propagates. After adding a
custom domain, update `NEXT_PUBLIC_APP_URL` to match it and redeploy
(this affects the sitemap and Open Graph metadata).

---

## Known Vercel-specific limitations

These are platform limitations, not bugs in the app — see
`README.md` for more detail on each:

- **Local image uploads** (`/api/admin/upload`) write to local disk,
  which is not persistent on Vercel. Use the Image URL field, or wire
  up an external object store, when running on Vercel.
- **Thermal printing** still depends on the OS/printer driver setup of
  the device doing the printing — the browser print dialog is the same
  either way, see README for detail.
- **No long-running background jobs / WebSockets** — the app doesn't
  need them (notifications use polling), so this is a non-issue as
  built, but keep it in mind if you extend the app later.
- **Rate limiting** is single-instance in-memory (see README) — fine
  for a demo/small deployment, consider a shared store for
  high-traffic production use.

If you later need to move off Vercel, see **[VPS_DEPLOYMENT.md](./VPS_DEPLOYMENT.md)**
— the app was built to make that move straightforward.
