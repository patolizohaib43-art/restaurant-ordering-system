# Restaurant Ordering System — Hostinger KVM 1 VPS Deploy Guide (Beginner Friendly, Updated)

Ye guide GitHub se seedha Hostinger KVM 1 VPS pe deploy karne ke liye hai, saare naye features (image upload, push notifications, delivery areas) ke saath. Har step follow karo, koi skip mat karo.

**KVM 1 specs:** 1 vCPU, 4GB RAM, 50GB disk — is app ke liye kaafi hai.

---

## Cheezein jo pehle chahiye

1. Hostinger VPS purchase kiya hua (KVM 1) — hPanel mein dashboard
2. Ek domain name (HTTPS/push notifications ke liye **zaroori** hai — bina domain ke bhi kaam chalega par push notifications sirf HTTPS pe chalti hain)
3. SSH client: Windows → **PuTTY** (putty.org) ya Windows Terminal; Mac/Linux → built-in Terminal
4. Code GitHub par already hai — confirm kar lo

---

## Step 1: VPS par Ubuntu install karo aur connect karo

1. Hostinger hPanel → VPS → apna VPS select karo
2. OS: **Ubuntu 22.04** choose karo
3. Server IP aur root password copy kar lo
4. Terminal mein:
```bash
ssh root@TUMHARA_SERVER_IP
```
Pehli baar "yes" type karo, phir password paste karo.

---

## Step 2: Non-root user banao

```bash
adduser deploy
usermod -aG sudo deploy
```
Password set karo, baaki sawalon pe Enter dabate raho. Ab naye user se login karo:
```bash
su - deploy
```

---

## Step 3: Server ready karo

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential ufw
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```
"proceed with operation?" pooche toh `y` type karo.

---

## Step 4: Node.js install karo

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
```
Output mein `v20.x.x` dikhna chahiye.

---

## Step 5: PostgreSQL install karo

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

Database aur user banao:
```bash
sudo -u postgres psql
```
Andar ye likho (apna strong password rakho):
```sql
CREATE DATABASE restaurant_db;
CREATE USER restaurant_app WITH ENCRYPTED PASSWORD 'YAHAN_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE restaurant_db TO restaurant_app;
\q
```

**Yaad rakhna** — `DATABASE_URL` ye banega:
```
postgresql://restaurant_app:YAHAN_STRONG_PASSWORD@localhost:5432/restaurant_db?schema=public
```

---

## Step 6: Code server par lao (GitHub se)

```bash
sudo mkdir -p /var/www/restaurant-app
sudo chown deploy:deploy /var/www/restaurant-app
cd /var/www/restaurant-app
git clone https://github.com/patolizohaib43-art/restaurant-ordering-system.git .
```

---

## Step 7: Image uploads ke liye folder banao

```bash
sudo mkdir -p /var/www/zaika-e-sindh/uploads/{products,categories,deals,restaurant}
sudo chown -R deploy:deploy /var/www/zaika-e-sindh/uploads
```

---

## Step 8: VAPID keys generate karo (push notifications ke liye)

```bash
cd /var/www/restaurant-app
npx web-push generate-vapid-keys
```
Public Key aur Private Key dono copy kar lo — agle step mein chahiye.

---

## Step 9: Environment variables set karo

```bash
cp .env.example .env
nano .env
```

