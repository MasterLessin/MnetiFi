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
export const SubscriptionTier = {
  BASIC: "BASIC",      // Free 24hr trial - Hotspot features only
  PREMIUM: "PREMIUM",  // Full features - PPPoE, Static IP, Technicians, etc.
} as const;
export type SubscriptionTierValue = typeof SubscriptionTier[keyof typeof SubscriptionTier];

// Feature sets for each tier
export const TierFeatures = {
  BASIC: [
    "dashboard",
    "wifi-users", 
    "hotspot-plans",
    "transactions",
    "hotspots",
    "vouchers",
    "zones",
    "settings",
    "walled-garden",
    "portal",
    "tickets",
  ],
  PREMIUM: [
    "dashboard",
    "wifi-users",
    "hotspot-plans", 
    "pppoe-plans",
    "static-plans",
    "transactions",
    "hotspots",
    "vouchers",
    "zones",
    "settings",
    "walled-garden",
    "portal",
    "technicians",
    "sms-campaigns",
    "network-monitoring",
    "chat",
    "loyalty",
    "security",
    "reconciliation",
    "tickets",
    "reports",
  ]
} as const;

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
  website: text("website"),
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
  smsProvider: text("sms_provider").default("mock"), // mock, africas_talking, twilio
  smsApiKey: text("sms_api_key"),
  smsUsername: text("sms_username"),
  smsSenderId: text("sms_sender_id"),
  // WhatsApp Business API configuration
  whatsappProvider: text("whatsapp_provider").default("mock"), // mock, meta, twilio
  whatsappApiKey: text("whatsapp_api_key"),
  whatsappPhoneNumberId: text("whatsapp_phone_number_id"),
  whatsappBusinessAccountId: text("whatsapp_business_account_id"),
  subscriptionTier: text("subscription_tier").default("BASIC"),
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
  maxDevices: integer("max_devices").default(1), // Maximum devices allowed per voucher
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
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpiry: timestamp("email_verification_expiry"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: text("two_factor_secret"),
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
  technicianId: varchar("technician_id").references(() => users.id), // Assigned technician
  zoneId: varchar("zone_id"), // Assigned zone (references zones table)
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
  technician: one(users, {
    fields: [wifiUsers.technicianId],
    references: [users.id],
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

// Guest Pass Status
export const GuestPassStatus = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  EXHAUSTED: "EXHAUSTED",
} as const;
export type GuestPassStatusValue = typeof GuestPassStatus[keyof typeof GuestPassStatus];

// Guest Passes - Free trial/guest access vouchers
export const guestPasses = pgTable("guest_passes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  code: text("code").notNull(), // Unique voucher code for redemption
  name: text("name").notNull(), // Descriptive name like "Weekend Trial"
  durationSeconds: integer("duration_seconds").notNull(), // How long access lasts
  usageLimit: integer("usage_limit").notNull().default(1), // How many times can be redeemed
  usedCount: integer("used_count").notNull().default(0), // Times already used
  speedLimitUp: text("speed_limit_up"), // Optional upload limit e.g. "1M"
  speedLimitDown: text("speed_limit_down"), // Optional download limit e.g. "2M"
  validFrom: timestamp("valid_from").defaultNow(), // When pass becomes valid
  validUntil: timestamp("valid_until"), // When pass expires (null = never)
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const guestPassesRelations = relations(guestPasses, ({ one }) => ({
  tenant: one(tenants, {
    fields: [guestPasses.tenantId],
    references: [tenants.id],
  }),
}));

export const insertGuestPassSchema = createInsertSchema(guestPasses).omit({
  id: true,
  usedCount: true,
  createdAt: true,
});

export type GuestPass = typeof guestPasses.$inferSelect;
export type InsertGuestPass = z.infer<typeof insertGuestPassSchema>;

// Guest Pass Redemptions - Track when passes are used
export const guestPassRedemptions = pgTable("guest_pass_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guestPassId: varchar("guest_pass_id").notNull().references(() => guestPasses.id),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  macAddress: text("mac_address"), // Device that redeemed
  ipAddress: text("ip_address"),
  expiresAt: timestamp("expires_at").notNull(), // When this session expires
  redeemedAt: timestamp("redeemed_at").defaultNow(),
});

export const guestPassRedemptionsRelations = relations(guestPassRedemptions, ({ one }) => ({
  guestPass: one(guestPasses, {
    fields: [guestPassRedemptions.guestPassId],
    references: [guestPasses.id],
  }),
  tenant: one(tenants, {
    fields: [guestPassRedemptions.tenantId],
    references: [tenants.id],
  }),
}));

export const insertGuestPassRedemptionSchema = createInsertSchema(guestPassRedemptions).omit({
  id: true,
  redeemedAt: true,
});

export type GuestPassRedemption = typeof guestPassRedemptions.$inferSelect;
export type InsertGuestPassRedemption = z.infer<typeof insertGuestPassRedemptionSchema>;

// Wallet Transaction Type
export const WalletTransactionType = {
  DEPOSIT: "DEPOSIT",           // Money added to wallet (top-up)
  PAYMENT: "PAYMENT",           // Money used for plan purchase
  REFUND: "REFUND",             // Money refunded to wallet
  EXCESS: "EXCESS",             // Excess payment credited to wallet
  WITHDRAWAL: "WITHDRAWAL",     // Money withdrawn from wallet
  BONUS: "BONUS",               // Promotional bonus credit
} as const;
export type WalletTransactionTypeValue = typeof WalletTransactionType[keyof typeof WalletTransactionType];

// Wallet - Customer balance tracking
export const wallets = pgTable("wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  wifiUserId: varchar("wifi_user_id").notNull().references(() => wifiUsers.id),
  balance: integer("balance").notNull().default(0), // In smallest currency unit
  totalDeposited: integer("total_deposited").notNull().default(0),
  totalSpent: integer("total_spent").notNull().default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [wallets.tenantId],
    references: [tenants.id],
  }),
  wifiUser: one(wifiUsers, {
    fields: [wallets.wifiUserId],
    references: [wifiUsers.id],
  }),
  transactions: many(walletTransactions),
}));

