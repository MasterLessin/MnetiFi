import { 
  tenants, hotspots, plans, transactions, walledGardens, users, wifiUsers, tickets, smsCampaigns, wallets, walletTransactions, vouchers, voucherBatches,
  type Tenant, type InsertTenant,
  type Hotspot, type InsertHotspot,
  type Plan, type InsertPlan,
  type Transaction, type InsertTransaction,
  type WalledGarden, type InsertWalledGarden,
  type User, type InsertUser,
  type WifiUser, type InsertWifiUser,
  type Ticket, type InsertTicket,
  type SmsCampaign, type InsertSmsCampaign,
  type Wallet, type InsertWallet,
  type WalletTransaction, type InsertWalletTransaction,
  type Voucher, type InsertVoucher,
  type VoucherBatch, type InsertVoucherBatch,
  WalletTransactionType,
  VoucherStatus,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // Tenant operations
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined>;

  // Hotspot operations
  getHotspots(tenantId: string): Promise<Hotspot[]>;
  getHotspot(id: string): Promise<Hotspot | undefined>;
  createHotspot(hotspot: InsertHotspot): Promise<Hotspot>;
  updateHotspot(id: string, data: Partial<InsertHotspot>): Promise<Hotspot | undefined>;
  deleteHotspot(id: string): Promise<boolean>;

  // Plan operations
  getPlans(tenantId: string): Promise<Plan[]>;
  getActivePlans(tenantId: string): Promise<Plan[]>;
  getPlan(id: string): Promise<Plan | undefined>;
  createPlan(plan: InsertPlan): Promise<Plan>;
  updatePlan(id: string, data: Partial<InsertPlan>): Promise<Plan | undefined>;
  deletePlan(id: string): Promise<boolean>;

  // Transaction operations
  getTransactions(tenantId: string): Promise<Transaction[]>;
  getRecentTransactions(tenantId: string, limit?: number): Promise<Transaction[]>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  getTransactionByCheckoutRequestId(checkoutRequestId: string): Promise<Transaction | undefined>;
  getTransactionsByWifiUserId(wifiUserId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, data: Partial<InsertTransaction>): Promise<Transaction | undefined>;

  // Walled Garden operations
  getWalledGardens(tenantId: string): Promise<WalledGarden[]>;
  getWalledGarden(id: string): Promise<WalledGarden | undefined>;
  createWalledGarden(walledGarden: InsertWalledGarden): Promise<WalledGarden>;
  deleteWalledGarden(id: string): Promise<boolean>;

  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  getUserByEmailVerificationToken(token: string): Promise<User | undefined>;
  getTechnicians(tenantId: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser & { resetToken?: string | null; resetTokenExpiry?: Date | null; emailVerificationToken?: string | null; emailVerificationExpiry?: Date | null; emailVerified?: boolean }>): Promise<User | undefined>;
  getAllTenants(): Promise<Tenant[]>;

  // WiFi User operations
  getWifiUsers(tenantId: string): Promise<WifiUser[]>;
  getWifiUser(id: string): Promise<WifiUser | undefined>;
  getWifiUserByPhone(tenantId: string, phoneNumber: string): Promise<WifiUser | undefined>;
  createWifiUser(wifiUser: InsertWifiUser): Promise<WifiUser>;
  updateWifiUser(id: string, data: Partial<InsertWifiUser>): Promise<WifiUser | undefined>;
  deleteWifiUser(id: string): Promise<boolean>;
  getExpiringWifiUsers(tenantId: string, daysAhead: number): Promise<WifiUser[]>;
  
  // Ticket operations
  getTickets(tenantId: string): Promise<Ticket[]>;
  getTicket(id: string): Promise<Ticket | undefined>;
  getTicketsByWifiUser(wifiUserId: string): Promise<Ticket[]>;
  getOpenTickets(tenantId: string): Promise<Ticket[]>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: string, data: Partial<InsertTicket>): Promise<Ticket | undefined>;
  closeTicket(id: string, resolutionNotes: string): Promise<Ticket | undefined>;

  // Dashboard stats
  getDashboardStats(tenantId: string): Promise<{
    totalRevenue: number;
    totalTransactions: number;
    successfulTransactions: number;
    pendingTransactions: number;
    failedTransactions: number;
    activeHotspots: number;
    activeWifiUsers: number;
    openTickets: number;
    expiringUsers: WifiUser[];
    recentTransactions: Transaction[];
  }>;

  // Mark all expired users
  markExpiredUsers(): Promise<number>;
  
  // Mark stale pending transactions as failed
  markStaleTransactionsAsFailed(): Promise<number>;

  // Voucher operations
  getVouchers(tenantId: string): Promise<Voucher[]>;
  getVoucher(id: string): Promise<Voucher | undefined>;
  getVoucherByCode(tenantId: string, code: string): Promise<Voucher | undefined>;
  createVoucher(voucher: InsertVoucher): Promise<Voucher>;
  createVoucherBatch(batch: InsertVoucherBatch, voucherCodes: string[]): Promise<{ batch: VoucherBatch; vouchers: Voucher[] }>;
  updateVoucher(id: string, data: Partial<InsertVoucher>): Promise<Voucher | undefined>;
  redeemVoucher(id: string, wifiUserId: string, macAddress?: string): Promise<Voucher | undefined>;
  getVoucherBatches(tenantId: string): Promise<VoucherBatch[]>;
  getVoucherBatch(id: string): Promise<VoucherBatch | undefined>;
  getVouchersByBatch(batchId: string): Promise<Voucher[]>;
  getVouchersByPhone(tenantId: string, phoneNumber: string): Promise<(Voucher & { planName?: string })[]>;
  deleteVoucher(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Tenant operations
  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant || undefined;
  }

  async getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.subdomain, subdomain));
    return tenant || undefined;
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const [created] = await db.insert(tenants).values(tenant as any).returning();
    return created;
  }

  async updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const [updated] = await db.update(tenants).set(data as any).where(eq(tenants.id, id)).returning();
    return updated || undefined;
  }

  // Hotspot operations
  async getHotspots(tenantId: string): Promise<Hotspot[]> {
    return db.select().from(hotspots).where(eq(hotspots.tenantId, tenantId));
  }

  async getHotspot(id: string): Promise<Hotspot | undefined> {
    const [hotspot] = await db.select().from(hotspots).where(eq(hotspots.id, id));
    return hotspot || undefined;
  }

  async createHotspot(hotspot: InsertHotspot): Promise<Hotspot> {
    const [created] = await db.insert(hotspots).values(hotspot).returning();
    return created;
  }

  async updateHotspot(id: string, data: Partial<InsertHotspot>): Promise<Hotspot | undefined> {
    const [updated] = await db.update(hotspots).set(data).where(eq(hotspots.id, id)).returning();
    return updated || undefined;
  }

  async deleteHotspot(id: string): Promise<boolean> {
    const result = await db.delete(hotspots).where(eq(hotspots.id, id)).returning();
    return result.length > 0;
  }

  // Plan operations
  async getPlans(tenantId: string): Promise<Plan[]> {
    return db.select().from(plans).where(eq(plans.tenantId, tenantId)).orderBy(plans.sortOrder);
  }

  async getActivePlans(tenantId: string): Promise<Plan[]> {
    return db.select().from(plans).where(
      and(eq(plans.tenantId, tenantId), eq(plans.isActive, true))
    ).orderBy(plans.sortOrder);
  }

  async getPlan(id: string): Promise<Plan | undefined> {
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    return plan || undefined;
  }

  async createPlan(plan: InsertPlan): Promise<Plan> {
    const [created] = await db.insert(plans).values(plan).returning();
    return created;
  }

  async updatePlan(id: string, data: Partial<InsertPlan>): Promise<Plan | undefined> {
    const [updated] = await db.update(plans).set(data).where(eq(plans.id, id)).returning();
    return updated || undefined;
  }

  async deletePlan(id: string): Promise<boolean> {
    const result = await db.delete(plans).where(eq(plans.id, id)).returning();
    return result.length > 0;
  }

  // Transaction operations
  async getTransactions(tenantId: string): Promise<Transaction[]> {
    return db.select().from(transactions)
      .where(eq(transactions.tenantId, tenantId))
      .orderBy(desc(transactions.createdAt));
  }

  async getRecentTransactions(tenantId: string, limit: number = 10): Promise<Transaction[]> {
    return db.select().from(transactions)
      .where(eq(transactions.tenantId, tenantId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction || undefined;
  }

  async getTransactionByCheckoutRequestId(checkoutRequestId: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions)
      .where(eq(transactions.checkoutRequestId, checkoutRequestId));
    return transaction || undefined;
  }

  async getTransactionsByWifiUserId(wifiUserId: string): Promise<Transaction[]> {
    return db.select().from(transactions)
      .where(eq(transactions.wifiUserId, wifiUserId))
      .orderBy(desc(transactions.createdAt));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [created] = await db.insert(transactions).values(transaction).returning();
    return created;
  }

  async updateTransaction(id: string, data: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const [updated] = await db.update(transactions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(transactions.id, id))
      .returning();
    return updated || undefined;
  }

  // Walled Garden operations
  async getWalledGardens(tenantId: string): Promise<WalledGarden[]> {
    return db.select().from(walledGardens).where(eq(walledGardens.tenantId, tenantId));
  }

  async getWalledGarden(id: string): Promise<WalledGarden | undefined> {
    const [wg] = await db.select().from(walledGardens).where(eq(walledGardens.id, id));
    return wg || undefined;
  }

  async createWalledGarden(walledGarden: InsertWalledGarden): Promise<WalledGarden> {
    const [created] = await db.insert(walledGardens).values(walledGarden).returning();
    return created;
  }

  async deleteWalledGarden(id: string): Promise<boolean> {
    const result = await db.delete(walledGardens).where(eq(walledGardens.id, id)).returning();
    return result.length > 0;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.resetToken, token));
    return user || undefined;
  }

  async getUserByEmailVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user || undefined;
  }

  async getTechnicians(tenantId: string): Promise<User[]> {
    return db.select().from(users).where(
      and(
        eq(users.tenantId, tenantId),
        eq(users.role, "tech"),
        eq(users.isActive, true)
      )
    );
  }

  async updateUser(id: string, data: Partial<InsertUser & { resetToken?: string | null; resetTokenExpiry?: Date | null; emailVerificationToken?: string | null; emailVerificationExpiry?: Date | null; emailVerified?: boolean }>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data as any).where(eq(users.id, id)).returning();
    return updated || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async getAllAdminUsers(): Promise<(User & { tenantName?: string })[]> {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    const allTenants = await db.select().from(tenants);
    
    return allUsers.map(user => ({
      ...user,
      tenantName: user.tenantId 
        ? allTenants.find(t => t.id === user.tenantId)?.name 
        : undefined
    }));
  }

  async getAllTenants(): Promise<Tenant[]> {
    return db.select().from(tenants).orderBy(desc(tenants.createdAt));
  }

  // WiFi User operations
  async getWifiUsers(tenantId: string): Promise<WifiUser[]> {
    return db.select().from(wifiUsers)
      .where(eq(wifiUsers.tenantId, tenantId))
      .orderBy(desc(wifiUsers.createdAt));
  }

  async getWifiUser(id: string): Promise<WifiUser | undefined> {
    const [wifiUser] = await db.select().from(wifiUsers).where(eq(wifiUsers.id, id));
    return wifiUser || undefined;
  }

  async getWifiUserByPhone(tenantId: string, phoneNumber: string): Promise<WifiUser | undefined> {
    const [wifiUser] = await db.select().from(wifiUsers)
      .where(and(eq(wifiUsers.tenantId, tenantId), eq(wifiUsers.phoneNumber, phoneNumber)));
    return wifiUser || undefined;
  }

  async createWifiUser(wifiUser: InsertWifiUser): Promise<WifiUser> {
    const [created] = await db.insert(wifiUsers).values(wifiUser).returning();
    return created;
  }

  async updateWifiUser(id: string, data: Partial<InsertWifiUser>): Promise<WifiUser | undefined> {
    const [updated] = await db.update(wifiUsers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(wifiUsers.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteWifiUser(id: string): Promise<boolean> {
    const result = await db.delete(wifiUsers).where(eq(wifiUsers.id, id)).returning();
    return result.length > 0;
  }

  async getExpiringWifiUsers(tenantId: string, daysAhead: number): Promise<WifiUser[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    return db.select().from(wifiUsers)
      .where(and(
        eq(wifiUsers.tenantId, tenantId),
        eq(wifiUsers.status, "ACTIVE"),
        gte(wifiUsers.expiryTime, now),
        lte(wifiUsers.expiryTime, futureDate)
      ))
      .orderBy(wifiUsers.expiryTime);
  }

  // Ticket operations
  async getTickets(tenantId: string): Promise<Ticket[]> {
    return db.select().from(tickets)
      .where(eq(tickets.tenantId, tenantId))
      .orderBy(desc(tickets.createdAt));
  }

  async getTicket(id: string): Promise<Ticket | undefined> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    return ticket || undefined;
  }

  async getTicketsByWifiUser(wifiUserId: string): Promise<Ticket[]> {
    return db.select().from(tickets)
      .where(eq(tickets.wifiUserId, wifiUserId))
      .orderBy(desc(tickets.createdAt));
  }

  async getOpenTickets(tenantId: string): Promise<Ticket[]> {
    return db.select().from(tickets)
      .where(and(
        eq(tickets.tenantId, tenantId),
        sql`${tickets.status} IN ('OPEN', 'IN_PROGRESS')`
      ))
      .orderBy(desc(tickets.createdAt));
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const [created] = await db.insert(tickets).values(ticket).returning();
    return created;
  }

  async updateTicket(id: string, data: Partial<InsertTicket>): Promise<Ticket | undefined> {
    const [updated] = await db.update(tickets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tickets.id, id))
      .returning();
    return updated || undefined;
  }

  async closeTicket(id: string, resolutionNotes: string): Promise<Ticket | undefined> {
    const [updated] = await db.update(tickets)
      .set({ 
        status: "CLOSED", 
        resolutionNotes, 
        closedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(tickets.id, id))
      .returning();
    return updated || undefined;
  }

  // Dashboard stats
  async getDashboardStats(tenantId: string) {
    const allTransactions = await this.getTransactions(tenantId);
    const activeHotspotsList = await db.select().from(hotspots)
      .where(and(eq(hotspots.tenantId, tenantId), eq(hotspots.isActive, true)));
    const recentTransactionsList = await this.getRecentTransactions(tenantId, 5);
    
    const activeWifiUsersList = await db.select().from(wifiUsers)
      .where(and(eq(wifiUsers.tenantId, tenantId), eq(wifiUsers.status, "ACTIVE")));
    const openTicketsList = await this.getOpenTickets(tenantId);
    const expiringUsersList = await this.getExpiringWifiUsers(tenantId, 5);

    const successfulTransactions = allTransactions.filter(t => t.status === "COMPLETED");
    const pendingTransactions = allTransactions.filter(t => t.status === "PENDING");
    const failedTransactions = allTransactions.filter(t => t.status === "FAILED");

    const totalRevenue = successfulTransactions.reduce((sum, t) => sum + t.amount, 0);

    return {
      totalRevenue,
      totalTransactions: allTransactions.length,
      successfulTransactions: successfulTransactions.length,
      pendingTransactions: pendingTransactions.length,
      failedTransactions: failedTransactions.length,
      activeHotspots: activeHotspotsList.length,
      activeWifiUsers: activeWifiUsersList.length,
      openTickets: openTicketsList.length,
      expiringUsers: expiringUsersList,
      recentTransactions: recentTransactionsList,
    };
  }

  // Reconciliation Report
  async getReconciliationReport(tenantId: string, startDate?: Date, endDate?: Date) {
    let query = db.select().from(transactions)
      .where(eq(transactions.tenantId, tenantId));
    
    const allTransactions = await query.orderBy(desc(transactions.createdAt));
    
    const filtered = allTransactions.filter(t => {
      if (!t.createdAt) return true;
      const txDate = new Date(t.createdAt);
      if (startDate && txDate < startDate) return false;
      if (endDate && txDate > endDate) return false;
      return true;
    });

    const matched = filtered.filter(t => t.reconciliationStatus === "MATCHED");
    const unmatched = filtered.filter(t => t.reconciliationStatus === "UNMATCHED");
    const manualReview = filtered.filter(t => t.reconciliationStatus === "MANUAL_REVIEW");
    const pending = filtered.filter(t => t.reconciliationStatus === "PENDING");

    return {
      summary: {
        total: filtered.length,
        matched: matched.length,
        unmatched: unmatched.length,
        manualReview: manualReview.length,
        pending: pending.length,
        matchedAmount: matched.reduce((sum, t) => sum + t.amount, 0),
        unmatchedAmount: unmatched.reduce((sum, t) => sum + t.amount, 0),
      },
      transactions: {
        matched,
        unmatched,
        manualReview,
        pending,
      },
    };
  }

  // Financial Report
  async getFinancialReport(tenantId: string, startDate?: Date, endDate?: Date) {
    const allTransactions = await this.getTransactions(tenantId);
    
    const filtered = allTransactions.filter(t => {
      if (!t.createdAt) return true;
      const txDate = new Date(t.createdAt);
      if (startDate && txDate < startDate) return false;
      if (endDate && txDate > endDate) return false;
      return true;
    });

    const completed = filtered.filter(t => t.status === "COMPLETED");
    const failed = filtered.filter(t => t.status === "FAILED");
    const pending = filtered.filter(t => t.status === "PENDING");

    const dailyRevenue: Record<string, number> = {};
    const planRevenue: Record<string, { name: string; amount: number; count: number }> = {};

    for (const tx of completed) {
      const date = tx.createdAt ? new Date(tx.createdAt).toISOString().split("T")[0] : "unknown";
      dailyRevenue[date] = (dailyRevenue[date] || 0) + tx.amount;
      
      if (tx.planId) {
        if (!planRevenue[tx.planId]) {
          planRevenue[tx.planId] = { name: tx.planId, amount: 0, count: 0 };
        }
        planRevenue[tx.planId].amount += tx.amount;
        planRevenue[tx.planId].count += 1;
      }
    }

    return {
      summary: {
        totalRevenue: completed.reduce((sum, t) => sum + t.amount, 0),
        totalTransactions: filtered.length,
        successfulTransactions: completed.length,
        failedTransactions: failed.length,
        pendingTransactions: pending.length,
        averageTransactionValue: completed.length > 0 
          ? Math.round(completed.reduce((sum, t) => sum + t.amount, 0) / completed.length)
          : 0,
      },
      dailyRevenue: Object.entries(dailyRevenue)
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      planRevenue: Object.values(planRevenue)
        .sort((a, b) => b.amount - a.amount),
    };
  }

  // User Activity Report
  async getUserActivityReport(tenantId: string) {
    const allUsers = await this.getWifiUsers(tenantId);
    const now = new Date();
    
    const active = allUsers.filter(u => u.status === "ACTIVE");
    const expired = allUsers.filter(u => u.status === "EXPIRED");
    const suspended = allUsers.filter(u => u.status === "SUSPENDED");
    
    const expiringIn24h = allUsers.filter(u => {
      if (!u.expiryTime || u.status !== "ACTIVE") return false;
      const expiry = new Date(u.expiryTime);
      const diff = expiry.getTime() - now.getTime();
      return diff > 0 && diff <= 24 * 60 * 60 * 1000;
    });

    const expiringIn48h = allUsers.filter(u => {
      if (!u.expiryTime || u.status !== "ACTIVE") return false;
      const expiry = new Date(u.expiryTime);
      const diff = expiry.getTime() - now.getTime();
      return diff > 24 * 60 * 60 * 1000 && diff <= 48 * 60 * 60 * 1000;
    });

    const expiringIn5Days = allUsers.filter(u => {
      if (!u.expiryTime || u.status !== "ACTIVE") return false;
      const expiry = new Date(u.expiryTime);
      const diff = expiry.getTime() - now.getTime();
      return diff > 0 && diff <= 5 * 24 * 60 * 60 * 1000;
    });

    const byAccountType = {
      hotspot: allUsers.filter(u => u.accountType === "HOTSPOT").length,
      pppoe: allUsers.filter(u => u.accountType === "PPPOE").length,
      static: allUsers.filter(u => u.accountType === "STATIC").length,
    };

    return {
      summary: {
        total: allUsers.length,
        active: active.length,
        expired: expired.length,
        suspended: suspended.length,
        expiringIn24h: expiringIn24h.length,
        expiringIn48h: expiringIn48h.length,
        expiringIn5Days: expiringIn5Days.length,
      },
      byAccountType,
      expiringUsers: {
        next24h: expiringIn24h,
        next48h: expiringIn48h,
        next5Days: expiringIn5Days,
      },
    };
  }

  // Transactions by date range
  async getTransactionsByDateRange(tenantId: string, startDate: Date, endDate: Date): Promise<Transaction[]> {
    return db.select().from(transactions)
      .where(and(
        eq(transactions.tenantId, tenantId),
        gte(transactions.createdAt, startDate),
        lte(transactions.createdAt, endDate)
      ))
      .orderBy(desc(transactions.createdAt));
  }

  // Update tenant SaaS billing status
  async updateTenantBillingStatus(id: string, status: string): Promise<Tenant | undefined> {
    const [updated] = await db.update(tenants)
      .set({ saasBillingStatus: status })
      .where(eq(tenants.id, id))
      .returning();
    return updated || undefined;
  }

  // Mark all expired users as EXPIRED status
  async markExpiredUsers(): Promise<number> {
    const now = new Date();
    const result = await db.update(wifiUsers)
      .set({ status: "EXPIRED", updatedAt: now })
      .where(and(
        eq(wifiUsers.status, "ACTIVE"),
        lte(wifiUsers.expiryTime, now)
      ))
      .returning();
    return result.length;
  }

  // Mark stale pending transactions as failed (older than 5 minutes)
  async markStaleTransactionsAsFailed(): Promise<number> {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const result = await db.update(transactions)
      .set({ 
        status: "FAILED", 
        statusDescription: "Transaction timed out",
        reconciliationStatus: "UNMATCHED",
        updatedAt: now 
      })
      .where(and(
        eq(transactions.status, "PENDING"),
        lte(transactions.createdAt, fiveMinutesAgo)
      ))
      .returning();
    return result.length;
  }

  // ============== SUPER ADMIN METHODS ==============

  // Get all tenants with enhanced stats
  async getAllTenantsWithStats(): Promise<(Tenant & { 
    userCount: number; 
    transactionCount: number;
    revenueThisMonth: number;
  })[]> {
    const allTenants = await db.select().from(tenants).orderBy(desc(tenants.createdAt));
    
    const tenantsWithStats = await Promise.all(allTenants.map(async (tenant) => {
      const userCount = await db.select({ count: sql<number>`count(*)` })
        .from(wifiUsers)
        .where(eq(wifiUsers.tenantId, tenant.id));
      
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const monthlyTransactions = await db.select({
        count: sql<number>`count(*)`,
        revenue: sql<number>`COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN amount ELSE 0 END), 0)`
      })
        .from(transactions)
        .where(and(
          eq(transactions.tenantId, tenant.id),
          gte(transactions.createdAt, startOfMonth)
        ));

      return {
        ...tenant,
        userCount: Number(userCount[0]?.count || 0),
        transactionCount: Number(monthlyTransactions[0]?.count || 0),
        revenueThisMonth: Number(monthlyTransactions[0]?.revenue || 0),
      };
    }));

    return tenantsWithStats;
  }

  // Get platform-wide analytics for super admin
  async getPlatformAnalytics(): Promise<{
    totalTenants: number;
    activeTenants: number;
    trialTenants: number;
    suspendedTenants: number;
    totalUsers: number;
    totalRevenue: number;
    revenueThisMonth: number;
    revenueLastMonth: number;
    transactionsToday: number;
    newTenantsThisMonth: number;
  }> {
    const allTenants = await db.select().from(tenants);
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(wifiUsers);
    
    const allTimeRevenue = await db.select({ 
      total: sql<number>`COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN amount ELSE 0 END), 0)` 
    }).from(transactions);

    const thisMonthRevenue = await db.select({ 
      total: sql<number>`COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN amount ELSE 0 END), 0)` 
    }).from(transactions).where(gte(transactions.createdAt, startOfMonth));

    const lastMonthRevenue = await db.select({ 
      total: sql<number>`COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN amount ELSE 0 END), 0)` 
    }).from(transactions).where(and(
      gte(transactions.createdAt, startOfLastMonth),
      lte(transactions.createdAt, endOfLastMonth)
    ));

    const todayTransactions = await db.select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(gte(transactions.createdAt, startOfToday));

    const newTenantsThisMonth = allTenants.filter(t => 
      t.createdAt && t.createdAt >= startOfMonth
    ).length;

    return {
      totalTenants: allTenants.length,
      activeTenants: allTenants.filter(t => t.saasBillingStatus === 'ACTIVE').length,
      trialTenants: allTenants.filter(t => t.saasBillingStatus === 'TRIAL').length,
      suspendedTenants: allTenants.filter(t => t.saasBillingStatus === 'SUSPENDED' || t.saasBillingStatus === 'BLOCKED').length,
      totalUsers: Number(totalUsers[0]?.count || 0),
      totalRevenue: Number(allTimeRevenue[0]?.total || 0),
      revenueThisMonth: Number(thisMonthRevenue[0]?.total || 0),
      revenueLastMonth: Number(lastMonthRevenue[0]?.total || 0),
      transactionsToday: Number(todayTransactions[0]?.count || 0),
      newTenantsThisMonth,
    };
  }

  // Update tenant tier and subscription
  async updateTenantSubscription(id: string, data: {
    tier?: string;
    saasBillingStatus?: string;
    trialExpiresAt?: Date | null;
    subscriptionExpiresAt?: Date | null;
  }): Promise<Tenant | undefined> {
    const [updated] = await db.update(tenants)
      .set(data as any)
      .where(eq(tenants.id, id))
      .returning();
    return updated || undefined;
  }

  // Get users by role
  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role));
  }

  // Get all users for a tenant
  async getUsersByTenant(tenantId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.tenantId, tenantId));
  }

  // Get customer details with transactions and stats
  async getCustomerDetails(customerId: string): Promise<{
    customer: WifiUser;
    currentPlan: Plan | null;
    currentHotspot: Hotspot | null;
    transactions: (Transaction & { planName: string | null })[];
    stats: {
      totalSpent: number;
      totalTransactions: number;
      successfulPayments: number;
      failedPayments: number;
      daysSinceRegistration: number;
      averagePayment: number;
    };
  } | null> {
    const customer = await this.getWifiUser(customerId);
    if (!customer) {
      return null;
    }

    let currentPlan: Plan | null = null;
    if (customer.currentPlanId) {
      currentPlan = await this.getPlan(customer.currentPlanId) || null;
    }

    let currentHotspot: Hotspot | null = null;
    if (customer.currentHotspotId) {
      currentHotspot = await this.getHotspot(customer.currentHotspotId) || null;
    }

    const customerTransactions = await db.select()
      .from(transactions)
      .where(eq(transactions.userPhone, customer.phoneNumber))
      .orderBy(desc(transactions.createdAt));

    const allPlans = await this.getPlans(customer.tenantId);
    const plansMap = new Map(allPlans.map(p => [p.id, p]));

    const transactionsWithPlanNames = customerTransactions.map(tx => ({
      ...tx,
      planName: tx.planId ? plansMap.get(tx.planId)?.name || null : null,
    }));

    const completedTransactions = customerTransactions.filter(t => t.status === "COMPLETED");
    const failedTransactions = customerTransactions.filter(t => t.status === "FAILED");
    const totalSpent = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    const daysSinceRegistration = customer.createdAt 
      ? Math.floor((Date.now() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      customer,
      currentPlan,
      currentHotspot,
      transactions: transactionsWithPlanNames,
      stats: {
        totalSpent,
        totalTransactions: customerTransactions.length,
        successfulPayments: completedTransactions.length,
        failedPayments: failedTransactions.length,
        daysSinceRegistration,
        averagePayment: completedTransactions.length > 0 
          ? Math.round(totalSpent / completedTransactions.length) 
          : 0,
      },
    };
  }

  // Check if any superadmin exists
  async hasSuperAdmin(): Promise<boolean> {
    const superadmins = await db.select()
      .from(users)
      .where(eq(users.role, "superadmin"));
    return superadmins.length > 0;
  }

  // Mark expired ISP trials as suspended
  async markExpiredTrials(): Promise<number> {
    const now = new Date();
    const result = await db.update(tenants)
      .set({ 
        saasBillingStatus: "SUSPENDED",
        tier: "EXPIRED_TRIAL",
        trialExpiresAt: null,
      })
      .where(and(
        eq(tenants.saasBillingStatus, "TRIAL"),
        lte(tenants.trialExpiresAt, now)
      ))
      .returning();
    return result.length;
  }

  // Get tenants with expiring trials
  async getExpiringTrials(hoursAhead: number = 24): Promise<Tenant[]> {
    const now = new Date();
    const futureTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
    return db.select()
      .from(tenants)
      .where(and(
        eq(tenants.saasBillingStatus, "TRIAL"),
        gte(tenants.trialExpiresAt, now),
        lte(tenants.trialExpiresAt, futureTime)
      ));
  }

  // SMS Campaign operations
  async getSmsCampaigns(tenantId: string): Promise<SmsCampaign[]> {
    return db.select()
      .from(smsCampaigns)
      .where(eq(smsCampaigns.tenantId, tenantId))
      .orderBy(desc(smsCampaigns.createdAt));
  }

  async createSmsCampaign(campaign: InsertSmsCampaign): Promise<SmsCampaign> {
    const [created] = await db.insert(smsCampaigns).values(campaign as any).returning();
    return created;
  }

  async updateSmsCampaign(id: string, data: Partial<InsertSmsCampaign>): Promise<SmsCampaign | undefined> {
    const [updated] = await db.update(smsCampaigns).set(data as any).where(eq(smsCampaigns.id, id)).returning();
    return updated || undefined;
  }

  // Safe update method that only allows updating status-related fields
  async updateSmsCampaignStatus(id: string, sentCount: number, failedCount: number): Promise<SmsCampaign | undefined> {
    const status = failedCount > 0 && sentCount === 0 ? "failed" : "completed";
    const [updated] = await db.update(smsCampaigns)
      .set({ 
        sentCount, 
        failedCount, 
        status 
      } as any)
      .where(eq(smsCampaigns.id, id))
      .returning();
    return updated || undefined;
  }

  // Get WiFi users by IDs
  async getWifiUsersByIds(tenantId: string, ids: string[]): Promise<WifiUser[]> {
    if (ids.length === 0) return [];
    return db.select()
      .from(wifiUsers)
      .where(and(
        eq(wifiUsers.tenantId, tenantId),
        inArray(wifiUsers.id, ids)
      ));
  }

  // ============== WALLET OPERATIONS ==============

  async getWallet(wifiUserId: string): Promise<Wallet | undefined> {
    const [wallet] = await db.select()
      .from(wallets)
      .where(eq(wallets.wifiUserId, wifiUserId));
    return wallet || undefined;
  }

  async getWalletByTenantAndUser(tenantId: string, wifiUserId: string): Promise<Wallet | undefined> {
    const [wallet] = await db.select()
      .from(wallets)
      .where(and(
        eq(wallets.tenantId, tenantId),
        eq(wallets.wifiUserId, wifiUserId)
      ));
    return wallet || undefined;
  }

  async createWallet(wallet: InsertWallet): Promise<Wallet> {
    const [created] = await db.insert(wallets).values(wallet as any).returning();
    return created;
  }

  async getOrCreateWallet(tenantId: string, wifiUserId: string): Promise<Wallet> {
    let wallet = await this.getWalletByTenantAndUser(tenantId, wifiUserId);
    if (!wallet) {
      wallet = await this.createWallet({
        tenantId,
        wifiUserId,
        balance: 0,
        totalDeposited: 0,
        totalSpent: 0,
        isActive: true,
      });
    }
    return wallet;
  }

  async updateWalletBalance(walletId: string, newBalance: number): Promise<Wallet | undefined> {
    const [updated] = await db.update(wallets)
      .set({ 
        balance: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(wallets.id, walletId))
      .returning();
    return updated || undefined;
  }

  async addWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction> {
    const [created] = await db.insert(walletTransactions).values(transaction as any).returning();
    return created;
  }

  async getWalletTransactions(walletId: string, limit: number = 50): Promise<WalletTransaction[]> {
    return db.select()
      .from(walletTransactions)
      .where(eq(walletTransactions.walletId, walletId))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(limit);
  }

  async depositToWallet(
    tenantId: string, 
    wifiUserId: string, 
    amount: number, 
    description: string,
    referenceId?: string,
    referenceType?: string
  ): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
    const wallet = await this.getOrCreateWallet(tenantId, wifiUserId);
    const newBalance = wallet.balance + amount;
    
    await db.update(wallets)
      .set({
        balance: newBalance,
        totalDeposited: wallet.totalDeposited + amount,
        updatedAt: new Date(),
      })
      .where(eq(wallets.id, wallet.id));

    const transaction = await this.addWalletTransaction({
      walletId: wallet.id,
      tenantId,
      type: WalletTransactionType.DEPOSIT,
      amount,
      balanceAfter: newBalance,
      description,
      referenceId,
      referenceType,
    });

    const updatedWallet = await this.getWallet(wifiUserId);
    return { wallet: updatedWallet!, transaction };
  }

  async deductFromWallet(
    tenantId: string,
    wifiUserId: string,
    amount: number,
    description: string,
    referenceId?: string,
    referenceType?: string
  ): Promise<{ success: boolean; wallet?: Wallet; transaction?: WalletTransaction; error?: string }> {
    const wallet = await this.getWalletByTenantAndUser(tenantId, wifiUserId);
    
    if (!wallet) {
      return { success: false, error: "Wallet not found" };
    }

    if (wallet.balance < amount) {
      return { success: false, error: "Insufficient wallet balance" };
    }

    const newBalance = wallet.balance - amount;
    
    await db.update(wallets)
      .set({
        balance: newBalance,
        totalSpent: wallet.totalSpent + amount,
        updatedAt: new Date(),
      })
      .where(eq(wallets.id, wallet.id));

    const transaction = await this.addWalletTransaction({
      walletId: wallet.id,
      tenantId,
      type: WalletTransactionType.PAYMENT,
      amount: -amount,
      balanceAfter: newBalance,
      description,
      referenceId,
      referenceType,
    });

    const updatedWallet = await this.getWallet(wifiUserId);
    return { success: true, wallet: updatedWallet, transaction };
  }

  async creditExcessToWallet(
    tenantId: string,
    wifiUserId: string,
    amount: number,
    description: string,
    referenceId?: string
  ): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
    const wallet = await this.getOrCreateWallet(tenantId, wifiUserId);
    const newBalance = wallet.balance + amount;
    
    await db.update(wallets)
      .set({
        balance: newBalance,
        totalDeposited: wallet.totalDeposited + amount,
        updatedAt: new Date(),
      })
      .where(eq(wallets.id, wallet.id));

    const transaction = await this.addWalletTransaction({
      walletId: wallet.id,
      tenantId,
      type: WalletTransactionType.EXCESS,
      amount,
      balanceAfter: newBalance,
      description,
      referenceId,
      referenceType: "transaction",
    });

    const updatedWallet = await this.getWallet(wifiUserId);
    return { wallet: updatedWallet!, transaction };
  }

  async getWalletsByTenant(tenantId: string): Promise<Wallet[]> {
    return db.select()
      .from(wallets)
      .where(eq(wallets.tenantId, tenantId))
      .orderBy(desc(wallets.balance));
  }

  // Voucher operations
  async getVouchers(tenantId: string): Promise<Voucher[]> {
    return db.select()
      .from(vouchers)
      .where(eq(vouchers.tenantId, tenantId))
      .orderBy(desc(vouchers.createdAt));
  }

  async getVoucher(id: string): Promise<Voucher | undefined> {
    const [voucher] = await db.select().from(vouchers).where(eq(vouchers.id, id));
    return voucher || undefined;
  }

  async getVoucherByCode(tenantId: string, code: string): Promise<Voucher | undefined> {
    const [voucher] = await db.select()
      .from(vouchers)
      .where(and(eq(vouchers.tenantId, tenantId), eq(vouchers.code, code)));
    return voucher || undefined;
  }

  async createVoucher(voucher: InsertVoucher): Promise<Voucher> {
    const [created] = await db.insert(vouchers).values(voucher).returning();
    return created;
  }

  async createVoucherBatch(batch: InsertVoucherBatch, voucherCodes: string[]): Promise<{ batch: VoucherBatch; vouchers: Voucher[] }> {
    const [createdBatch] = await db.insert(voucherBatches).values(batch).returning();
    
    const voucherInserts: InsertVoucher[] = voucherCodes.map(code => ({
      tenantId: batch.tenantId,
      batchId: createdBatch.id,
      planId: batch.planId,
      code,
      status: VoucherStatus.AVAILABLE,
      validFrom: batch.validFrom,
      validUntil: batch.validUntil,
    }));

    const createdVouchers = await db.insert(vouchers).values(voucherInserts).returning();
    return { batch: createdBatch, vouchers: createdVouchers };
  }

  async updateVoucher(id: string, data: Partial<InsertVoucher>): Promise<Voucher | undefined> {
    const [updated] = await db.update(vouchers).set(data).where(eq(vouchers.id, id)).returning();
    return updated || undefined;
  }

  async redeemVoucher(id: string, wifiUserId: string, macAddress?: string): Promise<Voucher | undefined> {
    const voucher = await this.getVoucher(id);
    if (!voucher || voucher.status !== VoucherStatus.AVAILABLE) {
      return undefined;
    }

    const plan = await this.getPlan(voucher.planId);
    if (!plan) {
      return undefined;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + plan.durationSeconds * 1000);

    const [updated] = await db.update(vouchers)
      .set({
        status: VoucherStatus.USED,
        usedBy: wifiUserId,
        usedAt: now,
        macAddress,
        expiresAt,
      })
      .where(eq(vouchers.id, id))
      .returning();

    if (updated && updated.batchId) {
      await db.update(voucherBatches)
        .set({ usedCount: sql`${voucherBatches.usedCount} + 1` })
        .where(eq(voucherBatches.id, updated.batchId));
    }

    return updated || undefined;
  }

  async getVoucherBatches(tenantId: string): Promise<VoucherBatch[]> {
    return db.select()
      .from(voucherBatches)
      .where(eq(voucherBatches.tenantId, tenantId))
      .orderBy(desc(voucherBatches.createdAt));
  }

  async getVoucherBatch(id: string): Promise<VoucherBatch | undefined> {
    const [batch] = await db.select().from(voucherBatches).where(eq(voucherBatches.id, id));
    return batch || undefined;
  }

  async getVouchersByBatch(batchId: string): Promise<Voucher[]> {
    return db.select()
      .from(vouchers)
      .where(eq(vouchers.batchId, batchId))
      .orderBy(vouchers.code);
  }

  async getVouchersByPhone(tenantId: string, phoneNumber: string): Promise<(Voucher & { planName?: string })[]> {
    const wifiUser = await db.select().from(wifiUsers)
      .where(and(
        eq(wifiUsers.tenantId, tenantId),
        eq(wifiUsers.phoneNumber, phoneNumber)
      ))
      .limit(1);
    
    if (!wifiUser.length) {
      return [];
    }

    const userVouchers = await db.select({
      id: vouchers.id,
      tenantId: vouchers.tenantId,
      batchId: vouchers.batchId,
      planId: vouchers.planId,
      code: vouchers.code,
      status: vouchers.status,
      usedBy: vouchers.usedBy,
      usedAt: vouchers.usedAt,
      macAddress: vouchers.macAddress,
      expiresAt: vouchers.expiresAt,
      validFrom: vouchers.validFrom,
      validUntil: vouchers.validUntil,
      createdAt: vouchers.createdAt,
      planName: plans.name,
    })
      .from(vouchers)
      .leftJoin(plans, eq(vouchers.planId, plans.id))
      .where(and(
        eq(vouchers.tenantId, tenantId),
        eq(vouchers.usedBy, wifiUser[0].id)
      ))
      .orderBy(desc(vouchers.usedAt));

    return userVouchers.map(v => ({
      ...v,
      planName: v.planName ?? undefined,
    }));
  }

  async deleteVoucher(id: string): Promise<boolean> {
    const result = await db.delete(vouchers).where(eq(vouchers.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
