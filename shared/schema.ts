import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, inet } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Account types for WiFi users
export const AccountType = {
  HOTSPOT: "HOTSPOT",
  PPPOE: "PPPOE",
  STATIC: "STATIC",
} as const;
export type AccountTypeValue = typeof AccountType[keyof typeof AccountType];

// Ticket status
export const TicketStatus = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
} as const;
export type TicketStatusValue = typeof TicketStatus[keyof typeof TicketStatus];

// Ticket priority
export const TicketPriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;
export type TicketPriorityValue = typeof TicketPriority[keyof typeof TicketPriority];

// SaaS billing status for tenant
export const SaaSBillingStatus = {
  ACTIVE: "ACTIVE",
  TRIAL: "TRIAL",
  SUSPENDED: "SUSPENDED",
  BLOCKED: "BLOCKED",
} as const;
export type SaaSBillingStatusValue = typeof SaaSBillingStatus[keyof typeof SaaSBillingStatus];

// Tenant subscription tier
export const TenantTier = {
  TRIAL: "TRIAL",
  TIER_1: "TIER_1",
  TIER_2: "TIER_2",
} as const;
export type TenantTierValue = typeof TenantTier[keyof typeof TenantTier];

// User roles for RBAC
export const UserRole = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  TECH: "tech",
} as const;
export type UserRoleValue = typeof UserRole[keyof typeof UserRole];

// WiFi User status
export const WifiUserStatus = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  EXPIRED: "EXPIRED",
} as const;
export type WifiUserStatusValue = typeof WifiUserStatus[keyof typeof WifiUserStatus];

// Reconciliation status for transactions
export const ReconciliationStatus = {
  MATCHED: "MATCHED",
  UNMATCHED: "UNMATCHED",
  MANUAL_REVIEW: "MANUAL_REVIEW",
  PENDING: "PENDING",
} as const;
export type ReconciliationStatusValue = typeof ReconciliationStatus[keyof typeof ReconciliationStatus];

// ISP Payment Method for registration
export const ISPPaymentMethod = {
  MPESA: "MPESA",
  BANK: "BANK",
  PAYPAL: "PAYPAL",
} as const;
export type ISPPaymentMethodValue = typeof ISPPaymentMethod[keyof typeof ISPPaymentMethod];

// ISP Registration Payment Status
export const ISPPaymentStatus = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;
export type ISPPaymentStatusValue = typeof ISPPaymentStatus[keyof typeof ISPPaymentStatus];

// Tenant - Multi-tenant SaaS organization
export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  subdomain: text("subdomain").notNull().unique(),
  email: text("email"),
  phone: text("phone"),
  brandingConfig: jsonb("branding_config").$type<{
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  }>().default({}),
  mpesaShortcode: text("mpesa_shortcode"),
  mpesaPasskey: text("mpesa_passkey"),
  mpesaConsumerKey: text("mpesa_consumer_key"),
  mpesaConsumerSecret: text("mpesa_consumer_secret"),
  tier: text("tier").default("TRIAL"),
  trialExpiresAt: timestamp("trial_expires_at"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  monthlyRevenue: integer("monthly_revenue").default(0),
  totalUsers: integer("total_users").default(0),
  saasBillingStatus: text("saas_billing_status").default("TRIAL"),
  isActive: boolean("is_active").default(true),
  registrationPaymentMethod: text("registration_payment_method"), // MPESA, BANK, PAYPAL
  registrationPaymentStatus: text("registration_payment_status").default("PENDING"), // PENDING, COMPLETED, FAILED
  registrationPaymentRef: text("registration_payment_ref"), // Reference number for payment
  createdAt: timestamp("created_at").defaultNow(),
});

export const tenantsRelations = relations(tenants, ({ many }) => ({
  hotspots: many(hotspots),
  plans: many(plans),
  transactions: many(transactions),
  walledGardens: many(walledGardens),
  wifiUsers: many(wifiUsers),
  tickets: many(tickets),
}));

