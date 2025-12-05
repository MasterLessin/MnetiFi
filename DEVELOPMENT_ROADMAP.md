# MnetiFi WiFi Billing Platform - Development Roadmap

**Last Updated:** December 5, 2025  
**Status:** Feature Analysis & Prioritization Complete

---

## EXECUTIVE SUMMARY

This document analyzes the proposed features from competitor platforms (Netpap, Kivipay, Cute Profit, Hotspot Kenya) and maps them against MnetiFi's current implementation. Features are prioritized based on business impact, technical complexity, and market competitiveness.

---

## FEATURE ANALYSIS: IMPLEMENTED vs. PROPOSED

### Legend
- ✅ **Fully Implemented** - Ready for production
- ⚠️ **Partially Implemented** - Backend exists, needs UI or enhancement
- ❌ **Not Implemented** - Needs full development

---

### 1. BILLING & INVOICING

| Feature | Status | Notes |
|---------|--------|-------|
| M-Pesa STK Push | ✅ | Full integration with Daraja API |
| Prepaid billing (Hotspot) | ✅ | Working with automatic expiry |
| Postpaid billing (PPPoE/Static) | ⚠️ | Schema ready, needs monthly cycle |
| Automated payment reminders | ⚠️ | SMS service ready, scheduler needed |
| Service suspension/reconnection | ✅ | Auto-suspend on expiry |
| Burst rates/QoS | ✅ | Full burst support in plans |
| Data caps/FUP | ❌ | Not implemented |
| Discount/coupon codes | ❌ | Not implemented |
| Wallet system | ❌ | Not implemented |
| Invoice generation | ❌ | Not implemented |
| Export to Excel | ❌ | Not implemented |

### 2. CUSTOMER MANAGEMENT

| Feature | Status | Notes |
|---------|--------|-------|
| WiFi user CRUD | ✅ | Full management UI |
| Customer self-service portal | ⚠️ | Captive portal only, no account view |
| Support ticketing | ✅ | Full ticket management |
| Customer grouping/segmentation | ❌ | Not implemented |
| Lead tracking | ❌ | Not implemented |

### 3. NETWORK MANAGEMENT

| Feature | Status | Notes |
|---------|--------|-------|
| Hotspot management | ✅ | Full NAS device management |
| PPPoE user management | ✅ | Supported via account type |
| Static IP management | ✅ | Supported via account type |
| MikroTik API integration | ✅ | Full RouterOS API service |
| RADIUS CoA support | ✅ | Disconnect/rate-limit updates |
| Remote router monitoring | ⚠️ | API exists, no UI dashboard |
| Router config backup | ❌ | Not implemented |
| Remote router reboot | ⚠️ | API ready, no UI |
| TR-069 device management | ❌ | Not implemented |
| Network topology mapping | ❌ | Not implemented |

### 4. HOTSPOT-SPECIFIC FEATURES

| Feature | Status | Notes |
|---------|--------|-------|
| Captive portal | ✅ | Glassmorphic mobile-first design |
| Walled garden domains | ✅ | Configurable pre-auth domains |
| Session inactivity logout | ❌ | 15-min timeout not implemented |
| Device limit per voucher | ⚠️ | `simultaneousUse` in schema, not enforced |
| Voucher system | ❌ | Not implemented |

### 5. NOTIFICATIONS & COMMUNICATION

| Feature | Status | Notes |
|---------|--------|-------|
| SMS notifications | ⚠️ | Service ready, not fully integrated |
| Bulk SMS campaigns | ❌ | Not implemented |
| Email notifications | ⚠️ | Job type exists, no service |
| WhatsApp integration | ❌ | Not implemented |
| In-app support chat | ❌ | Not implemented |

### 6. REPORTING & ANALYTICS

| Feature | Status | Notes |
|---------|--------|-------|
| Revenue reports | ✅ | Financial endpoint exists |
| Reconciliation reports | ✅ | Full M-Pesa matching |
| Expiring users alerts | ✅ | Dashboard widget |
| User activity reports | ✅ | Endpoint exists |
| Unit economics (Churn/LTV) | ❌ | Not implemented |
| Hotspot analytics | ⚠️ | Basic data, no graphs |
| Real-time bandwidth graphs | ❌ | Not implemented |

### 7. MULTI-TENANT & ACCESS CONTROL

