# MnetiFi WiFi Billing - Deployment Guide

## Overview

MnetiFi is a **cloud-based SaaS platform** for ISP WiFi billing. ISPs don't install anything on their routers directly - they connect their MikroTik routers to your cloud platform via API.

---

## Deploying to Render.com

### Step 1: Push Code to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/mnetifi-wifi-billing.git
git push -u origin main
```

### Step 2: Deploy Using Blueprint (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** > **Blueprint**
3. Connect your GitHub repository
4. Render will detect `render.yaml` and create:
   - A PostgreSQL database (`mnetifi-db`)
   - A web service (`mnetifi-wifi-billing`)
5. Click **Apply**

### Step 3: Configure Environment Variables

After deployment, go to your web service > **Environment** tab.

**Note:** The following are automatically configured by Render's blueprint:
- `DATABASE_URL` - Auto-bound from your managed PostgreSQL database
- `SESSION_SECRET` - Auto-generated secure random value

#### Required Manual Configuration

Add the following secret via the Render dashboard **Environment** > **Secret Files** or as environment variables:

| Variable | Description | How to Get |
|----------|-------------|------------|
| `SUPERADMIN_SETUP_KEY` | Secret key for creating super admin | Generate locally (see below), then add via Render dashboard |

#### M-Pesa Integration (Required for Payments)

| Variable | Description |
|----------|-------------|
| `MPESA_CONSUMER_KEY` | Your Safaricom API consumer key |
| `MPESA_CONSUMER_SECRET` | Your Safaricom API consumer secret |
| `MPESA_PASSKEY` | Your Lipa na M-Pesa passkey |
| `MPESA_SHORTCODE` | Your M-Pesa paybill/till number |
| `MPESA_CALLBACK_URL` | `https://your-app.onrender.com/api/mpesa/callback` |

#### SMS Integration (Optional)

| Variable | Description |
|----------|-------------|
| `SMS_PROVIDER` | `africas_talking`, `twilio`, or `mock` |
| `SMS_API_KEY` | API key from your SMS provider |
| `SMS_USERNAME` | Username for Africa's Talking |

### Step 4: Initialize Database

The database schema needs to be pushed after first deployment. Choose one option:

**Option A: Local execution (Recommended)**
```bash
# Copy DATABASE_URL from Render dashboard > Database > Connection
export DATABASE_URL="your-render-database-url"
npm run db:push
```

**Option B: One-off job on Render**
1. Create a one-off job in Render with command: `npm run db:push`
2. Set the same environment variables as your web service
3. Run the job once

**Note:** Render Shell doesn't have dependencies installed by default, so running `npm run db:push` directly in the shell won't work.

### Step 5: Create Super Admin Account

1. Visit: `https://your-app.onrender.com/superadmin/register`
2. Enter username, email, password
3. Enter your `SUPERADMIN_SETUP_KEY`
4. Click Register

---

## Generating a Secure SUPERADMIN_SETUP_KEY

Run one of these commands on your computer:

**Linux/Mac:**
```bash
openssl rand -base64 32
```

**Windows PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Example output:** `xw2oWrOSb7ddCIuZ8hjOiLnSwCSiYwm5vfoOiKF1sik=`

**IMPORTANT:**
- Never share this key publicly
- Store it securely in a password manager
- This key is only used once during initial setup
- After creating super admin, you can remove it from environment variables

---

## How ISPs Access Your Service

### Architecture

```
[ISP's MikroTik Router] <---> [MnetiFi Cloud Platform] <---> [End Customer]
         |                              |
    REST API                       Web Dashboard
    Connection                     & Captive Portal
```

### ISP Onboarding Process

1. **ISP Registration:** ISP visits your platform and signs up for 24-hour free trial
2. **Router Configuration:** ISP configures their MikroTik router to connect to MnetiFi
3. **Dashboard Access:** ISP logs into their dashboard to manage plans, users, billing
4. **Customer Access:** End customers connect to WiFi and see captive portal for payment

### What ISPs Configure on Their Router

1. **Enable REST API** on MikroTik router
2. **Configure Hotspot Server** with external RADIUS
3. **Point RADIUS** to MnetiFi's RADIUS server
4. **Allow firewall rules** for MnetiFi communication

### Data Flow

1. Customer connects to ISP's WiFi hotspot
2. Router redirects to MnetiFi captive portal
3. Customer selects plan and pays via M-Pesa
4. MnetiFi sends RADIUS CoA to router
5. Router grants internet access to customer

---

## Alternative Deployment: Railway.app

1. Create Railway account at [railway.app](https://railway.app)
2. Create new project from GitHub
3. Add PostgreSQL database
4. Set environment variables (same as Render)
5. Deploy

---

## Alternative Deployment: Self-Hosted (VPS)

### Requirements
- Ubuntu 20.04+ or similar Linux
- Node.js 20+
- PostgreSQL 14+
- Nginx (reverse proxy)
- SSL certificate (Let's Encrypt)

### Setup Steps

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql

# Clone your repo
git clone https://github.com/YOUR_USERNAME/mnetifi-wifi-billing.git
cd mnetifi-wifi-billing

# Install dependencies
npm install

# Build for production
npm run build

# Set environment variables
export DATABASE_URL="postgresql://user:password@localhost:5432/mnetifi"
export NODE_ENV="production"
export SESSION_SECRET="your-random-secret"
export SUPERADMIN_SETUP_KEY="your-setup-key"

# Push database schema
npm run db:push

# Start the server
npm run start
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Process Manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start npm --name "mnetifi" -- run start

# Auto-start on reboot
pm2 startup
pm2 save
```

---

## Verification

After deployment, verify:

1. Visit `https://your-app.onrender.com` - should show landing page
2. Visit `https://your-app.onrender.com/api/health` - should return `{"status":"healthy"}`
3. Visit `https://your-app.onrender.com/login` - should show ISP login
4. Visit `https://your-app.onrender.com/superadmin/login` - should show super admin login

---

## Render Free Tier Notes

- Service spins down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds (cold start)
- For production, use **Starter plan** ($7/month) for always-on service
- Database free tier has 256MB limit

---

## Troubleshooting

### Build Fails
- Check Node version is `>=20.0.0`
- Ensure all dependencies are in `package.json`

### Database Connection Issues
- Verify `DATABASE_URL` includes `?sslmode=require` for external databases
- Check database is running and accessible

### 502 Errors
- Check Render logs for startup errors
- Verify environment variables are set correctly

### M-Pesa Not Working
- Verify callback URL is publicly accessible
- Check M-Pesa credentials are correct
- Ensure you're using production credentials for live environment

---

## Local Testing (Production Build)

```bash
# Build the app
npm run build

# Start production server
npm run start
```

App will be available at `http://localhost:5000`
