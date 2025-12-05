# MnetiFi - Wi-Fi Billing SaaS Platform

## Overview
MnetiFi is a multi-tenant Wi-Fi hotspot billing system designed for ISPs with M-Pesa (Safaricom Daraja) integration. The platform features a premium "Vaultic" Glassmorphism design aesthetic with animated mesh gradient backgrounds.

## Project Status
- **Current Phase**: All Core Stages Complete (1-7) + Authentication System
- **Last Updated**: December 5, 2025

## Authentication
- **Password Security**: bcrypt hashing with automatic legacy password migration
- **Registration**: Multi-step wizard for new ISP accounts with 24-hour free trial
- **Password Reset**: Token-based password recovery system (1-hour expiry)
- **Default Admin**: admin/admin123 (password auto-migrates to bcrypt on first login)

## Architecture

### Tech Stack
- **Frontend**: React + TypeScript, Tailwind CSS, Framer Motion, Shadcn UI
- **Backend**: Express.js + TypeScript
- **Database**: Supabase PostgreSQL with Drizzle ORM
- **Styling**: Glassmorphism design with animated mesh gradients
- **Background Jobs**: Database-backed job queue with exponential backoff
- **Router Integration**: MikroTik RouterOS API service
- **AAA**: RADIUS service with CoA (Change of Authorization) support
- **Notifications**: SMS service (Africa's Talking ready)

### Key Features
1. **Captive Portal** - Mobile-first glassmorphic login/payment interface
2. **Plan Management** - Create and manage Wi-Fi subscription plans with bursting
3. **Hotspot Management** - Configure NAS devices and locations
4. **Transaction Tracking** - Real-time payment status monitoring
5. **Walled Garden** - Configure pre-auth accessible domains
6. **M-Pesa Integration** - STK Push with resilient polling fallback
7. **WiFi Users** - Manage Hotspot, PPPoE, and Static IP customer accounts
8. **Support Tickets** - Track customer support requests with priority levels
9. **Reconciliation Reports** - Match M-Pesa transactions with system records
10. **Expiring Users Widget** - Dashboard widget showing users expiring in 5 days
11. **MikroTik Router Management** - Direct API for user/session control
12. **RADIUS with CoA** - Session management and rate limit updates
13. **SaaS Billing Enforcement** - Block tenant traffic if unpaid
14. **Advanced Reporting** - Financial, reconciliation, user activity reports

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

### Core CRUD
- `GET/PATCH /api/tenant` - Tenant settings
- `GET /api/dashboard/stats` - Dashboard statistics (includes expiringUsers)
- `GET/POST/PATCH/DELETE /api/plans` - Plan CRUD
- `GET/POST/PATCH/DELETE /api/hotspots` - Hotspot CRUD
- `GET/POST /api/transactions` - Transaction management
- `POST /api/transactions/initiate` - Start M-Pesa payment
- `GET/POST/DELETE /api/walled-gardens` - Walled garden config
- `GET/POST/PATCH/DELETE /api/wifi-users` - WiFi user CRUD

### WiFi User Admin Actions
- `POST /api/wifi-users/:id/recharge` - Manual recharge user
- `POST /api/wifi-users/:id/suspend` - Suspend user
- `POST /api/wifi-users/:id/activate` - Activate user
- `POST /api/wifi-users/:id/change-hotspot` - Move user to different NAS

### Tickets
- `GET/POST/PATCH /api/tickets` - Support ticket management
- `POST /api/tickets/:id/close` - Close ticket with resolution

### Reports
- `GET /api/reports/reconciliation` - M-Pesa transaction reconciliation
- `GET /api/reports/financial` - Revenue reports with daily breakdown
- `GET /api/reports/user-activity` - User status and expiry forecasts
- `GET /api/reports/expiring-users` - Users expiring in next N days

### MikroTik Router Management
- `POST /api/hotspots/:id/test-connection` - Test router connectivity
- `GET /api/hotspots/:id/active-sessions` - List active sessions on router
- `POST /api/hotspots/:id/disconnect-user` - Disconnect user from router

### SaaS Admin (Billing Enforcement)
- `GET /api/admin/tenants` - List all tenants
- `POST /api/admin/tenants/:id/billing-status` - Update billing status
- `POST /api/admin/tenants/:id/block-traffic` - Block ISP traffic
- `POST /api/admin/tenants/:id/unblock-traffic` - Restore ISP traffic

### Job Queue
- `GET /api/jobs/pending` - View pending background jobs
- `GET /api/jobs/recent` - View recent job history

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
- `/login` - Admin Login
- `/register` - ISP Registration Wizard
- `/forgot-password` - Password Reset Request
- `/reset-password/:token` - Password Reset Form
- `/dashboard` - Admin Dashboard
- `/dashboard/wifi-users` - WiFi Users Management
- `/dashboard/plans` - Plan Management
- `/dashboard/hotspots` - Hotspot Management
- `/dashboard/transactions` - Transaction History
- `/dashboard/tickets` - Support Tickets
- `/dashboard/reconciliation` - Reconciliation Reports
- `/dashboard/walled-garden` - Walled Garden Config
- `/dashboard/settings` - Tenant Settings

## Backend Services (server/services/)
- **mikrotik.ts** - MikroTik RouterOS API integration for direct router management
- **radius.ts** - RADIUS service with CoA support for session management
- **sms.ts** - SMS notification service (Africa's Talking ready, mock mode available)
- **mpesa.ts** - M-Pesa Daraja API for STK Push payments
- **job-queue.ts** - Database-backed job queue with exponential backoff
- **payment-worker.ts** - Background worker for payment status polling

## Upcoming Features
- WhatsApp Business API integration for automated notifications
- VPN tunnel generation for NAS devices without public IPs
- Email invoice automation
- FreeRADIUS database sync for network access control