| Feature | Status | Notes |
|---------|--------|-------|
| Multi-tenant isolation | ✅ | Full tenant separation |
| ISP admin login | ✅ | Working authentication |
| Super admin console | ❌ | Not implemented |
| Tech accounts (limited role) | ⚠️ | Role field exists, no enforcement |
| ISP tiered pricing | ⚠️ | Schema ready, no billing UI |
| RBAC (Role-Based Access) | ⚠️ | Basic role field, no permissions |

### 8. WHITE LABELING & CUSTOMIZATION

| Feature | Status | Notes |
|---------|--------|-------|
| ISP branding (logo/colors) | ⚠️ | Schema ready, no UI |
| Custom subdomains | ⚠️ | Field exists, not functional |
| Captive portal theming | ❌ | Fixed design only |

### 9. VALUE-ADDED FEATURES

| Feature | Status | Notes |
|---------|--------|-------|
| Referral program | ❌ | Not implemented |
| Guest passes/trials | ⚠️ | Can create short plans, no trial mode |
| Compensation module | ❌ | Not implemented |
| Reseller management | ❌ | Not implemented |
| Stock/inventory | ❌ | Not implemented |

---

## PRIORITIZED DEVELOPMENT PHASES

Based on business impact, market competitiveness, and technical dependencies:

---

### PHASE 1: CORE BUSINESS FEATURES (High Priority)
**Timeline:** 2-3 weeks  
**Impact:** Critical for SaaS monetization and competitive parity

#### 1.1 Super Admin Console
**Priority:** CRITICAL  
**Effort:** Medium  
**Dependencies:** None

**Tasks:**
- [ ] Create super admin authentication (separate from ISP login)
- [ ] Build tenant listing page with status, revenue metrics
- [ ] Implement tenant suspend/activate functionality
- [ ] Platform-wide analytics dashboard (total revenue, active ISPs, MRR)
- [ ] ISP account search and filtering

**API Endpoints Needed:**
```
GET    /api/superadmin/tenants
GET    /api/superadmin/tenants/:id
PATCH  /api/superadmin/tenants/:id/status
GET    /api/superadmin/analytics
GET    /api/superadmin/revenue
```

#### 1.2 ISP Tiered Billing Automation
**Priority:** CRITICAL  
**Effort:** Medium  
**Dependencies:** Super Admin Console

**Tasks:**
- [ ] Implement 24-hour free trial auto-expiry
- [ ] Tier 1 vs Tier 2 feature gating middleware
- [ ] ISP subscription payment tracking
- [ ] Automated billing reminder jobs
- [ ] ISP invoice generation

**Schema Additions:**
```typescript
// Add to tenants table
tier: text("tier").default("TRIAL"), // TRIAL, TIER_1, TIER_2
trialExpiresAt: timestamp("trial_expires_at"),
subscriptionExpiresAt: timestamp("subscription_expires_at"),
monthlyRevenue: integer("monthly_revenue").default(0),
```

#### 1.3 Tech Accounts & Limited Access Panel
**Priority:** HIGH  
**Effort:** Medium  
**Dependencies:** RBAC implementation

**Tasks:**
- [ ] Implement RBAC middleware (admin, tech roles)
- [ ] Create tech login page/route
- [ ] Build tech dashboard (limited to user management)
- [ ] Restrict tech access to: create WiFi users, assign plans
- [ ] Audit log for tech actions

**Schema Additions:**
```typescript
// Permissions for RBAC
export const permissions = pgTable("permissions", {
  id: varchar("id").primaryKey(),
  role: text("role").notNull(),
  resource: text("resource").notNull(),
  actions: text("actions").array().notNull(),
});
```

---

### PHASE 2: CUSTOMER EXPERIENCE (Medium-High Priority)
**Timeline:** 2-3 weeks  
**Impact:** Customer retention and self-service capabilities

#### 2.1 Enhanced Customer Self-Service Portal
**Priority:** HIGH  
**Effort:** High  
**Dependencies:** None

**Tasks:**
- [ ] Customer account creation with phone verification
- [ ] Customer login page (separate from ISP)
- [ ] View current plan and expiry countdown
- [ ] Purchase history and receipts
- [ ] Plan renewal button with M-Pesa
- [ ] Usage statistics (if available from router)

**New Pages:**
```
/customer/login
/customer/register
/customer/dashboard
/customer/history
/customer/renew
```

#### 2.2 Voucher System
**Priority:** HIGH  
**Effort:** Medium  
**Dependencies:** None

**Tasks:**
- [ ] Voucher schema (code, plan, device limit, validity)
- [ ] Bulk voucher generation UI
- [ ] Printable voucher format (PDF/thermal)
- [ ] Voucher redemption on captive portal
- [ ] Voucher validity and device limit enforcement
- [ ] Voucher usage tracking