export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;

// Wallet Transactions - Track all wallet movements
export const walletTransactions = pgTable("wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").notNull().references(() => wallets.id),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  type: text("type").notNull(), // DEPOSIT, PAYMENT, REFUND, EXCESS, WITHDRAWAL, BONUS
  amount: integer("amount").notNull(), // Positive for credits, negative for debits
  balanceAfter: integer("balance_after").notNull(), // Balance after this transaction
  description: text("description"),
  referenceId: varchar("reference_id"), // Link to payment transaction or M-Pesa receipt
  referenceType: text("reference_type"), // 'transaction', 'mpesa', 'manual'
  createdAt: timestamp("created_at").defaultNow(),
});

export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
  wallet: one(wallets, {
    fields: [walletTransactions.walletId],
    references: [wallets.id],
  }),
  tenant: one(tenants, {
    fields: [walletTransactions.tenantId],
    references: [tenants.id],
  }),
}));

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({
  id: true,
  createdAt: true,
});

export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;

// Voucher Status
export const VoucherStatus = {
  AVAILABLE: "AVAILABLE",
  USED: "USED",
  EXPIRED: "EXPIRED",
  DISABLED: "DISABLED",
} as const;
export type VoucherStatusValue = typeof VoucherStatus[keyof typeof VoucherStatus];

// Voucher Batches - Groups of vouchers created together
export const voucherBatches = pgTable("voucher_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  planId: varchar("plan_id").notNull().references(() => plans.id),
  name: text("name").notNull(),
  prefix: text("prefix"),
  quantity: integer("quantity").notNull(),
  usedCount: integer("used_count").notNull().default(0),
  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const voucherBatchesRelations = relations(voucherBatches, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [voucherBatches.tenantId],
    references: [tenants.id],
  }),
  plan: one(plans, {
    fields: [voucherBatches.planId],
    references: [plans.id],
  }),
  vouchers: many(vouchers),
}));

export const insertVoucherBatchSchema = createInsertSchema(voucherBatches).omit({
  id: true,
  usedCount: true,
  createdAt: true,
});

export type VoucherBatch = typeof voucherBatches.$inferSelect;
export type InsertVoucherBatch = z.infer<typeof insertVoucherBatchSchema>;

