# MnetiFi WiFi Billing - Render.com Deployment Guide

## Quick Deploy

### Option 1: Blueprint Deploy (Recommended)
1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **New** > **Blueprint**
4. Connect your GitHub repository
5. Render will automatically detect `render.yaml` and configure the service

### Option 2: Manual Deploy
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** > **Web Service**
3. Connect your GitHub repository
4. Configure with these settings:

| Setting | Value |
|---------|-------|
| **Name** | mnetifi-wifi-billing |
| **Environment** | Node |
| **Region** | Oregon (or closest to your users) |
| **Branch** | main |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm run start` |
| **Plan** | Free (or Starter for production) |

## Environment Variables

Add these in Render Dashboard under **Environment** tab:

### Required
| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Supabase PostgreSQL connection string | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `NODE_ENV` | Environment mode | `production` |
| `SESSION_SECRET` | Session encryption key (auto-generated if using Blueprint) | Random string |

### Optional (for full functionality)
| Variable | Description |
|----------|-------------|
| `MPESA_CONSUMER_KEY` | M-Pesa API consumer key |
| `MPESA_CONSUMER_SECRET` | M-Pesa API consumer secret |
| `MPESA_PASSKEY` | M-Pesa passkey |
| `MPESA_SHORTCODE` | M-Pesa business shortcode |
| `AFRICASTALKING_API_KEY` | Africa's Talking SMS API key |
| `AFRICASTALKING_USERNAME` | Africa's Talking username |

## Database Setup

Your Supabase database should already have the schema. If deploying fresh:

1. Get your Supabase connection string from Supabase Dashboard > Settings > Database
2. Add it as `DATABASE_URL` in Render environment variables
3. The app will auto-create tables on first run

## Health Check

Render uses `/api/health` endpoint to monitor your application.
The endpoint returns: `{ "status": "healthy", "timestamp": "ISO date" }`

## Deployment Verification

After deployment:
1. Visit `https://your-app-name.onrender.com` - should show WiFi plan selection
2. Visit `https://your-app-name.onrender.com/dashboard` - should show admin dashboard
3. Check `/api/health` - should return healthy status

## Free Tier Notes

- Service spins down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds (cold start)
- For production, use Starter plan ($7/month) for always-on service

## Troubleshooting

### Build Fails
- Check Node version matches `>=20.0.0`
- Ensure all dependencies are in `package.json`

### Database Connection Issues
- Verify `DATABASE_URL` includes `?sslmode=require`
- Check Supabase allows connections from Render IPs

### 502 Errors
- Check Render logs for startup errors
- Verify `npm run start` command works locally

## Local Testing (Production Build)

```bash
# Build the app
npm run build

# Start production server
npm run start
```

App will be available at `http://localhost:5000`
