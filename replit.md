# MnetiFi - Wi-Fi Billing SaaS Platform

## Overview
MnetiFi is a multi-tenant Wi-Fi hotspot billing system designed for ISPs with M-Pesa (Safaricom Daraja) integration. The platform features a premium "Vaultic" Glassmorphism design aesthetic with animated mesh gradient backgrounds.

## Project Status
- **Current Phase**: Phase 1 Complete - Payment Resilience
- **Last Updated**: December 1, 2025

## Architecture

### Tech Stack
- **Frontend**: React + TypeScript, Tailwind CSS, Framer Motion, Shadcn UI
- **Backend**: Express.js + TypeScript
- **Database**: Supabase PostgreSQL with Drizzle ORM
- **Styling**: Glassmorphism design with animated mesh gradients
- **Background Jobs**: Database-backed job queue (Replit-compatible alternative to Redis/BullMQ)

### Key Features
1. **Captive Portal** - Mobile-first glassmorphic login/payment interface
2. **Plan Management** - Create and manage Wi-Fi subscription plans
3. **Hotspot Management** - Configure NAS devices and locations
4. **Transaction Tracking** - Real-time payment status monitoring
5. **Walled Garden** - Configure pre-auth accessible domains
6. **M-Pesa Integration** - STK Push payment initiation (simulated)
7. **WiFi Users** - Manage Hotspot, PPPoE, and Static IP customer accounts
8. **Support Tickets** - Track customer support requests with priority levels
9. **Reconciliation Reports** - Match M-Pesa transactions with system records
10. **Expiring Users Widget** - Dashboard widget showing users expiring in 5 days

## Project Structure
```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── layouts/        # Layout components
│   │   └── hooks/          # Custom hooks
├── server/                 # Express backend
│   ├── db.ts              # Database connection
│   ├── storage.ts         # Data access layer
│   └── routes.ts          # API endpoints
├── shared/                 # Shared code
│   └── schema.ts          # Drizzle schemas & types
```

## API Endpoints
- `GET/PATCH /api/tenant` - Tenant settings
- `GET /api/dashboard/stats` - Dashboard statistics (includes expiringUsers)
- `GET/POST/PATCH/DELETE /api/plans` - Plan CRUD
- `GET/POST/PATCH/DELETE /api/hotspots` - Hotspot CRUD
- `GET/POST /api/transactions` - Transaction management
- `POST /api/transactions/initiate` - Start M-Pesa payment
- `GET/POST/DELETE /api/walled-gardens` - Walled garden config
- `GET/POST/PATCH/DELETE /api/wifi-users` - WiFi user CRUD with admin actions
- `POST /api/wifi-users/:id/recharge` - Manual recharge user
- `POST /api/wifi-users/:id/suspend` - Suspend user
- `POST /api/wifi-users/:id/activate` - Activate user
- `GET/POST/PATCH /api/tickets` - Support ticket management
- `POST /api/tickets/:id/close` - Close ticket with resolution

## Design System
- **Primary Color**: Cyan (#06b6d4) to Blue (#3b82f6) gradient
- **Accent**: Purple (#7c3aed) to Magenta (#ec4899)
- **M-Pesa**: Green (#4BB617)
- **Background**: Deep Navy (#0f172a) with mesh gradients
- **Glass Surfaces**: rgba(255, 255, 255, 0.05) with 16px blur

## Default Demo Data
- Demo tenant with sample plans (30min, 1hr, Daily, Weekly)
- Pre-configured walled garden for M-Pesa domains
- Resilient payment flow with job queue and retry logic

## Payment Resilience Architecture (Phase 1)
- **Job Queue**: Database-backed queue with atomic job claiming (FOR UPDATE SKIP LOCKED)
- **Payment Worker**: Polls every 5 seconds, processes jobs sequentially
- **Retry Logic**: Exponential backoff (2^attempts * 10 seconds), max 5 attempts
- **Stuck Job Detection**: Automatic reset of jobs stuck in PROCESSING > 15 minutes
- **Automatic User Activation**: Creates/updates WiFi user after successful payment
- **Reconciliation Status**: Tracks PENDING/MATCHED/UNMATCHED for each transaction

## Routes
- `/` - Captive Portal (public)
- `/dashboard` - Admin Dashboard
- `/dashboard/wifi-users` - WiFi Users Management
- `/dashboard/plans` - Plan Management
- `/dashboard/hotspots` - Hotspot Management
- `/dashboard/transactions` - Transaction History
- `/dashboard/tickets` - Support Tickets
- `/dashboard/reconciliation` - Reconciliation Reports
- `/dashboard/walled-garden` - Walled Garden Config
- `/dashboard/settings` - Tenant Settings

## Upcoming Features
- MikroTik RouterOS API integration
- FreeRADIUS integration for network access control
- BullMQ for payment polling and background jobs
- Customer SMS/Email notifications
