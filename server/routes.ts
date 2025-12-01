import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertPlanSchema, 
  insertHotspotSchema, 
  insertTransactionSchema,
  insertWalledGardenSchema,
  insertTenantSchema,
} from "@shared/schema";
import { z } from "zod";

// Default tenant ID for demo (in production, this would come from auth/subdomain)
let defaultTenantId: string = "";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Initialize default tenant if not exists
  defaultTenantId = await initializeDefaultTenant();

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

  // Initiate payment (STK Push simulation)
  app.post("/api/transactions/initiate", async (req, res) => {
    try {
      const { planId, phone } = req.body;
      
      if (!planId || !phone) {
        return res.status(400).json({ error: "Plan ID and phone number are required" });
      }

      const plan = await storage.getPlan(planId);
      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      // Create transaction with PENDING status
      const checkoutRequestId = `ws_CO_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const merchantRequestId = `MR_${Date.now()}`;

      const transaction = await storage.createTransaction({
        tenantId: defaultTenantId,
        planId,
        userPhone: phone,
        amount: plan.price,
        checkoutRequestId,
        merchantRequestId,
        status: "PENDING",
        statusDescription: "Awaiting M-Pesa confirmation",
      });

      // In production, this would call M-Pesa STK Push API
      // For demo, we'll simulate a successful payment after a delay
      setTimeout(async () => {
        try {
          const receiptNumber = `QK${Date.now().toString().slice(-10)}`;
          await storage.updateTransaction(transaction.id, {
            status: "COMPLETED",
            mpesaReceiptNumber: receiptNumber,
            statusDescription: "Payment received successfully",
          });
        } catch (error) {
          console.error("Error simulating payment completion:", error);
        }
      }, 5000); // Simulate 5 second payment processing

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

    return tenant.id;
  } catch (error) {
    console.error("Error initializing default tenant:", error);
    throw error;
  }
}
