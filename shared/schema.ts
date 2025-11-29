import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, inet } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tenant - Multi-tenant SaaS organization
export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  subdomain: text("subdomain").notNull().unique(),
  brandingConfig: jsonb("branding_config").$type<{
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  }>().default({}),
  mpesaShortcode: text("mpesa_shortcode"),
  mpesaPasskey: text("mpesa_passkey"),
  mpesaConsumerKey: text("mpesa_consumer_key"),
  mpesaConsumerSecret: text("mpesa_consumer_secret"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tenantsRelations = relations(tenants, ({ many }) => ({
  hotspots: many(hotspots),
  plans: many(plans),
  transactions: many(transactions),
  walledGardens: many(walledGardens),
}));

// Hotspot - NAS device locations
export const hotspots = pgTable("hotspots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  nasIp: text("nas_ip").notNull(),
  secret: text("secret").notNull(),
  locationName: text("location_name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const hotspotsRelations = relations(hotspots, ({ one }) => ({
  tenant: one(tenants, {
    fields: [hotspots.tenantId],
    references: [tenants.id],
  }),
}));

// Plan - WiFi subscription plans
export const plans = pgTable("plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(), // In smallest currency unit (cents/shillings)
  durationSeconds: integer("duration_seconds").notNull(),
  uploadLimit: text("upload_limit"), // e.g., "2M" for MikroTik
  downloadLimit: text("download_limit"), // e.g., "5M" for MikroTik
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
  userPhone: text("user_phone").notNull(),
  amount: integer("amount").notNull(),
  mpesaReceiptNumber: text("mpesa_receipt_number"),
  checkoutRequestId: text("checkout_request_id"),
  merchantRequestId: text("merchant_request_id"),
  status: text("status").notNull().default("PENDING"), // PENDING, COMPLETED, FAILED
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
  role: text("role").notNull().default("admin"), // superadmin, admin
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ one }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
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

// Transaction status enum for type safety
export const TransactionStatus = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export type TransactionStatusType = typeof TransactionStatus[keyof typeof TransactionStatus];