// Hotspot - NAS device locations
export const hotspots = pgTable("hotspots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  nasIp: text("nas_ip").notNull(),
  secret: text("secret").notNull(),
  locationName: text("location_name").notNull(),
  description: text("description"),
  routerApiIp: text("router_api_ip"),
  routerApiUser: text("router_api_user"),
  routerApiPass: text("router_api_pass"),
  routerApiPort: integer("router_api_port").default(8728),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const hotspotsRelations = relations(hotspots, ({ one }) => ({
  tenant: one(tenants, {
    fields: [hotspots.tenantId],
    references: [tenants.id],
  }),
}));

// Plan type
export const PlanType = {
  HOTSPOT: "HOTSPOT",
  PPPOE: "PPPOE",
  STATIC: "STATIC",
} as const;
export type PlanTypeValue = typeof PlanType[keyof typeof PlanType];

// Plan - WiFi subscription plans
export const plans = pgTable("plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(), // In smallest currency unit (cents/shillings)
  durationSeconds: integer("duration_seconds").notNull(),
  planType: text("plan_type").notNull().default("HOTSPOT"), // HOTSPOT, PPPOE, STATIC
  speedMbps: integer("speed_mbps"), // Speed in Mbps for PPPoE/Static plans
  uploadLimit: text("upload_limit"), // e.g., "2M" for MikroTik
  downloadLimit: text("download_limit"), // e.g., "5M" for MikroTik
  burstRateUp: text("burst_rate_up"), // e.g., "4M" burst upload
  burstRateDown: text("burst_rate_down"), // e.g., "10M" burst download
  burstThreshold: text("burst_threshold"), // e.g., "1M"
  burstTime: integer("burst_time"), // in seconds
  simultaneousUse: integer("simultaneous_use").default(1),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const plansRelations = relations(plans, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [plans.tenantId],
    references: [tenants.id],
  }),
  transactions: many(transactions),
}));

// Transaction - Payment records
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  planId: varchar("plan_id").references(() => plans.id),
  wifiUserId: varchar("wifi_user_id"),
  userPhone: text("user_phone").notNull(),
  amount: integer("amount").notNull(),
  mpesaReceiptNumber: text("mpesa_receipt_number"),
  checkoutRequestId: text("checkout_request_id"),
  merchantRequestId: text("merchant_request_id"),
  status: text("status").notNull().default("PENDING"), // PENDING, COMPLETED, FAILED
  reconciliationStatus: text("reconciliation_status").default("PENDING"), // MATCHED, UNMATCHED, MANUAL_REVIEW, PENDING
  statusDescription: text("status_description"),
  macAddress: text("mac_address"),
  nasIp: text("nas_ip"),
  radiusSessionId: text("radius_session_id"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const transactionsRelations = relations(transactions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [transactions.tenantId],
    references: [tenants.id],
  }),
  plan: one(plans, {
    fields: [transactions.planId],
    references: [plans.id],
  }),
}));

// Walled Garden - Allowed domains before authentication
export const walledGardens = pgTable("walled_gardens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  domain: text("domain").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const walledGardensRelations = relations(walledGardens, ({ one }) => ({
  tenant: one(tenants, {
    fields: [walledGardens.tenantId],
    references: [tenants.id],
  }),
}));

// Users - Admin users for dashboard access
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  role: text("role").notNull().default("admin"), // superadmin, admin, tech
  isActive: boolean("is_active").default(true),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ one }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
}));

// WifiUser - End customers who use the WiFi service
export const wifiUsers = pgTable("wifi_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  phoneNumber: text("phone_number").notNull(),
  email: text("email"),
  fullName: text("full_name"),
  accountType: text("account_type").notNull().default("HOTSPOT"), // HOTSPOT, PPPOE, STATIC
  currentPlanId: varchar("current_plan_id").references(() => plans.id),
  currentHotspotId: varchar("current_hotspot_id").references(() => hotspots.id),
  expiryTime: timestamp("expiry_time"),
  macAddress: text("mac_address"),
  ipAddress: text("ip_address"),
  username: text("username"),
  password: text("password"),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE, SUSPENDED, EXPIRED
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const wifiUsersRelations = relations(wifiUsers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [wifiUsers.tenantId],
    references: [tenants.id],
  }),
  currentPlan: one(plans, {
    fields: [wifiUsers.currentPlanId],
    references: [plans.id],
  }),
  currentHotspot: one(hotspots, {
    fields: [wifiUsers.currentHotspotId],
    references: [hotspots.id],
  }),
  tickets: many(tickets),
}));

