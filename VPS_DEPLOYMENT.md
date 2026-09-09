# VPS Deployment Guide — Linux VPS (Nginx + Node/PM2 or Docker + PostgreSQL)

This is a generic production deployment guide for moving the app from
Vercel (or straight to production) on a plain Ubuntu/Debian Linux VPS.
It doesn't assume a specific VPS provider.

Architecture:

```
Browser → Nginx (TLS/reverse proxy) → Next.js app (Node, via PM2 or Docker) → PostgreSQL
```

Replace the placeholders below (`DOMAIN`, `SERVER_IP`, `APP_USER`,
`PROJECT_PATH`, `DATABASE_URL`) with your real values. No example
below contains a real password or secret — generate your own.

---

## 1. Server prep

SSH into the server as a non-root sudo user (`APP_USER`):

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential ufw
```

### Firewall basics

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Only SSH, HTTP, and HTTPS need to be open. The app and database ports
(3000, 5432) should **not** be exposed publicly — Nginx proxies to the
app locally, and Postgres should only accept local/internal
connections unless you have a specific reason otherwise.

---

## 2. Install Node.js

Use a current Node 20 LTS via NodeSource (adjust the major version if
the project's `package.json`/`engines` field specifies otherwise):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

---

## 3. Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

Create the database and a dedicated app user:

```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE restaurant_db;
CREATE USER restaurant_app WITH ENCRYPTED PASSWORD 'REPLACE_WITH_A_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE restaurant_db TO restaurant_app;
\q
```

Your `DATABASE_URL` will look like:

```
postgresql://restaurant_app:REPLACE_WITH_A_STRONG_PASSWORD@localhost:5432/restaurant_db?schema=public
```

By default PostgreSQL only listens on localhost, which is what you
want here — the app connects to it locally, not over the public
internet.

---

## 4. Get the project onto the server

```bash
sudo mkdir -p PROJECT_PATH
sudo chown APP_USER:APP_USER PROJECT_PATH
cd PROJECT_PATH
git clone https://github.com/<your-org>/<your-repo>.git .
```

---

## 5. Environment variables

```bash
cp .env.example .env
nano .env   # fill in real production values
```

At minimum set `DATABASE_URL` (from step 3), a unique `JWT_SECRET`
(`openssl rand -base64 48`), `NEXT_PUBLIC_APP_URL` (your real domain,
`https://DOMAIN`), and `RESTAURANT_TIMEZONE` (e.g. `Asia/Karachi`) —
see `README.md` for why the timezone variable matters. Set
`NODE_ENV=production`.

Keep `.env` readable only by `APP_USER`:

```bash
chmod 600 .env
```

---

## 6. Install dependencies and build

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
```

`prisma migrate deploy` applies committed migrations without any
interactive prompts — the correct command for production (never
`prisma migrate dev` here).

Optionally seed the first admin (see README's "Admin Authentication"
section on changing the password immediately afterward):

```bash
npm run prisma:seed
```

---

## 7. Run the app — Option A: PM2 (simplest)

```bash
sudo npm install -g pm2
pm2 start npm --name "restaurant-app" -- start
pm2 save
pm2 startup    # follow the printed instructions to enable on-boot start
```

Useful PM2 commands:

```bash
pm2 status                    # check it's running
pm2 logs restaurant-app       # tail logs
pm2 restart restaurant-app    # restart after a deploy/update
```

---

## 7. Run the app — Option B: Docker

If you prefer Docker instead of PM2, a minimal `Dockerfile` (add this
to the repo if you go this route):

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t restaurant-app .
docker run -d --name restaurant-app \
  --env-file .env \
  -p 127.0.0.1:3000:3000 \
  --restart unless-stopped \
  restaurant-app
```

Bind to `127.0.0.1:3000` (not `0.0.0.0`) so only Nginx on the same
machine can reach it directly — the public internet only ever talks to
Nginx.

---

## 8. Configure Nginx as a reverse proxy

```bash
sudo apt install -y nginx
```

`/etc/nginx/sites-available/restaurant-app`:

```nginx
server {
    listen 80;
    server_name DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/restaurant-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

The `X-Forwarded-For` header set here is what
`src/lib/rate-limit.ts`'s `getClientIp()` reads to identify callers per
IP — without it, all requests would appear to come from `127.0.0.1`
and rate limiting would be ineffective. Confirm it's present in the
config above.

---

## 9. Enable HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d DOMAIN
```

Certbot edits the Nginx config to redirect HTTP→HTTPS and sets up
auto-renewal (`certbot renew` runs via a systemd timer/cron installed
automatically — verify with `sudo systemctl list-timers | grep certbot`).

---

## 10. Domain configuration

Point your domain's DNS **A record** at `SERVER_IP` (and an `AAAA`
record if you have IPv6). Propagation can take a few minutes to a few
hours depending on your registrar/TTL. Re-run `certbot --nginx -d DOMAIN`
if you add the domain after the first certbot run.

---

## Updating the application

```bash
cd PROJECT_PATH
git pull
npm ci
npx prisma generate
npx prisma migrate deploy     # only if new migrations were added
npm run build
pm2 restart restaurant-app    # or: docker restart restaurant-app
```

**Always back up the database before running a migration in
production** — see the backup section below.

---

## Logs

- **PM2:** `pm2 logs restaurant-app` (or `pm2 logs restaurant-app --lines 200`)
- **Docker:** `docker logs -f restaurant-app`
- **Nginx:** `/var/log/nginx/access.log` and `/var/log/nginx/error.log`
- **PostgreSQL:** `/var/log/postgresql/postgresql-<version>-main.log` (path varies by distro/version)

---

## Database Backup & Restore

### Backups

```bash
pg_dump -U restaurant_app -h localhost restaurant_db | gzip > restaurant_db_$(date +%Y%m%d_%H%M%S).sql.gz
```

Automate this with a daily cron job, and store copies off-server
(e.g. synced to object storage) — a backup that lives only on the same
disk as the database doesn't protect against disk failure.

**Retention recommendation:** keep daily backups for at least 14 days
and weekly backups for at least 3 months, adjusted to your risk
tolerance — this is a recommendation, not something this repo
configures automatically. Set up the actual cron job / retention
policy on your server; it is not preconfigured out of the box.

### Restore

```bash
gunzip -c restaurant_db_YYYYMMDD_HHMMSS.sql.gz | psql -U restaurant_app -h localhost restaurant_db
```

### Before every migration

Always take a fresh backup immediately before running
`prisma migrate deploy` against production:

```bash
pg_dump -U restaurant_app -h localhost restaurant_db | gzip > pre_migration_$(date +%Y%m%d_%H%M%S).sql.gz
```

---

## Health check

`GET /api/health` (already implemented in the app) confirms the app is
running and the database is reachable, without exposing credentials or
internal details:

```bash
curl https://DOMAIN/api/health
```

Point any external uptime monitor (UptimeRobot, etc.) or your process
supervisor's health check at this endpoint.