// Vouchers - Individual access codes
export const vouchers = pgTable("vouchers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  batchId: varchar("batch_id").references(() => voucherBatches.id),
  planId: varchar("plan_id").notNull().references(() => plans.id),
  code: text("code").notNull(),
  status: text("status").notNull().default("AVAILABLE"),
  usedBy: varchar("used_by").references(() => wifiUsers.id),
  usedAt: timestamp("used_at"),
  macAddress: text("mac_address"),
  expiresAt: timestamp("expires_at"),
  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vouchersRelations = relations(vouchers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [vouchers.tenantId],
    references: [tenants.id],
  }),
  batch: one(voucherBatches, {
    fields: [vouchers.batchId],
    references: [voucherBatches.id],
  }),
  plan: one(plans, {
    fields: [vouchers.planId],
    references: [plans.id],
  }),
  usedByUser: one(wifiUsers, {
    fields: [vouchers.usedBy],
    references: [wifiUsers.id],
  }),
}));

export const insertVoucherSchema = createInsertSchema(vouchers).omit({
  id: true,
  usedAt: true,
  createdAt: true,
});

export type Voucher = typeof vouchers.$inferSelect;
export type InsertVoucher = z.infer<typeof insertVoucherSchema>;

// Zones - Geographic/logical areas for organizing customers and techs
export const zones = pgTable("zones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#22d3ee"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const zonesRelations = relations(zones, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [zones.tenantId],
    references: [tenants.id],
  }),
}));

export const insertZoneSchema = createInsertSchema(zones).omit({
  id: true,
  createdAt: true,
});

export type Zone = typeof zones.$inferSelect;
export type InsertZone = z.infer<typeof insertZoneSchema>;

// Audit Logs - Track user actions
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  details: jsonb("details").$type<Record<string, unknown>>().default({}),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [auditLogs.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Chat Messages - Customer to ISP communication
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  wifiUserId: varchar("wifi_user_id").references(() => wifiUsers.id),
  userId: varchar("user_id").references(() => users.id),
  message: text("message").notNull(),
  isFromCustomer: boolean("is_from_customer").default(true),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  tenant: one(tenants, {
    fields: [chatMessages.tenantId],
    references: [tenants.id],
  }),
  wifiUser: one(wifiUsers, {
    fields: [chatMessages.wifiUserId],
    references: [wifiUsers.id],
  }),
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Loyalty Points - Customer rewards tracking
export const loyaltyPoints = pgTable("loyalty_points", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  wifiUserId: varchar("wifi_user_id").notNull().references(() => wifiUsers.id),
  points: integer("points").notNull().default(0),
  totalEarned: integer("total_earned").notNull().default(0),
  totalRedeemed: integer("total_redeemed").notNull().default(0),
  lastEarnedAt: timestamp("last_earned_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const loyaltyPointsRelations = relations(loyaltyPoints, ({ one }) => ({
  tenant: one(tenants, {
    fields: [loyaltyPoints.tenantId],
    references: [tenants.id],
  }),
  wifiUser: one(wifiUsers, {
    fields: [loyaltyPoints.wifiUserId],
    references: [wifiUsers.id],
  }),
}));

export const insertLoyaltyPointsSchema = createInsertSchema(loyaltyPoints).omit({
  id: true,
  createdAt: true,
});

export type LoyaltyPoints = typeof loyaltyPoints.$inferSelect;
export type InsertLoyaltyPoints = z.infer<typeof insertLoyaltyPointsSchema>;

// Loyalty Transactions - Point earning/redemption history
export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  loyaltyId: varchar("loyalty_id").notNull().references(() => loyaltyPoints.id),
  type: text("type").notNull(), // EARNED, REDEEMED
  points: integer("points").notNull(),
  description: text("description"),
  referenceId: text("reference_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const loyaltyTransactionsRelations = relations(loyaltyTransactions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [loyaltyTransactions.tenantId],
    references: [tenants.id],
  }),
  loyalty: one(loyaltyPoints, {
    fields: [loyaltyTransactions.loyaltyId],
    references: [loyaltyPoints.id],
  }),
}));

export const insertLoyaltyTransactionSchema = createInsertSchema(loyaltyTransactions).omit({
  id: true,
  createdAt: true,
});

export type LoyaltyTransaction = typeof loyaltyTransactions.$inferSelect;
export type InsertLoyaltyTransaction = z.infer<typeof insertLoyaltyTransactionSchema>;

// Login Attempts - Track failed logins for security
export const loginAttempts = pgTable("login_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull(),
  ipAddress: text("ip_address"),
  success: boolean("success").default(false),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLoginAttemptSchema = createInsertSchema(loginAttempts).omit({
  id: true,
  createdAt: true,
});

export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type InsertLoginAttempt = z.infer<typeof insertLoginAttemptSchema>;
