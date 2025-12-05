import type { Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { 
  insertPlanSchema, 
  insertHotspotSchema, 
  insertTransactionSchema,
  insertWalledGardenSchema,
  insertTenantSchema,
  insertWifiUserSchema,
  insertTicketSchema,
  ReconciliationStatus,
  TransactionStatus,
  UserRole,
  type UserRoleValue,
} from "@shared/schema";
import { z } from "zod";
import { jobQueue } from "./services/job-queue";
import { paymentWorker } from "./services/payment-worker";
import { 
  requireAuth, 
  requireSuperAdmin, 
  requireAdmin, 
  requireTech,
  requireTenantAccess,
  type AuthenticatedRequest 
} from "./middleware/rbac";

// Password hashing utility
const SALT_ROUNDS = 10;
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Default tenant ID for demo (in production, this would come from auth/subdomain)
let defaultTenantId: string = "";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Health check endpoint for Render.com
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // Initialize default tenant if not exists
  defaultTenantId = await initializeDefaultTenant();

  // ============== AUTHENTICATION ROUTES ==============
  
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // Support both hashed and legacy plaintext passwords for backward compatibility
      let passwordValid = false;
      if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
        // Password is hashed
        passwordValid = await verifyPassword(password, user.password);
      } else {
        // Legacy plaintext password - migrate to hashed on successful login
        passwordValid = user.password === password;
        if (passwordValid) {
          const hashedPassword = await hashPassword(password);
          await storage.updateUser(user.id, { password: hashedPassword });
          console.log(`[Auth] Migrated password to bcrypt for user: ${username}`);
        }
      }

      if (!passwordValid) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: "Account is disabled" });
      }

      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role as UserRoleValue,
        tenantId: user.tenantId,
        email: user.email,
      };

      res.json({
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email,
          tenantId: user.tenantId,
        },
      });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ error: "Failed to authenticate" });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.session?.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json({ user: req.session.user });
  });

  app.post("/api/auth/logout", async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Registration endpoint for new ISPs
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { businessName, subdomain, username, email, password } = req.body;
      
      if (!businessName || !subdomain || !username || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
      }

      // Check if subdomain already exists
      const existingTenant = await storage.getTenantBySubdomain(subdomain);
      if (existingTenant) {
        return res.status(409).json({ error: "Subdomain already taken" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ error: "Username already taken" });
      }

      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ error: "Email already registered" });
      }

      // Create the tenant (ISP)
      const tenant = await storage.createTenant({
        name: businessName,
        subdomain: subdomain.toLowerCase(),
        saasBillingStatus: "TRIAL", // 24-hour free trial
        isActive: true,
      });

      // Hash password and create the admin user for this tenant
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        tenantId: tenant.id,
        username,
        password: hashedPassword,
        email,
        role: "admin",
      });

      res.status(201).json({
        message: "Account created successfully",
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
        },
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      });
    } catch (error) {
      console.error("Error during registration:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  // Forgot password endpoint
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      
      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ message: "If the email exists, a reset link has been sent" });
      }

      // Generate a reset token
      const resetToken = crypto.randomUUID();
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await storage.updateUser(user.id, {
        resetToken,
        resetTokenExpiry,
      });

      // In production, send an email with the reset link
      // For now, just log it
      console.log(`[Auth] Password reset requested for ${email}`);
      console.log(`[Auth] Reset token: ${resetToken}`);
      console.log(`[Auth] Reset link: /reset-password?token=${resetToken}`);

      res.json({ message: "If the email exists, a reset link has been sent" });
    } catch (error) {
      console.error("Error during password reset request:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  // Reset password endpoint
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      const user = await storage.getUserByResetToken(token);
      
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      if (user.resetTokenExpiry && new Date(user.resetTokenExpiry) < new Date()) {
        return res.status(400).json({ error: "Reset token has expired" });
      }

      // Hash the new password and update user, clear reset token
      const hashedNewPassword = await hashPassword(newPassword);
      await storage.updateUser(user.id, {
        password: hashedNewPassword,
        resetToken: null,
        resetTokenExpiry: null,
      });

      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Error during password reset:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Super Admin Registration endpoint (requires setup key from environment)
  app.post("/api/auth/register-superadmin", async (req, res) => {
    try {
      const { username, email, password, setupKey } = req.body;
      
      if (!username || !email || !password || !setupKey) {
        return res.status(400).json({ error: "All fields are required" });
      }

      // Verify setup key from environment - fail if not configured
      const SUPERADMIN_SETUP_KEY = process.env.SUPERADMIN_SETUP_KEY;
      if (!SUPERADMIN_SETUP_KEY) {
        console.error("[Auth] SUPERADMIN_SETUP_KEY environment variable is not configured");
        return res.status(503).json({ error: "Super admin registration is not configured on this server" });
      }

      if (setupKey !== SUPERADMIN_SETUP_KEY) {
        return res.status(403).json({ error: "Invalid setup key" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ error: "Username already taken" });
      }

      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ error: "Email already registered" });
      }

      // Hash password and create the super admin user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email,
        role: "superadmin",
        isActive: true,
      });

      console.log(`[Auth] Super admin created: ${username}`);

      res.status(201).json({
        message: "Super admin account created successfully",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Error during super admin registration:", error);
      res.status(500).json({ error: "Failed to create super admin account" });
    }
  });

  // Start the payment worker for background job processing
  paymentWorker.start();
  console.log("[Server] Payment worker started");

  // ============== TENANT ROUTES ==============
  
  app.get("/api/tenant", async (req, res) => {
    try {
      const tenant = await storage.getTenant(defaultTenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error) {
      console.error("Error fetching tenant:", error);
      res.status(500).json({ error: "Failed to fetch tenant" });
    }
  });

  app.patch("/api/tenant", async (req, res) => {
    try {
      const tenant = await storage.updateTenant(defaultTenantId, req.body);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error) {
      console.error("Error updating tenant:", error);
      res.status(500).json({ error: "Failed to update tenant" });
    }
  });

  // ============== DASHBOARD ROUTES ==============
  
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats(defaultTenantId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // ============== PLAN ROUTES ==============
  
  app.get("/api/plans", async (req, res) => {
    try {
      const plans = await storage.getPlans(defaultTenantId);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  });

  app.get("/api/plans/:id", async (req, res) => {
    try {
      const plan = await storage.getPlan(req.params.id);
      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }
      res.json(plan);
    } catch (error) {
      console.error("Error fetching plan:", error);
      res.status(500).json({ error: "Failed to fetch plan" });
    }
  });

  app.post("/api/plans", async (req, res) => {
    try {
      const data = insertPlanSchema.parse({
        ...req.body,
        tenantId: defaultTenantId,
      });
      const plan = await storage.createPlan(data);
      res.status(201).json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating plan:", error);
      res.status(500).json({ error: "Failed to create plan" });
    }
  });

  app.patch("/api/plans/:id", async (req, res) => {
    try {
      const plan = await storage.updatePlan(req.params.id, req.body);
      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }
      res.json(plan);
    } catch (error) {
      console.error("Error updating plan:", error);
      res.status(500).json({ error: "Failed to update plan" });
    }
  });

  app.delete("/api/plans/:id", async (req, res) => {
    try {
      const deleted = await storage.deletePlan(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Plan not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting plan:", error);
      res.status(500).json({ error: "Failed to delete plan" });
    }
  });

  // ============== HOTSPOT ROUTES ==============
  
  app.get("/api/hotspots", async (req, res) => {
    try {
      const hotspots = await storage.getHotspots(defaultTenantId);
      res.json(hotspots);
    } catch (error) {
      console.error("Error fetching hotspots:", error);
      res.status(500).json({ error: "Failed to fetch hotspots" });
    }
  });

  app.get("/api/hotspots/:id", async (req, res) => {
    try {
      const hotspot = await storage.getHotspot(req.params.id);
      if (!hotspot) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      res.json(hotspot);
    } catch (error) {
      console.error("Error fetching hotspot:", error);
      res.status(500).json({ error: "Failed to fetch hotspot" });
    }
  });

  app.post("/api/hotspots", async (req, res) => {
    try {
      const data = insertHotspotSchema.parse({
        ...req.body,
        tenantId: defaultTenantId,
      });
      const hotspot = await storage.createHotspot(data);
      res.status(201).json(hotspot);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating hotspot:", error);
      res.status(500).json({ error: "Failed to create hotspot" });
    }
  });

  app.patch("/api/hotspots/:id", async (req, res) => {
    try {
      const hotspot = await storage.updateHotspot(req.params.id, req.body);
      if (!hotspot) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      res.json(hotspot);
    } catch (error) {
      console.error("Error updating hotspot:", error);
      res.status(500).json({ error: "Failed to update hotspot" });
    }
  });

  app.delete("/api/hotspots/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteHotspot(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting hotspot:", error);
      res.status(500).json({ error: "Failed to delete hotspot" });
    }
  });

  // ============== TRANSACTION ROUTES ==============
  
  app.get("/api/transactions", async (req, res) => {
    try {
      const transactions = await storage.getTransactions(defaultTenantId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.get("/api/transactions/:id", async (req, res) => {
    try {
      const transaction = await storage.getTransaction(req.params.id);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      console.error("Error fetching transaction:", error);
      res.status(500).json({ error: "Failed to fetch transaction" });
    }
  });

  // Initiate payment (STK Push with resilient job queue)
  app.post("/api/transactions/initiate", async (req, res) => {
    try {
      const { planId, phone, macAddress, nasIp } = req.body;
      
      if (!planId || !phone) {
        return res.status(400).json({ error: "Plan ID and phone number are required" });
      }

      const plan = await storage.getPlan(planId);
      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      const checkoutRequestId = `ws_CO_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const merchantRequestId = `MR_${Date.now()}`;

      const transaction = await storage.createTransaction({
        tenantId: defaultTenantId,
        planId,
        userPhone: phone,
        amount: plan.price,
        checkoutRequestId,
        merchantRequestId,
        status: TransactionStatus.PENDING,
        reconciliationStatus: ReconciliationStatus.PENDING,
        statusDescription: "Awaiting M-Pesa confirmation",
        macAddress: macAddress || null,
        nasIp: nasIp || null,
      });

      await jobQueue.schedulePaymentCheck(
        defaultTenantId,
        transaction.id,
        checkoutRequestId,
        10
      );

      console.log(`[Payment] Initiated STK Push for ${phone}, scheduled status check job`);

      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error initiating transaction:", error);
      res.status(500).json({ error: "Failed to initiate transaction" });
    }
  });

  // M-Pesa callback webhook (simulation)
  app.post("/api/transactions/callback", async (req, res) => {
    try {
      const { Body } = req.body;
      
      if (!Body?.stkCallback) {
        return res.status(400).json({ error: "Invalid callback format" });
      }

      const { CheckoutRequestID, ResultCode, ResultDesc } = Body.stkCallback;

      const transaction = await storage.getTransactionByCheckoutRequestId(CheckoutRequestID);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      if (ResultCode === 0) {
        // Extract receipt number from callback items
        const callbackMetadata = Body.stkCallback.CallbackMetadata?.Item || [];
        const receiptItem = callbackMetadata.find((item: any) => item.Name === "MpesaReceiptNumber");
        const receiptNumber = receiptItem?.Value || `QK${Date.now().toString().slice(-10)}`;

        await storage.updateTransaction(transaction.id, {
          status: "COMPLETED",
          mpesaReceiptNumber: receiptNumber,
          statusDescription: "Payment received successfully",
        });
      } else {
        await storage.updateTransaction(transaction.id, {
          status: "FAILED",
          statusDescription: ResultDesc || "Payment failed",
        });
      }

      res.json({ ResultCode: 0, ResultDesc: "Callback received" });
    } catch (error) {
      console.error("Error processing callback:", error);
      res.status(500).json({ error: "Failed to process callback" });
    }
  });

  // ============== WALLED GARDEN ROUTES ==============
  
  app.get("/api/walled-gardens", async (req, res) => {
    try {
      const walledGardens = await storage.getWalledGardens(defaultTenantId);
      res.json(walledGardens);
    } catch (error) {
      console.error("Error fetching walled gardens:", error);
      res.status(500).json({ error: "Failed to fetch walled gardens" });
    }
  });

  app.post("/api/walled-gardens", async (req, res) => {
    try {
      const data = insertWalledGardenSchema.parse({
        ...req.body,
        tenantId: defaultTenantId,
      });
      const walledGarden = await storage.createWalledGarden(data);
      res.status(201).json(walledGarden);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating walled garden:", error);
      res.status(500).json({ error: "Failed to create walled garden" });
    }
  });

  app.delete("/api/walled-gardens/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteWalledGarden(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Walled garden entry not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting walled garden:", error);
      res.status(500).json({ error: "Failed to delete walled garden entry" });
    }
  });

  // ============== WIFI USER ROUTES ==============
  
  app.get("/api/wifi-users", async (req, res) => {
    try {
      const wifiUsers = await storage.getWifiUsers(defaultTenantId);
      res.json(wifiUsers);
    } catch (error) {
      console.error("Error fetching wifi users:", error);
      res.status(500).json({ error: "Failed to fetch wifi users" });
    }
  });

  app.get("/api/wifi-users/expiring", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 5;
      const expiringUsers = await storage.getExpiringWifiUsers(defaultTenantId, days);
      res.json(expiringUsers);
    } catch (error) {
      console.error("Error fetching expiring wifi users:", error);
      res.status(500).json({ error: "Failed to fetch expiring wifi users" });
    }
  });

  app.get("/api/wifi-users/:id", async (req, res) => {
    try {
      const wifiUser = await storage.getWifiUser(req.params.id);
      if (!wifiUser) {
        return res.status(404).json({ error: "Wifi user not found" });
      }
      res.json(wifiUser);
    } catch (error) {
      console.error("Error fetching wifi user:", error);
      res.status(500).json({ error: "Failed to fetch wifi user" });
    }
  });

  app.post("/api/wifi-users", async (req, res) => {
    try {
      const data = insertWifiUserSchema.parse({
        ...req.body,
        tenantId: defaultTenantId,
      });
      const wifiUser = await storage.createWifiUser(data);
      res.status(201).json(wifiUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating wifi user:", error);
      res.status(500).json({ error: "Failed to create wifi user" });
    }
  });

  app.patch("/api/wifi-users/:id", async (req, res) => {
    try {
      const wifiUser = await storage.updateWifiUser(req.params.id, req.body);
      if (!wifiUser) {
        return res.status(404).json({ error: "Wifi user not found" });
      }
      res.json(wifiUser);
    } catch (error) {
      console.error("Error updating wifi user:", error);
      res.status(500).json({ error: "Failed to update wifi user" });
    }
  });

  app.delete("/api/wifi-users/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteWifiUser(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Wifi user not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting wifi user:", error);
      res.status(500).json({ error: "Failed to delete wifi user" });
    }
  });

  // Get detailed customer information with payment history
  app.get("/api/wifi-users/:id/details", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.user?.tenantId || defaultTenantId;
      
      const details = await storage.getCustomerDetails(req.params.id);
      if (!details) {
        return res.status(404).json({ error: "Customer not found" });
      }

      // Verify the customer belongs to the current tenant (prevent cross-tenant access)
      if (details.customer.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json({
        id: details.customer.id,
        phoneNumber: details.customer.phoneNumber,
        email: details.customer.email,
        fullName: details.customer.fullName,
        accountType: details.customer.accountType,
        status: details.customer.status,
        macAddress: details.customer.macAddress,
        ipAddress: details.customer.ipAddress,
        username: details.customer.username,
        expiryTime: details.customer.expiryTime,
        notes: details.customer.notes,
        createdAt: details.customer.createdAt,
        updatedAt: details.customer.updatedAt,
        currentPlan: details.currentPlan ? {
          id: details.currentPlan.id,
          name: details.currentPlan.name,
          price: details.currentPlan.price,
          durationSeconds: details.currentPlan.durationSeconds,
          uploadLimit: details.currentPlan.uploadLimit,
          downloadLimit: details.currentPlan.downloadLimit,
        } : null,
        currentHotspot: details.currentHotspot ? {
          id: details.currentHotspot.id,
          locationName: details.currentHotspot.locationName,
          nasIp: details.currentHotspot.nasIp,
        } : null,
        transactions: details.transactions.map(tx => ({
          id: tx.id,
          amount: tx.amount,
          status: tx.status,
          mpesaReceiptNumber: tx.mpesaReceiptNumber,
          createdAt: tx.createdAt,
          planName: tx.planName,
        })),
        stats: details.stats,
      });
    } catch (error) {
      console.error("Error fetching customer details:", error);
      res.status(500).json({ error: "Failed to fetch customer details" });
    }
  });

  // Admin manual actions for WiFi users
  app.post("/api/wifi-users/:id/recharge", async (req, res) => {
    try {
      const { planId, durationSeconds } = req.body;
      const wifiUser = await storage.getWifiUser(req.params.id);
      if (!wifiUser) {
        return res.status(404).json({ error: "Wifi user not found" });
      }
      
      const plan = planId ? await storage.getPlan(planId) : null;
      const duration = durationSeconds || (plan?.durationSeconds || 3600);
      
      const now = new Date();
      const currentExpiry = wifiUser.expiryTime && new Date(wifiUser.expiryTime) > now 
        ? new Date(wifiUser.expiryTime) 
        : now;
      const newExpiry = new Date(currentExpiry.getTime() + duration * 1000);
      
      const updated = await storage.updateWifiUser(req.params.id, {
        currentPlanId: planId || wifiUser.currentPlanId,
        expiryTime: newExpiry,
        status: "ACTIVE",
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error recharging wifi user:", error);
      res.status(500).json({ error: "Failed to recharge wifi user" });
    }
  });

  app.post("/api/wifi-users/:id/suspend", async (req, res) => {
    try {
      const wifiUser = await storage.updateWifiUser(req.params.id, {
        status: "SUSPENDED",
      });
      if (!wifiUser) {
        return res.status(404).json({ error: "Wifi user not found" });
      }
      res.json(wifiUser);
    } catch (error) {
      console.error("Error suspending wifi user:", error);
      res.status(500).json({ error: "Failed to suspend wifi user" });
    }
  });

  app.post("/api/wifi-users/:id/activate", async (req, res) => {
    try {
      const wifiUser = await storage.updateWifiUser(req.params.id, {
        status: "ACTIVE",
      });
      if (!wifiUser) {
        return res.status(404).json({ error: "Wifi user not found" });
      }
      res.json(wifiUser);
    } catch (error) {
      console.error("Error activating wifi user:", error);
      res.status(500).json({ error: "Failed to activate wifi user" });
    }
  });

  app.post("/api/wifi-users/:id/change-hotspot", async (req, res) => {
    try {
      const { hotspotId } = req.body;
      if (!hotspotId) {
        return res.status(400).json({ error: "Hotspot ID is required" });
      }
      
      const hotspot = await storage.getHotspot(hotspotId);
      if (!hotspot) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      
      const wifiUser = await storage.updateWifiUser(req.params.id, {
        currentHotspotId: hotspotId,
      });
      if (!wifiUser) {
        return res.status(404).json({ error: "Wifi user not found" });
      }
      res.json(wifiUser);
    } catch (error) {
      console.error("Error changing hotspot for wifi user:", error);
      res.status(500).json({ error: "Failed to change hotspot" });
    }
  });

  // ============== TICKET ROUTES ==============
  
  app.get("/api/tickets", async (req, res) => {
    try {
      const { status } = req.query;
      let ticketsList;
      if (status === "open") {
        ticketsList = await storage.getOpenTickets(defaultTenantId);
      } else {
        ticketsList = await storage.getTickets(defaultTenantId);
      }
      res.json(ticketsList);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ error: "Failed to fetch tickets" });
    }
  });

  app.get("/api/tickets/:id", async (req, res) => {
    try {
      const ticket = await storage.getTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      res.json(ticket);
    } catch (error) {
      console.error("Error fetching ticket:", error);
      res.status(500).json({ error: "Failed to fetch ticket" });
    }
  });

  app.get("/api/wifi-users/:wifiUserId/tickets", async (req, res) => {
    try {
      const tickets = await storage.getTicketsByWifiUser(req.params.wifiUserId);
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching tickets for wifi user:", error);
      res.status(500).json({ error: "Failed to fetch tickets" });
    }
  });

  app.post("/api/tickets", async (req, res) => {
    try {
      const data = insertTicketSchema.parse({
        ...req.body,
        tenantId: defaultTenantId,
      });
      const ticket = await storage.createTicket(data);
      res.status(201).json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating ticket:", error);
      res.status(500).json({ error: "Failed to create ticket" });
    }
  });

  app.patch("/api/tickets/:id", async (req, res) => {
    try {
      const ticket = await storage.updateTicket(req.params.id, req.body);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      res.json(ticket);
    } catch (error) {
      console.error("Error updating ticket:", error);
      res.status(500).json({ error: "Failed to update ticket" });
    }
  });

  app.post("/api/tickets/:id/close", async (req, res) => {
    try {
      const { resolutionNotes } = req.body;
      const ticket = await storage.closeTicket(req.params.id, resolutionNotes || "");
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      res.json(ticket);
    } catch (error) {
      console.error("Error closing ticket:", error);
      res.status(500).json({ error: "Failed to close ticket" });
    }
  });

  // ============== TECH ROUTES ==============
  // These routes are for technicians to manage PPPoE and Static IP users
  
  app.get("/api/tech/stats", requireTech, async (req: AuthenticatedRequest, res) => {
    try {
      const tenantId = req.session?.user?.tenantId || defaultTenantId;
      
      // Get all WiFi users for this tenant
      const allUsers = await storage.getWifiUsers(tenantId);
      
      // Filter by account type
      const pppoeUsers = allUsers.filter(u => u.accountType === "PPPOE");
      const staticUsers = allUsers.filter(u => u.accountType === "STATIC");
      const activeUsers = allUsers.filter(u => 
        (u.accountType === "PPPOE" || u.accountType === "STATIC") && 
        u.status === "ACTIVE"
      );
      
      // Get users expiring in the next 5 days
      const now = new Date();
      const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
      const expiringUsers = allUsers.filter(u => {
        if (!u.expiryTime || (u.accountType !== "PPPOE" && u.accountType !== "STATIC")) {
          return false;
        }
        const expiry = new Date(u.expiryTime);
        return expiry > now && expiry <= fiveDaysFromNow;
      });
      
      res.json({
        totalPppoeUsers: pppoeUsers.length,
        totalStaticUsers: staticUsers.length,
        activeUsers: activeUsers.length,
        expiringUsers,
      });
    } catch (error) {
      console.error("Error fetching tech stats:", error);
      res.status(500).json({ error: "Failed to fetch tech stats" });
    }
  });

  app.get("/api/tech/customers", requireTech, async (req: AuthenticatedRequest, res) => {
    try {
      const tenantId = req.session?.user?.tenantId || defaultTenantId;
      const { type, search, status } = req.query;
      
      let users = await storage.getWifiUsers(tenantId);
      
      // Filter by account type (PPPoE or Static only for tech)
      if (type) {
        users = users.filter(u => u.accountType === type);
      } else {
        users = users.filter(u => u.accountType === "PPPOE" || u.accountType === "STATIC");
      }
      
      // Filter by status
      if (status) {
        users = users.filter(u => u.status === status);
      }
      
      // Search filter
      if (search) {
        const searchLower = String(search).toLowerCase();
        users = users.filter(u => 
          u.fullName?.toLowerCase().includes(searchLower) ||
          u.phoneNumber.toLowerCase().includes(searchLower) ||
          u.username?.toLowerCase().includes(searchLower) ||
          u.email?.toLowerCase().includes(searchLower)
        );
      }
      
      res.json(users);
    } catch (error) {
      console.error("Error fetching tech customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  // ============== REPORTS ROUTES ==============
  
  app.get("/api/reports/reconciliation", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const report = await storage.getReconciliationReport(defaultTenantId, start, end);
      res.json(report);
    } catch (error) {
      console.error("Error generating reconciliation report:", error);
      res.status(500).json({ error: "Failed to generate reconciliation report" });
    }
  });

  app.get("/api/reports/financial", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const report = await storage.getFinancialReport(defaultTenantId, start, end);
      res.json(report);
    } catch (error) {
      console.error("Error generating financial report:", error);
      res.status(500).json({ error: "Failed to generate financial report" });
    }
  });

  app.get("/api/reports/user-activity", async (req, res) => {
    try {
      const report = await storage.getUserActivityReport(defaultTenantId);
      res.json(report);
    } catch (error) {
      console.error("Error generating user activity report:", error);
      res.status(500).json({ error: "Failed to generate user activity report" });
    }
  });

  app.get("/api/reports/expiring-users", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 5;
      const expiringUsers = await storage.getExpiringWifiUsers(defaultTenantId, days);
      res.json({
        count: expiringUsers.length,
        users: expiringUsers,
      });
    } catch (error) {
      console.error("Error fetching expiring users:", error);
      res.status(500).json({ error: "Failed to fetch expiring users" });
    }
  });

  // ============== MIKROTIK ROUTER MANAGEMENT ROUTES ==============
  
  app.post("/api/hotspots/:id/test-connection", async (req, res) => {
    try {
      const hotspot = await storage.getHotspot(req.params.id);
      if (!hotspot) {
        return res.status(404).json({ error: "Hotspot not found" });
      }

      const { MikrotikService } = await import("./services/mikrotik");
      const mikrotik = new MikrotikService(hotspot);
      const result = await mikrotik.testConnection();
      
      res.json(result);
    } catch (error) {
      console.error("Error testing connection:", error);
      res.status(500).json({ error: "Failed to test connection" });
    }
  });

  app.get("/api/hotspots/:id/active-sessions", async (req, res) => {
    try {
      const hotspot = await storage.getHotspot(req.params.id);
      if (!hotspot) {
        return res.status(404).json({ error: "Hotspot not found" });
      }

      const { MikrotikService } = await import("./services/mikrotik");
      const mikrotik = new MikrotikService(hotspot);
      const result = await mikrotik.getActiveSessions();
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching active sessions:", error);
      res.status(500).json({ error: "Failed to fetch active sessions" });
    }
  });

  app.post("/api/hotspots/:id/disconnect-user", async (req, res) => {
    try {
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ error: "Username is required" });
      }

      const hotspot = await storage.getHotspot(req.params.id);
      if (!hotspot) {
        return res.status(404).json({ error: "Hotspot not found" });
      }

      const { MikrotikService } = await import("./services/mikrotik");
      const mikrotik = new MikrotikService(hotspot);
      const result = await mikrotik.disconnectUser(username);
      
      res.json(result);
    } catch (error) {
      console.error("Error disconnecting user:", error);
      res.status(500).json({ error: "Failed to disconnect user" });
    }
  });

  // ============== SAAS BILLING ENFORCEMENT ROUTES ==============
  
  app.get("/api/admin/tenants", async (req, res) => {
    try {
      const allTenants = await storage.getAllTenants();
      res.json(allTenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({ error: "Failed to fetch tenants" });
    }
  });

  app.post("/api/admin/tenants/:id/billing-status", async (req, res) => {
    try {
      const { status } = req.body;
      if (!["ACTIVE", "TRIAL", "SUSPENDED", "BLOCKED"].includes(status)) {
        return res.status(400).json({ error: "Invalid billing status" });
      }

      const tenant = await storage.updateTenantBillingStatus(req.params.id, status);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      if (status === "BLOCKED") {
        console.log(`[SaaS] Tenant ${tenant.name} has been BLOCKED - should disable hotspots`);
      }

      res.json(tenant);
    } catch (error) {
      console.error("Error updating tenant billing status:", error);
      res.status(500).json({ error: "Failed to update billing status" });
    }
  });

  app.post("/api/admin/tenants/:id/block-traffic", async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      const hotspotsList = await storage.getHotspots(req.params.id);
      const results = [];

      const { MikrotikService } = await import("./services/mikrotik");
      
      for (const hotspot of hotspotsList) {
        try {
          const mikrotik = new MikrotikService(hotspot);
          const result = await mikrotik.blockTenantTraffic("ISP subscription suspended");
          results.push({ hotspot: hotspot.locationName, ...result });
        } catch (e) {
          results.push({ hotspot: hotspot.locationName, success: false, error: String(e) });
        }
      }

      await storage.updateTenantBillingStatus(req.params.id, "BLOCKED");
      
      res.json({ tenant: tenant.name, blocked: true, results });
    } catch (error) {
      console.error("Error blocking tenant traffic:", error);
      res.status(500).json({ error: "Failed to block tenant traffic" });
    }
  });

  app.post("/api/admin/tenants/:id/unblock-traffic", async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      const hotspotsList = await storage.getHotspots(req.params.id);
      const results = [];

      const { MikrotikService } = await import("./services/mikrotik");
      
      for (const hotspot of hotspotsList) {
        try {
          const mikrotik = new MikrotikService(hotspot);
          const result = await mikrotik.unblockTenantTraffic();
          results.push({ hotspot: hotspot.locationName, ...result });
        } catch (e) {
          results.push({ hotspot: hotspot.locationName, success: false, error: String(e) });
        }
      }

      await storage.updateTenantBillingStatus(req.params.id, "ACTIVE");
      
      res.json({ tenant: tenant.name, blocked: false, results });
    } catch (error) {
      console.error("Error unblocking tenant traffic:", error);
      res.status(500).json({ error: "Failed to unblock tenant traffic" });
    }
  });

  // ============== SUPER ADMIN ROUTES ==============
  // All superadmin routes require superadmin role

  // Get platform analytics for super admin dashboard
  app.get("/api/superadmin/analytics", requireSuperAdmin, async (req, res) => {
    try {
      const analytics = await storage.getPlatformAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching platform analytics:", error);
      res.status(500).json({ error: "Failed to fetch platform analytics" });
    }
  });

  // Get all tenants with enhanced stats
  app.get("/api/superadmin/tenants", requireSuperAdmin, async (req, res) => {
    try {
      const tenantsWithStats = await storage.getAllTenantsWithStats();
      res.json(tenantsWithStats);
    } catch (error) {
      console.error("Error fetching tenants with stats:", error);
      res.status(500).json({ error: "Failed to fetch tenants" });
    }
  });

  // Get single tenant details
  app.get("/api/superadmin/tenants/:id", requireSuperAdmin, async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      const wifiUsersList = await storage.getWifiUsers(req.params.id);
      const transactionsList = await storage.getTransactions(req.params.id);
      const hotspotsList = await storage.getHotspots(req.params.id);
      const plansList = await storage.getPlans(req.params.id);

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const completedTransactions = transactionsList.filter(t => t.status === 'COMPLETED');
      const thisMonthRevenue = completedTransactions
        .filter(t => t.createdAt && new Date(t.createdAt) >= thisMonthStart)
        .reduce((sum, t) => sum + t.amount, 0);
      const lastMonthRevenue = completedTransactions
        .filter(t => t.createdAt && new Date(t.createdAt) >= lastMonthStart && new Date(t.createdAt) <= lastMonthEnd)
        .reduce((sum, t) => sum + t.amount, 0);

      res.json({
        ...tenant,
        userCount: wifiUsersList.length,
        transactionCount: transactionsList.length,
        hotspotCount: hotspotsList.length,
        planCount: plansList.length,
        revenueThisMonth: thisMonthRevenue,
        revenueLastMonth: lastMonthRevenue,
      });
    } catch (error) {
      console.error("Error fetching tenant details:", error);
      res.status(500).json({ error: "Failed to fetch tenant details" });
    }
  });

  // Update tenant subscription tier
  app.patch("/api/superadmin/tenants/:id/subscription", requireSuperAdmin, async (req, res) => {
    try {
      const { tier, saasBillingStatus, trialExpiresAt, subscriptionExpiresAt } = req.body;
      
      const updateData: {
        tier?: string;
        saasBillingStatus?: string;
        trialExpiresAt?: Date | null;
        subscriptionExpiresAt?: Date | null;
      } = {};

      if (tier) updateData.tier = tier;
      if (saasBillingStatus) updateData.saasBillingStatus = saasBillingStatus;
      if (trialExpiresAt !== undefined) {
        updateData.trialExpiresAt = trialExpiresAt ? new Date(trialExpiresAt) : null;
      }
      if (subscriptionExpiresAt !== undefined) {
        updateData.subscriptionExpiresAt = subscriptionExpiresAt ? new Date(subscriptionExpiresAt) : null;
      }

      const tenant = await storage.updateTenantSubscription(req.params.id, updateData);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      res.json(tenant);
    } catch (error) {
      console.error("Error updating tenant subscription:", error);
      res.status(500).json({ error: "Failed to update tenant subscription" });
    }
  });

  // Activate/Suspend tenant
  app.patch("/api/superadmin/tenants/:id/status", requireSuperAdmin, async (req, res) => {
    try {
      const { isActive, saasBillingStatus } = req.body;
      
      const updateData: Partial<{ isActive: boolean; saasBillingStatus: string }> = {};
      if (isActive !== undefined) updateData.isActive = isActive;
      if (saasBillingStatus) updateData.saasBillingStatus = saasBillingStatus;

      const tenant = await storage.updateTenant(req.params.id, updateData);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      console.log(`[SuperAdmin] Tenant ${tenant.name} status updated: active=${isActive}, billing=${saasBillingStatus}`);
      res.json(tenant);
    } catch (error) {
      console.error("Error updating tenant status:", error);
      res.status(500).json({ error: "Failed to update tenant status" });
    }
  });

  // Create admin user (protected - only existing superadmins can create new ones)
  app.post("/api/superadmin/create-superadmin", requireSuperAdmin, async (req, res) => {
    try {
      const { username, email, password, role } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ error: "Username, email, and password are required" });
      }

      const validRoles = ["superadmin", "admin", "tech"];
      const userRole = validRoles.includes(role) ? role : "superadmin";

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ error: "Username already exists" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        role: userRole,
        isActive: true,
      });

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      });
    } catch (error) {
      console.error("Error creating admin user:", error);
      res.status(500).json({ error: "Failed to create admin user" });
    }
  });

  // List all admin users
  app.get("/api/superadmin/users", requireSuperAdmin, async (req, res) => {
    try {
      const adminUsers = await storage.getAllAdminUsers();
      res.json(adminUsers.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        tenantId: u.tenantId,
        tenantName: u.tenantName,
        createdAt: u.createdAt,
      })));
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ error: "Failed to fetch admin users" });
    }
  });

  // Update admin user status
  app.patch("/api/superadmin/users/:id/status", requireSuperAdmin, async (req, res) => {
    try {
      const { isActive } = req.body;
      const user = await storage.updateUser(req.params.id, { isActive });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ id: user.id, username: user.username, isActive: user.isActive });
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ error: "Failed to update user status" });
    }
  });

  // Delete admin user
  app.delete("/api/superadmin/users/:id", requireSuperAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteUser(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // ============== JOB QUEUE STATUS ROUTES ==============
  
  app.get("/api/jobs/pending", async (req, res) => {
    try {
      const pendingJobs = await jobQueue.getPendingJobs(defaultTenantId);
      res.json(pendingJobs);
    } catch (error) {
      console.error("Error fetching pending jobs:", error);
      res.status(500).json({ error: "Failed to fetch pending jobs" });
    }
  });

  app.get("/api/jobs/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const recentJobs = await jobQueue.getRecentJobs(limit);
      res.json(recentJobs);
    } catch (error) {
      console.error("Error fetching recent jobs:", error);
      res.status(500).json({ error: "Failed to fetch recent jobs" });
    }
  });

  // ============== SMS CAMPAIGNS ROUTES ==============

  app.get("/api/sms/campaigns", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const tenantId = req.session.user?.tenantId || defaultTenantId;
      const campaigns = await storage.getSmsCampaigns(tenantId);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching SMS campaigns:", error);
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  const smsCampaignSchema = z.object({
    name: z.string().min(1, "Campaign name is required").max(100, "Campaign name too long"),
    message: z.string().min(1, "Message is required").max(480, "Message too long (max 480 chars for 3 SMS)"),
    recipients: z.array(z.string().uuid()).min(1, "At least one recipient required"),
  });

  app.post("/api/sms/campaigns", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const tenantId = req.session.user?.tenantId || defaultTenantId;
      
      // Validate input with Zod
      const validationResult = smsCampaignSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: validationResult.error.errors[0].message 
        });
      }
      
      const { name, message, recipients } = validationResult.data;

      // Verify all recipients belong to this tenant
      const users = await storage.getWifiUsersByIds(tenantId, recipients);
      if (users.length !== recipients.length) {
        return res.status(400).json({ 
          error: "Some recipients do not belong to your organization" 
        });
      }

      // Calculate cost estimate
      const smsCount = Math.ceil(message.length / 160);
      const estimatedCost = users.length * smsCount * 0.7; // 0.70 KES per SMS

      // Create campaign record with fixed status
      const campaign = await storage.createSmsCampaign({
        tenantId,
        name,
        message,
        recipientCount: recipients.length,
        status: "sending",
      });

      // Queue SMS jobs for each recipient
      let sentCount = 0;
      let failedCount = 0;

      for (const user of users) {
        try {
          // In production, this would use the actual SMS service
          console.log(`[SMS Campaign] Sending to ${user.phoneNumber}: ${message.substring(0, 50)}...`);
          sentCount++;
        } catch (error) {
          console.error(`[SMS Campaign] Failed to send to ${user.phoneNumber}:`, error);
          failedCount++;
        }
      }

      // Update campaign status (only allowed fields)
      await storage.updateSmsCampaignStatus(campaign.id, sentCount, failedCount);

      res.status(201).json({
        ...campaign,
        sentCount,
        failedCount,
        estimatedCost,
        status: failedCount === recipients.length ? "failed" : "completed",
      });
    } catch (error) {
      console.error("Error creating SMS campaign:", error);
      res.status(500).json({ error: "Failed to create campaign" });
    }
  });

  // ============== ROUTER MONITORING ROUTES ==============

  app.get("/api/hotspots/:id/stats", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const tenantId = req.session.user?.tenantId || defaultTenantId;
      const hotspot = await storage.getHotspot(req.params.id);
      
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }

      // Mock stats for demo - in production, this would call the MikroTik API
      const stats = {
        uptime: "3d 14h 22m",
        cpuLoad: Math.floor(Math.random() * 40) + 10,
        freeMemory: 128 * 1024 * 1024 + Math.floor(Math.random() * 64 * 1024 * 1024),
        totalMemory: 256 * 1024 * 1024,
        freeDisk: 32 * 1024 * 1024 + Math.floor(Math.random() * 16 * 1024 * 1024),
        totalDisk: 64 * 1024 * 1024,
        boardName: "hAP ac2",
        version: "7.12.1",
        architecture: "arm",
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching router stats:", error);
      res.status(500).json({ error: "Failed to fetch router stats" });
    }
  });

  app.get("/api/hotspots/:id/interfaces", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const tenantId = req.session.user?.tenantId || defaultTenantId;
      const hotspot = await storage.getHotspot(req.params.id);
      
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }

      // Mock interface data for demo
      const interfaces = [
        {
          name: "ether1",
          type: "ethernet",
          rxBytes: Math.floor(Math.random() * 1024 * 1024 * 1024),
          txBytes: Math.floor(Math.random() * 512 * 1024 * 1024),
          rxPackets: Math.floor(Math.random() * 1000000),
          txPackets: Math.floor(Math.random() * 500000),
          running: true,
          disabled: false,
        },
        {
          name: "wlan1",
          type: "wireless",
          rxBytes: Math.floor(Math.random() * 2 * 1024 * 1024 * 1024),
          txBytes: Math.floor(Math.random() * 1024 * 1024 * 1024),
          rxPackets: Math.floor(Math.random() * 2000000),
          txPackets: Math.floor(Math.random() * 1000000),
          running: true,
          disabled: false,
        },
        {
          name: "bridge1",
          type: "bridge",
          rxBytes: Math.floor(Math.random() * 3 * 1024 * 1024 * 1024),
          txBytes: Math.floor(Math.random() * 1.5 * 1024 * 1024 * 1024),
          rxPackets: Math.floor(Math.random() * 3000000),
          txPackets: Math.floor(Math.random() * 1500000),
          running: true,
          disabled: false,
        },
      ];

      res.json(interfaces);
    } catch (error) {
      console.error("Error fetching interfaces:", error);
      res.status(500).json({ error: "Failed to fetch interfaces" });
    }
  });

  app.get("/api/hotspots/:id/sessions", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const tenantId = req.session.user?.tenantId || defaultTenantId;
      const hotspot = await storage.getHotspot(req.params.id);
      
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }

      // Mock active sessions for demo
      const sessions = [
        {
          user: "user001",
          address: "192.168.88.101",
          macAddress: "AA:BB:CC:DD:EE:01",
          uptime: "1h 23m",
          bytesIn: Math.floor(Math.random() * 100 * 1024 * 1024),
          bytesOut: Math.floor(Math.random() * 50 * 1024 * 1024),
        },
        {
          user: "user002",
          address: "192.168.88.102",
          macAddress: "AA:BB:CC:DD:EE:02",
          uptime: "45m",
          bytesIn: Math.floor(Math.random() * 75 * 1024 * 1024),
          bytesOut: Math.floor(Math.random() * 25 * 1024 * 1024),
        },
        {
          user: "user003",
          address: "192.168.88.103",
          macAddress: "AA:BB:CC:DD:EE:03",
          uptime: "2h 10m",
          bytesIn: Math.floor(Math.random() * 200 * 1024 * 1024),
          bytesOut: Math.floor(Math.random() * 100 * 1024 * 1024),
        },
      ];

      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  app.post("/api/hotspots/:id/reboot", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const tenantId = req.session.user?.tenantId || defaultTenantId;
      const hotspot = await storage.getHotspot(req.params.id);
      
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }

      // In production, this would call the MikroTik API to reboot
      console.log(`[Router] Reboot initiated for ${hotspot.locationName} (${hotspot.nasIp})`);

      // Mock successful reboot
      res.json({ 
        success: true, 
        message: `Reboot initiated for ${hotspot.locationName}. Router will be back online in 1-3 minutes.` 
      });
    } catch (error) {
      console.error("Error rebooting router:", error);
      res.status(500).json({ error: "Failed to reboot router" });
    }
  });

  return httpServer;
}

// Initialize default tenant with sample data
async function initializeDefaultTenant(): Promise<string> {
  try {
    // Try to find demo tenant by subdomain
    let tenant = await storage.getTenantBySubdomain("demo");
    
    if (!tenant) {
      // Create default tenant
      tenant = await storage.createTenant({
        name: "MnetiFi Demo",
        subdomain: "demo",
      });
      
      console.log("Created default tenant:", tenant.id);
    }

    // Check if we have sample plans
    const plans = await storage.getPlans(tenant.id);
    if (plans.length === 0) {
      // Create sample plans
      await storage.createPlan({
        tenantId: tenant.id,
        name: "30 Minutes",
        description: "Quick access for light browsing",
        price: 10,
        durationSeconds: 1800,
        uploadLimit: "1M",
        downloadLimit: "2M",
        simultaneousUse: 1,
        sortOrder: 1,
      });

      await storage.createPlan({
        tenantId: tenant.id,
        name: "1 Hour",
        description: "Standard browsing session",
        price: 20,
        durationSeconds: 3600,
        uploadLimit: "2M",
        downloadLimit: "5M",
        simultaneousUse: 1,
        sortOrder: 2,
      });

      await storage.createPlan({
        tenantId: tenant.id,
        name: "Daily Pass",
        description: "Full day unlimited access",
        price: 100,
        durationSeconds: 86400,
        uploadLimit: "5M",
        downloadLimit: "10M",
        simultaneousUse: 2,
        sortOrder: 3,
      });

      await storage.createPlan({
        tenantId: tenant.id,
        name: "Weekly Pass",
        description: "Best value for regular users",
        price: 500,
        durationSeconds: 604800,
        uploadLimit: "10M",
        downloadLimit: "20M",
        simultaneousUse: 3,
        sortOrder: 4,
      });

      console.log("Created sample plans");
    }

    // Check if we have sample walled garden entries
    const walledGardens = await storage.getWalledGardens(tenant.id);
    if (walledGardens.length === 0) {
      // Create default walled garden entries for M-Pesa
      await storage.createWalledGarden({
        tenantId: tenant.id,
        domain: "safaricom.co.ke",
        description: "M-Pesa main domain",
      });

      await storage.createWalledGarden({
        tenantId: tenant.id,
        domain: "sandbox.safaricom.co.ke",
        description: "M-Pesa sandbox for testing",
      });

      await storage.createWalledGarden({
        tenantId: tenant.id,
        domain: "api.safaricom.co.ke",
        description: "M-Pesa API endpoint",
      });

      console.log("Created sample walled garden entries");
    }

    // Check if we have an admin user
    const adminUser = await storage.getUserByUsername("admin");
    if (!adminUser) {
      await storage.createUser({
        tenantId: tenant.id,
        username: "admin",
        password: "admin123",
        email: "admin@mnetifi.local",
        role: "admin",
      });
      console.log("Created default admin user (username: admin, password: admin123)");
    }

    return tenant.id;
  } catch (error) {
    console.error("Error initializing default tenant:", error);
    throw error;
  }
}