**Schema Additions:**
```typescript
export const vouchers = pgTable("vouchers", {
  id: varchar("id").primaryKey(),
  tenantId: varchar("tenant_id").notNull(),
  planId: varchar("plan_id").notNull(),
  code: text("code").notNull().unique(),
  deviceLimit: integer("device_limit").default(1),
  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until"),
  usedAt: timestamp("used_at"),
  usedByMac: text("used_by_mac"),
  isActive: boolean("is_active").default(true),
});
```

#### 2.3 Interface Customization/White Labeling
**Priority:** MEDIUM  
**Effort:** Medium  
**Dependencies:** None

**Tasks:**
- [ ] ISP branding settings page (logo upload, colors)
- [ ] Apply branding to captive portal dynamically
- [ ] Apply branding to customer portal
- [ ] Custom subdomain routing logic
- [ ] Store logo in file storage

---

### PHASE 3: NETWORK & OPERATIONS (Medium Priority)
**Timeline:** 2-3 weeks  
**Impact:** Operational efficiency and monitoring

#### 3.1 Real-Time Monitoring Dashboard
**Priority:** MEDIUM  
**Effort:** High  
**Dependencies:** MikroTik API (already implemented)

**Tasks:**
- [ ] Live bandwidth usage graphs (Recharts integration)
- [ ] Router status indicators (online/offline)
- [ ] Active sessions table with refresh
- [ ] CPU/Memory utilization charts
- [ ] WebSocket for real-time updates

**New Components:**
```
BandwidthChart.tsx
RouterStatusCard.tsx
ActiveSessionsTable.tsx
ResourceUtilizationGraph.tsx
```

#### 3.2 Remote Router Management UI
**Priority:** MEDIUM  
**Effort:** Low (API exists)  
**Dependencies:** MikroTik API

**Tasks:**
- [ ] Router configuration backup button
- [ ] Remote reboot button with confirmation
- [ ] Router resource stats cards
- [ ] Quick action buttons (disconnect user, etc.)

#### 3.3 Hotspot Session Management
**Priority:** MEDIUM  
**Effort:** Medium  
**Dependencies:** RADIUS integration

**Tasks:**
- [ ] 15-minute inactivity logout (configurable per plan)
- [ ] Device limit enforcement (RADIUS accounting)
- [ ] Session time tracking display
- [ ] Session override for admins

---

### PHASE 4: COMMUNICATION & ENGAGEMENT (Medium Priority)
**Timeline:** 1-2 weeks  
**Impact:** Customer engagement and retention

#### 4.1 Bulk SMS Campaigns
**Priority:** MEDIUM  
**Effort:** Medium  
**Dependencies:** SMS Service (exists)

**Tasks:**
- [ ] SMS campaign creation UI
- [ ] Recipient selection (all, selected, by plan)
- [ ] Scheduled messages
- [ ] SMS template management
- [ ] Delivery analytics (sent, delivered, failed)

**Schema Additions:**
```typescript
export const smsCampaigns = pgTable("sms_campaigns", {
  id: varchar("id").primaryKey(),
  tenantId: varchar("tenant_id").notNull(),
  name: text("name").notNull(),
  message: text("message").notNull(),
  recipientFilter: jsonb("recipient_filter"),
  scheduledFor: timestamp("scheduled_for"),
  status: text("status").default("DRAFT"),
  sentCount: integer("sent_count").default(0),
  deliveredCount: integer("delivered_count").default(0),
});
```

#### 4.2 Automated Notifications Enhancement
**Priority:** HIGH  
**Effort:** Low  
**Dependencies:** SMS Service, Job Queue

**Tasks:**
- [ ] Payment confirmation SMS trigger
- [ ] Expiry reminder (24h, 1h before)
- [ ] Welcome message on first purchase
- [ ] Service outage notification template
- [ ] Configurable notification preferences

#### 4.3 Support Chat System
**Priority:** LOW  
**Effort:** High  
**Dependencies:** WebSocket infrastructure

**Tasks:**
- [ ] Chat schema (conversations, messages)
- [ ] ISP ↔ Super Admin chat
- [ ] Customer ↔ ISP chat
- [ ] Chat history linked to tickets
- [ ] Real-time message delivery

---

### PHASE 5: VALUE-ADDED FEATURES (Lower Priority)
**Timeline:** 2-3 weeks  
**Impact:** Differentiation and additional revenue streams

