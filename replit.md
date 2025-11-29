# MnetiFi - Wi-Fi Billing SaaS Platform

## Overview
MnetiFi is a multi-tenant Wi-Fi hotspot billing system designed for ISPs with M-Pesa (Safaricom Daraja) integration. The platform features a premium "Vaultic" Glassmorphism design aesthetic with animated mesh gradient backgrounds.

## Project Status
- **Current Phase**: MVP Development
- **Last Updated**: November 29, 2025

## Architecture

### Tech Stack
- **Frontend**: React + TypeScript, Tailwind CSS, Framer Motion, Shadcn UI
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Glassmorphism design with animated mesh gradients

### Key Features
1. **Captive Portal** - Mobile-first glassmorphic login/payment interface
2. **Plan Management** - Create and manage Wi-Fi subscription plans
3. **Hotspot Management** - Configure NAS devices and locations
4. **Transaction Tracking** - Real-time payment status monitoring
5. **Walled Garden** - Configure pre-auth accessible domains
6. **M-Pesa Integration** - STK Push payment initiation (simulated)

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
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET/POST/PATCH/DELETE /api/plans` - Plan CRUD
- `GET/POST/PATCH/DELETE /api/hotspots` - Hotspot CRUD
- `GET/POST /api/transactions` - Transaction management
- `POST /api/transactions/initiate` - Start M-Pesa payment
- `GET/POST/DELETE /api/walled-gardens` - Walled garden config

## Design System
- **Primary Color**: Cyan (#06b6d4) to Blue (#3b82f6) gradient
- **Accent**: Purple (#7c3aed) to Magenta (#ec4899)
- **M-Pesa**: Green (#4BB617)
- **Background**: Deep Navy (#0f172a) with mesh gradients
- **Glass Surfaces**: rgba(255, 255, 255, 0.05) with 16px blur

## Default Demo Data
- Demo tenant with sample plans (30min, 1hr, Daily, Weekly)
- Pre-configured walled garden for M-Pesa domains
- Simulated payment flow (5 second delay)

## Routes
- `/` - Captive Portal (public)
- `/dashboard` - Admin Dashboard
- `/dashboard/plans` - Plan Management
- `/dashboard/hotspots` - Hotspot Management
- `/dashboard/transactions` - Transaction History
- `/dashboard/walled-garden` - Walled Garden Config
- `/dashboard/settings` - Tenant Settings
