# 🚀 Zaiqa-e-Sindh — Deploy Karne Ka Step-by-Step Guide

Ye guide **beginner-friendly** hai — line by line follow karein, app live ho jayegi.
Do options hain:

- **Option A — Vercel** (sabse aasan, free tier available, 15-20 minute) ✅ Recommended
- **Option B — VPS** (apna server, zyada control, thora technical) — detail `VPS_DEPLOYMENT.md` mein hai

Agar aap pehli dafa deploy kar rahe hain, **Option A** se start karein.

---

## ✅ Pehle ye cheezein tayyar rakhein (Prerequisites)

1. **GitHub account** — code push karne ke liye
2. **Vercel account** — [vercel.com](https://vercel.com) pe free sign up (GitHub se sign up karein, aasan hoga)
3. **Postgres Database** (free) — inme se koi ek le lein:
   - [neon.tech](https://neon.tech) (recommended, free tier accha hai)
   - [supabase.com](https://supabase.com)
   - [railway.app](https://railway.app)
4. Computer pe **Node.js** installed ho (version 18+) — [nodejs.org](https://nodejs.org) se download karein
5. Computer pe **Git** installed ho — [git-scm.com](https://git-scm.com)

---

## Step 1 — Project ko GitHub pe push karein

Zip file ko extract karein, phir uske andar terminal khol kar:

```bash
git init
git add .
git commit -m "Zaiqa-e-Sindh - Phase 8 branding"
git branch -M main
```

Ab GitHub pe jaa kar ek **naya empty repository** banayein (README add na karein), phir:

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

⚠️ **Zaroori:** `.env` file kabhi commit na karein (ye already `.gitignore` mein hai, safe hai). Sirf `.env.example` GitHub pe jaani chahiye.

---

## Step 2 — Database banayein (Neon example)

1. [neon.tech](https://neon.tech) pe account banayein
2. **New Project** → koi bhi naam dein (e.g. `zaiqa-e-sindh-db`)
3. Project banne ke baad **Connection String** copy karein — kuch aisi dikhegi:
   ```
   postgresql://user:password@ep-xxxx.neon.tech/neondb?sslmode=require
   ```
4. Ise safe jagah save kar lein — agle step mein use hogi

---

## Step 3 — Vercel pe project import karein

1. [vercel.com/new](https://vercel.com/new) pe jayein
2. Apni GitHub repository select karein → **Import**
3. Framework Preset: **Next.js** (khud detect ho jayega, kuch change na karein)
4. **"Deploy" button abhi mat dabayein** — pehle environment variables set karni hain (Step 4)

---

## Step 4 — Environment Variables set karein

Vercel project ke **Settings → Environment Variables** mein ye sab add karein:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Step 2 wali Neon connection string |
| `JWT_SECRET` | Terminal mein `openssl rand -base64 48` chala kar jo mile wo paste karein |
| `JWT_EXPIRES_IN` | `7d` |
| `ADMIN_SESSION_COOKIE_NAME` | `restaurant_admin_session` |
| `NEXT_PUBLIC_APP_URL` | `https://your-project-name.vercel.app` (Vercel deploy ke baad exact URL milega — abhi guess kar ke daal dein, baad mein update kar lein) |
| `NEXT_PUBLIC_APP_NAME` | `Zaiqa-e-Sindh` |
| `RESTAURANT_TIMEZONE` | `Asia/Karachi` |
| `ORDER_TRACKING_TOKEN_BYTES` | `24` |
| `SEED_ADMIN_EMAIL` | Apna admin email (e.g. `admin@zaiqaesindh.com`) |
| `SEED_ADMIN_PASSWORD` | Ek strong password (baad mein change kar lenge) |
| `SEED_ADMIN_NAME` | `Super Admin` |

Har variable ko **Production** environment ke liye set karein.

---

## Step 5 — Database Tables banayein (Migration)

Apne computer (local) pe, project folder mein `.env` file banayein aur usmein production wala `DATABASE_URL` daal dein, phir:

```bash
npm install
npx prisma migrate dev --name init
```

> **Note (Phase 8 update):** Is phase mein `tagline` naam ka ek naya field database mein add hua hai (restaurant ka tagline "Fast Food BBQ & Pizza" store karne ke liye). Agar aap ne pehle kabhi migration run ki thi, to ye command us change ko bhi automatically apply kar degi.

Agar sab theek raha to terminal mein "Your database is now in sync" jaisa message aayega.

---

## Step 6 — Admin account aur Branding data seed karein

Same terminal mein (abhi bhi production `DATABASE_URL` wali `.env` active honi chahiye):

```bash
npm run prisma:seed
```

Ye automatically:
- Aapka admin login account bana dega (Step 4 wale email/password se)
- Restaurant ka naam **"Zaiqa-e-Sindh"**, tagline **"Fast Food BBQ & Pizza"**, logo, currency (PKR), delivery fee, sample categories/products/deals set kar dega

✅ Ye command dobara bhi chala sakte hain, koi masla nahi hoga (safe hai, duplicate nahi banata).

---

## Step 7 — Deploy karein

Vercel dashboard mein wapis jayein aur **Deploy** button dabayein.

2-3 minute mein build complete ho jayega. Vercel aapko live URL de dega, e.g.:
```
https://zaiqa-e-sindh.vercel.app
```

Is URL ko wapis Step 4 ke `NEXT_PUBLIC_APP_URL` mein daal kar **redeploy** kar dein (Settings → Environment Variables → update → Deployments tab → Redeploy).

---

## Step 8 — Test karein ✅

Live site khol kar ye check karein:

- [ ] Home page pe logo, "Zaiqa-e-Sindh" naam, aur "Fast Food BBQ & Pizza" tagline dikh raha ho
- [ ] Menu open ho, product add to cart ho
- [ ] Checkout complete ho, order place ho jaye
- [ ] Order tracking link kaam kare
- [ ] `/admin/login` pe apne admin email/password se login ho
- [ ] Admin panel mein naya order dikhe, notification aaye
- [ ] Admin → Settings mein restaurant name/tagline/logo edit karke dekhein — turant save ho

---

## 🔒 Step 9 — Zaroori Security Step (mat bhoolein!)

1. Admin panel mein login karke agar `SEED_ADMIN_PASSWORD` temporary tha to **turant password change** kar lein
2. Vercel Environment Variables se `SEED_ADMIN_PASSWORD` hata dein (ab zaroorat nahi)
3. `JWT_SECRET` kabhi kisi ke sath share na karein

---

## Option B — Apne VPS (Own Server) pe Deploy

Agar Vercel ki jagah apna Linux server (DigitalOcean, Hostinger VPS, AWS, etc.) use karna hai, to iski poori detailed guide already project mein maujood hai:

📄 **`VPS_DEPLOYMENT.md`** — Nginx, PM2/Docker, SSL, domain setup, backups — sab kuch step-by-step.

---

## Kuch Common Problems

| Masla | Hal |
|---|---|
| Build fail ho raha hai | Vercel ke "Deployment Logs" check karein — usually ek missing environment variable hoti hai |
| Logo nahi dikh raha | `public/brand/logo-icon.png` file repo mein commit hui honi chahiye — `git status` check karein |
| Database connection error | `DATABASE_URL` mein `?sslmode=require` add karein (Neon/Supabase ke liye zaroori hota hai) |
| Admin login nahi ho raha | Seed dobara chalayein: `npm run prisma:seed` |

---

**Developed by ZAP Tech — Zohaib Ahmed Patoli**
