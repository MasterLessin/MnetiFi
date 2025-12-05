import { 
  tenants, hotspots, plans, transactions, walledGardens, users, wifiUsers, tickets,
  type Tenant, type InsertTenant,
  type Hotspot, type InsertHotspot,
  type Plan, type InsertPlan,
  type Transaction, type InsertTransaction,
  type WalledGarden, type InsertWalledGarden,
  type User, type InsertUser,
  type WifiUser, type InsertWifiUser,
  type Ticket, type InsertTicket,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

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
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser & { resetToken?: string | null; resetTokenExpiry?: Date | null }>): Promise<User | undefined>;
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

  async updateUser(id: string, data: Partial<InsertUser & { resetToken?: string | null; resetTokenExpiry?: Date | null }>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data as any).where(eq(users.id, id)).returning();
    return updated || undefined;
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
}

export const storage = new DatabaseStorage();