Ye sab values fill karo:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Step 5 wali connection string |
| `JWT_SECRET` | naya terminal tab kholke `openssl rand -base64 48` chalao |
| `NEXT_PUBLIC_APP_URL` | `https://tumhara-domain.com` |
| `RESTAURANT_TIMEZONE` | `Asia/Karachi` (ya jo relevant ho) |
| `NODE_ENV` | `production` |
| `UPLOAD_DIR` | `/var/www/zaika-e-sindh/uploads` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Step 8 wali Public Key |
| `VAPID_PRIVATE_KEY` | Step 8 wali Private Key |
| `VAPID_SUBJECT` | `mailto:tumhara-email@gmail.com` |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` | apne hisaab se |

Save: `Ctrl+O` → Enter → `Ctrl+X`

```bash
chmod 600 .env
```

---

## Step 10: App install aur build karo

```bash
npm ci
npx prisma generate
npx prisma db push
npm run build
```

**Note:** `npx prisma db push` use karo (`migrate deploy` nahi) — is project mein migration files nahi hain, schema seedha push hota hai.

Pehla admin account banao:
```bash
npm run prisma:seed
```
Terminal mein "Cleared X leftover Picsum..." wali line dikhni chahiye (agar dikhe toh images bhi clean ho gayi).

---

## Step 11: PM2 se app chalao

```bash
sudo npm install -g pm2
pm2 start npm --name "restaurant-app" -- start
pm2 save
pm2 startup
```
Jo `sudo env PATH=...` wali line print ho, usse copy karke chalao.

Check karo:
```bash
pm2 status
pm2 logs restaurant-app
```

---

## Step 12: Nginx laga ke public karo

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/restaurant-app
```

Ye paste karo (`DOMAIN` ki jagah apna domain daalo):
```nginx
server {
    listen 80;
    server_name DOMAIN;
    client_max_body_size 10M;

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
(`client_max_body_size 10M` add kiya hai taaki image uploads block na hon)

Save karo, phir:
```bash
sudo ln -s /etc/nginx/sites-available/restaurant-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 13: Domain connect karo

Domain ke DNS settings mein **A record** banao:
- Name: `@`
- Value: tumhara Server IP

10 min - 2 ghante wait karo (DNS propagate hone ke liye).

---

## Step 14: HTTPS lagao (push notifications ke liye zaroori)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tumhara-domain.com
```
Email do, terms accept karo.

Ab `.env` mein `NEXT_PUBLIC_APP_URL` ko `https://` wala kar do (agar pehle http tha), aur:
```bash
pm2 restart restaurant-app
```

---

## Step 15: Test karo

1. `https://tumhara-domain.com` kholo — menu dikhna chahiye, images clean honi chahiye
2. `/admin/login` se apne seed admin credentials se login karo
3. Settings → Notifications → Push Notifications → Enable karo
4. Ek test order place karo (kisi aur device/incognito se) — **order-confirmation page turant dikhna chahiye** (VPS pe Neon jaisi "cold start" wali dikkat nahi hogi)
5. Push notification phone pe check karo

---

## Future updates (jab GitHub pe naya code aaye)

```bash
cd /var/www/restaurant-app
git pull
npm ci
npx prisma generate
npx prisma db push
npm run build
pm2 restart restaurant-app
```

---

## Database backup (zaroori, regular karte raho)

```bash
pg_dump -U restaurant_app -h localhost restaurant_db | gzip > ~/backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

Images ka backup bhi alag se lena:
```bash
tar -czf ~/uploads_backup_$(date +%Y%m%d).tar.gz /var/www/zaika-e-sindh/uploads
```

---

## Common Problems

**Build fail ho gaya**
→ `.env` mein `DATABASE_URL` check karo, `npx prisma generate` pehle chalaya tha ya nahi

**Site khulti nahi**
→ `pm2 status` — app "online" honi chahiye. Nahi hai toh `pm2 logs restaurant-app` se error dekho
→ `sudo systemctl status nginx` bhi check karo

**Images upload nahi ho rahi**
→ `ls -la /var/www/zaika-e-sindh/uploads` chalao, permissions check karo (deploy user ka owned hona chahiye)

**Push notifications kaam nahi kar rahi**
→ HTTPS lagi hai confirm karo (address bar mein padlock icon)
→ `.env` mein teeno VAPID variables sahi se set hain confirm karo
→ Settings mein "Enable" dobara try karo (phone browser cache clear karke)

**"Permission denied" errors**
→ `deploy` user se logged in ho, root se nahi

---

Kisi bhi step par error aaye, exact error message copy karke bata dena.