#### 5.1 Referral Program
**Priority:** LOW  
**Effort:** Medium

**Tasks:**
- [ ] Referral code generation per customer
- [ ] Voucher rewards configuration
- [ ] Referral tracking dashboard
- [ ] Referral leaderboard

#### 5.2 Guest Passes/Trial Periods
**Priority:** LOW  
**Effort:** Low

**Tasks:**
- [ ] Configurable trial duration per ISP
- [ ] One-time guest access generation
- [ ] Trial user conversion tracking
- [ ] Trial expiry notifications

#### 5.3 Compensation Module
**Priority:** LOW  
**Effort:** Medium

**Tasks:**
- [ ] Outage detection (router offline alerts)
- [ ] Customer compensation credit calculation
- [ ] Automatic credit application
- [ ] Compensation report

---

### PHASE 6: ADVANCED FEATURES (Future)
**Timeline:** 3-4 weeks  
**Impact:** Enterprise-grade capabilities

#### 6.1 Stock/Inventory Management
- [ ] Hardware tracking (routers, cables)
- [ ] POS for hardware sales
- [ ] Inventory alerts and reorder points

#### 6.2 Advanced Reporting
- [ ] Unit economics (Churn, LTV calculations)
- [ ] Income statements
- [ ] Export to Excel/PDF
- [ ] Scheduled report emails

#### 6.3 TR-069 Device Management
- [ ] CPE auto-configuration
- [ ] Remote device updates
- [ ] Device provisioning

#### 6.4 Network Topology Mapping
- [ ] Visual network map
- [ ] Device discovery
- [ ] Link status visualization

---

## COMPETITOR FEATURE COMPARISON (Updated)

| Feature | MnetiFi | Netpap | Kivipay | Cute Profit |
|---------|---------|--------|---------|-------------|
| M-Pesa Integration | ✅ | ✅ | ✅ | ✅ |
| Multi-tenant SaaS | ✅ | ✅ | ✅ | ? |
| MikroTik API | ✅ | ✅ | ✅ | ✅ |
| PPPoE/Static Billing | ✅ | ✅ | ✅ | ✅ |
| Hotspot Billing | ✅ | ✅ | ✅ | ✅ |
| RADIUS CoA | ✅ | ✅ | ? | ? |
| SMS Notifications | ⚠️ | ✅ | ✅ | ✅ |
| Customer Portal | ⚠️ | ✅ | ✅ | ✅ |
| Super Admin | ❌ | ✅ | ✅ | ? |
| Voucher System | ❌ | ✅ | ✅ | ✅ |
| White Labeling | ⚠️ | ✅ | ✅ | ? |
| Bulk SMS | ❌ | ✅ | ✅ | ✅ |
| Referral Program | ❌ | ✅ | ? | ? |
| Remote Tunnels | ❌ | ✅ | ? | ? |
| Real-time Monitoring | ⚠️ | ✅ | ✅ | ✅ |

**Legend:** ✅ Full | ⚠️ Partial | ❌ Missing | ? Unknown

---

## RECOMMENDED NEXT STEPS

### Immediate Priority (This Sprint)
1. **Super Admin Console** - Critical for platform monetization
2. **Tech Accounts with RBAC** - Competitive feature gap
3. **Automated SMS Notifications** - Quick win, backend exists

### Short-term (Next 2 Sprints)
4. **Customer Self-Service Portal** - Major competitive gap
5. **Voucher System** - High demand feature
6. **Real-Time Monitoring Dashboard** - Differentiation opportunity

### Medium-term (Next Quarter)
7. **Bulk SMS Campaigns** - Revenue opportunity for Tier 2
8. **White Labeling UI** - Enterprise feature
9. **Compensation Module** - Customer satisfaction

---

## TECHNICAL DEBT & IMPROVEMENTS

1. **Add comprehensive test coverage** - Unit and integration tests
2. **Implement proper logging** - Structured logging with correlation IDs
3. **Add rate limiting** - Protect API endpoints
4. **Implement caching** - Redis for session and frequently accessed data
5. **Add API documentation** - OpenAPI/Swagger specification

---

## CONCLUSION

MnetiFi has a solid foundation with core billing, network integration, and multi-tenant architecture. The primary gaps are in:

1. **SaaS monetization** (Super Admin, Tiered Billing)
2. **Customer self-service** (Portal, Vouchers)
3. **Operational tools** (Real-time monitoring, Bulk SMS)

Addressing Phase 1 and Phase 2 features will bring MnetiFi to competitive parity with Netpap and Kivipay.