// Ticket - Support tickets for customer issues
export const tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  wifiUserId: varchar("wifi_user_id").references(() => wifiUsers.id),
  subject: text("subject").notNull(),
  issueDetails: text("issue_details").notNull(),
  status: text("status").notNull().default("OPEN"), // OPEN, IN_PROGRESS, RESOLVED, CLOSED
  priority: text("priority").notNull().default("MEDIUM"), // LOW, MEDIUM, HIGH, URGENT
  resolutionNotes: text("resolution_notes"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  closedAt: timestamp("closed_at"),
});

export const ticketsRelations = relations(tickets, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tickets.tenantId],
    references: [tenants.id],
  }),
  wifiUser: one(wifiUsers, {
    fields: [tickets.wifiUserId],
    references: [wifiUsers.id],
  }),
  assignee: one(users, {
    fields: [tickets.assignedTo],
    references: [users.id],
  }),
}));

// Insert Schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
});

export const insertHotspotSchema = createInsertSchema(hotspots).omit({
  id: true,
  createdAt: true,
});

export const insertPlanSchema = createInsertSchema(plans).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWalledGardenSchema = createInsertSchema(walledGardens).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertWifiUserSchema = createInsertSchema(wifiUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  closedAt: true,
});

// Types
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type Hotspot = typeof hotspots.$inferSelect;
export type InsertHotspot = z.infer<typeof insertHotspotSchema>;

export type Plan = typeof plans.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type WalledGarden = typeof walledGardens.$inferSelect;
export type InsertWalledGarden = z.infer<typeof insertWalledGardenSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type WifiUser = typeof wifiUsers.$inferSelect;
export type InsertWifiUser = z.infer<typeof insertWifiUserSchema>;

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;

// Transaction status enum for type safety
export const TransactionStatus = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export type TransactionStatusType = typeof TransactionStatus[keyof typeof TransactionStatus];

// Job status for background queue
export const JobStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  RETRY: "RETRY",
} as const;
export type JobStatusType = typeof JobStatus[keyof typeof JobStatus];

// Job types
export const JobType = {
  PAYMENT_STATUS_CHECK: "PAYMENT_STATUS_CHECK",
  USER_EXPIRY_CHECK: "USER_EXPIRY_CHECK",
  RECONCILIATION: "RECONCILIATION",
  SMS_NOTIFICATION: "SMS_NOTIFICATION",
  EMAIL_NOTIFICATION: "EMAIL_NOTIFICATION",
} as const;
export type JobTypeValue = typeof JobType[keyof typeof JobType];

// Background Jobs - Database-backed job queue for resilience
export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  type: text("type").notNull(), // PAYMENT_STATUS_CHECK, USER_EXPIRY_CHECK, etc.
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  status: text("status").notNull().default("PENDING"), // PENDING, PROCESSING, COMPLETED, FAILED, RETRY
  priority: integer("priority").default(0), // Higher = more urgent
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
  lastError: text("last_error"),
  scheduledFor: timestamp("scheduled_for").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const jobsRelations = relations(jobs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [jobs.tenantId],
    references: [tenants.id],
  }),
}));

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  attempts: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;

// SMS Campaigns - Bulk SMS message tracking
export const SmsCampaignStatus = {
  PENDING: "pending",
  SENDING: "sending",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;
export type SmsCampaignStatusValue = typeof SmsCampaignStatus[keyof typeof SmsCampaignStatus];

export const smsCampaigns = pgTable("sms_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  message: text("message").notNull(),
  recipientCount: integer("recipient_count").notNull().default(0),
  sentCount: integer("sent_count").default(0),
  failedCount: integer("failed_count").default(0),
  status: text("status").notNull().default("pending"), // pending, sending, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
});

export const smsCampaignsRelations = relations(smsCampaigns, ({ one }) => ({
  tenant: one(tenants, {
    fields: [smsCampaigns.tenantId],
    references: [tenants.id],
  }),
}));

export const insertSmsCampaignSchema = createInsertSchema(smsCampaigns).omit({
  id: true,
  createdAt: true,
});

export type SmsCampaign = typeof smsCampaigns.$inferSelect;
export type InsertSmsCampaign = z.infer<typeof insertSmsCampaignSchema>;
