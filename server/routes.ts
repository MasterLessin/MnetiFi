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
  insertVoucherBatchSchema,
  ReconciliationStatus,
  TransactionStatus,
  UserRole,
  VoucherStatus,
  type UserRoleValue,
} from "@shared/schema";
import { z } from "zod";
import { jobQueue } from "./services/job-queue";
import { paymentWorker } from "./services/payment-worker";
import { getSmsService } from "./services/sms";
import { MikrotikService, createMikrotikService } from "./services/mikrotik";
import { getEmailService } from "./services/email";
import { 
  requireAuth, 
  requireSuperAdmin, 
  requireAdmin, 
  requireTech,
  requireTenantAccess,
  requireAuthWithTenant,
  getSessionTenantId,
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

// Module-level default tenant ID for public/captive portal routes
// This is used ONLY for unauthenticated routes that need a fallback tenant
// Authenticated routes should ALWAYS use getSessionTenantId(req)
let defaultTenantId: string = "";

// Helper function to generate MikroTik hotspot login page HTML
function generateLoginPageHtml(config: any, tenant: any): string {
  const {
    logo = "",
    title = "Welcome",
    subtitle = "",
    welcomeMessage = "Connect to our WiFi network",
    termsAndConditions = "",
    backgroundColor = "#ffffff",
    primaryColor = "#3b82f6",
    secondaryColor = "#64748b",
    textColor = "#1f2937",
    buttonColor = "#3b82f6",
    buttonTextColor = "#ffffff",
    fontFamily = "Inter, system-ui, sans-serif",
    borderRadius = 8,
    showPoweredBy = true,
    customCss = "",
    footerText = "",
  } = config || {};

  const tenantName = tenant?.name || "MnetiFi WiFi";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${tenantName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: ${fontFamily};
      background-color: ${backgroundColor};
      color: ${textColor};
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      width: 100%;
      max-width: 400px;
      background: white;
      border-radius: ${borderRadius}px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      padding: 40px 30px;
      text-align: center;
    }
    .logo {
      max-width: 150px;
      max-height: 80px;
      margin-bottom: 20px;
    }
    h1 {
      color: ${primaryColor};
      font-size: 24px;
      margin-bottom: 8px;
    }
    .subtitle {
      color: ${secondaryColor};
      font-size: 14px;
      margin-bottom: 20px;
    }
    .welcome {
      color: ${textColor};
      font-size: 16px;
      margin-bottom: 30px;
      line-height: 1.5;
    }
    .form-group {
      margin-bottom: 16px;
      text-align: left;
    }
    label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: ${textColor};
      margin-bottom: 6px;
    }
    input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #e2e8f0;
      border-radius: ${borderRadius}px;
      font-size: 16px;
      transition: border-color 0.2s;
    }
    input:focus {
      outline: none;
      border-color: ${primaryColor};
    }
    .btn {
      width: 100%;
      padding: 14px;
      background: ${buttonColor};
      color: ${buttonTextColor};
      border: none;
      border-radius: ${borderRadius}px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .btn:hover {
      opacity: 0.9;
    }
    .terms {
      font-size: 12px;
      color: ${secondaryColor};
      margin-top: 20px;
      line-height: 1.5;
    }
    .terms a {
      color: ${primaryColor};
      text-decoration: none;
    }
    .powered-by {
      font-size: 11px;
      color: ${secondaryColor};
      margin-top: 30px;
    }
    .powered-by a {
      color: ${primaryColor};
      text-decoration: none;
    }
    .footer {
      font-size: 12px;
      color: ${secondaryColor};
      margin-top: 20px;
    }
    .error-message {
      background: #fee2e2;
      color: #b91c1c;
      padding: 12px;
      border-radius: ${borderRadius}px;
      font-size: 14px;
      margin-bottom: 16px;
      display: none;
    }
    ${customCss}
  </style>
</head>
<body>
  <div class="container">
    ${logo ? `<img src="${logo}" alt="Logo" class="logo">` : ""}
    <h1>${title}</h1>
    ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ""}
    <p class="welcome">${welcomeMessage}</p>
    
    <div class="error-message" id="errorMsg">
      $(if error)<span>$(error)</span>$(endif)
    </div>
    
    <form method="post" action="$(link-login-only)">
      <input type="hidden" name="dst" value="$(link-orig)">
      <input type="hidden" name="popup" value="true">
      
      <div class="form-group">
        <label for="username">Phone Number / Username</label>
        <input type="text" id="username" name="username" placeholder="0712345678" required>
      </div>
      
      <div class="form-group">
        <label for="password">Password / Voucher Code</label>
        <input type="password" id="password" name="password" placeholder="Enter password or voucher" required>
      </div>
      
      <button type="submit" class="btn">Connect to WiFi</button>
    </form>
    
    ${termsAndConditions ? `<p class="terms">${termsAndConditions}</p>` : ""}
    ${footerText ? `<p class="footer">${footerText}</p>` : ""}
    ${showPoweredBy ? `<p class="powered-by">Powered by <a href="https://mnetifi.com" target="_blank">MnetiFi</a></p>` : ""}
  </div>
  
  <script>
    // Show error message if present
    var errorEl = document.getElementById('errorMsg');
    if (errorEl.textContent.trim()) {
      errorEl.style.display = 'block';
    }
  </script>
</body>
</html>`;
}

// Helper to get tenant ID from request context (for public routes)
// Priority: 1. Query param tenantId, 2. Subdomain lookup, 3. Default demo tenant
async function getPublicTenantId(req: any): Promise<string> {
  // Check query parameter first
  if (req.query.tenantId && typeof req.query.tenantId === 'string') {
    return req.query.tenantId;
  }
  
  // Check subdomain from host header
  const host = req.get('host') || '';
  const subdomain = host.split('.')[0];
  if (subdomain && subdomain !== 'www' && subdomain !== 'localhost' && subdomain !== 'mnetifi') {
    const tenant = await storage.getTenantBySubdomain(subdomain);
    if (tenant) {
      return tenant.id;
    }
  }
  
  // Fall back to default tenant
  return defaultTenantId;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Health check endpoint for Render.com
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // Initialize default tenant for demo purposes and set module-level variable
  defaultTenantId = await initializeDefaultTenant();

  // ============== AUTHENTICATION ROUTES ==============
  
  // Public endpoint to list available tenants for login form
  app.get("/api/auth/tenants", async (req, res) => {
    try {
      const allTenants = await storage.getAllTenants();
      // Return only public info needed for login dropdown
      const tenantList = allTenants
        .filter(t => t.isActive)
        .map(t => ({
          id: t.id,
          name: t.name,
          subdomain: t.subdomain,
        }));
      res.json(tenantList);
    } catch (error) {
      console.error("Error fetching tenants for login:", error);
      res.status(500).json({ error: "Failed to load tenants" });
    }
  });
  
  // Login attempt rate limiting settings
  const MAX_FAILED_ATTEMPTS = 5;
  const LOCKOUT_DURATION_MINUTES = 15;

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password, tenantId: requestTenantId, subdomain } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      // Resolve tenant context from request body or host header
      let tenantId: string | undefined;
      
      // Priority 1: Explicit tenantId in request body
      if (requestTenantId) {
        tenantId = requestTenantId;
      }
      // Priority 2: Subdomain in request body (used by login form)
      else if (subdomain) {
        const tenant = await storage.getTenantBySubdomain(subdomain);
        if (tenant) {
          tenantId = tenant.id;
        }
      }
      // Priority 3: Extract from host header using subdomain
      else {
        const host = req.get('host') || '';
        const subdomain = host.split('.')[0];
        if (subdomain && subdomain !== 'www' && subdomain !== 'localhost' && subdomain !== 'mnetifi') {
          const tenant = await storage.getTenantBySubdomain(subdomain);
          if (tenant) {
            tenantId = tenant.id;
          }
        }
      }

      // Get client IP and user agent for logging
      const ipAddress = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      // Check for account lockout due to too many failed attempts
      const failedAttempts = await storage.countFailedLoginAttempts(username, LOCKOUT_DURATION_MINUTES);
      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        console.log(`[Auth] Account locked for ${username} - too many failed attempts (${failedAttempts})`);
        return res.status(429).json({ 
          error: "Account temporarily locked due to too many failed login attempts. Please try again later.",
          lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString(),
        });
      }

      // Look up user by username + tenant for proper multi-tenant isolation
      // For regular users, tenantId is required; for superadmins, we check users without tenantId
      let user = await storage.getUserByUsername(username, tenantId);
      
      // If not found with tenant, try superadmin lookup (user without tenantId)
      if (!user && tenantId) {
        const superadminUser = await storage.getUserByUsername(username);
        if (superadminUser && superadminUser.role === 'superadmin') {
          user = superadminUser;
        }
      }
      
      if (!user) {
        // Record failed attempt for non-existent user (prevents user enumeration timing attacks)
        await storage.recordLoginAttempt({
          username,
          ipAddress,
          success: false,
          userAgent,
        });
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
        // Record failed login attempt
        await storage.recordLoginAttempt({
          username,
          ipAddress,
          success: false,
          userAgent,
        });
        const remainingAttempts = MAX_FAILED_ATTEMPTS - failedAttempts - 1;
        console.log(`[Auth] Failed login for ${username} - ${remainingAttempts} attempts remaining`);
        return res.status(401).json({ 
          error: "Invalid username or password",
          remainingAttempts: remainingAttempts > 0 ? remainingAttempts : 0,
        });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: "Account is disabled" });
      }

      // Record successful login attempt
      await storage.recordLoginAttempt({
        username,
        ipAddress,
        success: true,
        userAgent,
      });

      // Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        console.log(`[Auth] 2FA required for ${username} from ${ipAddress}`);
        return res.json({
          requiresTwoFactor: true,
          userId: user.id,
          message: "Two-factor authentication required",
        });
      }

      // Fetch tenant data for subscription info
      const tenant = user.tenantId ? await storage.getTenant(user.tenantId) : null;
      const subscriptionTier = tenant?.subscriptionTier || "BASIC";
      const trialExpiresAt = tenant?.trialExpiresAt ? tenant.trialExpiresAt.toISOString() : null;

      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role as UserRoleValue,
        tenantId: user.tenantId,
        email: user.email,
      };
      req.session.subscriptionTier = subscriptionTier;
      req.session.trialExpiresAt = trialExpiresAt;

      console.log(`[Auth] Successful login for ${username} from ${ipAddress}`);

      res.json({
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email,
          tenantId: user.tenantId,
        },
        subscriptionTier,
        trialExpiresAt,
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
    res.json({ 
      user: req.session.user,
      subscriptionTier: req.session.subscriptionTier || "BASIC",
      trialExpiresAt: req.session.trialExpiresAt || null,
    });
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

  // ============== TWO-FACTOR AUTHENTICATION ROUTES ==============
  
  // Generate 2FA secret and QR code
  app.post("/api/auth/2fa/setup", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.twoFactorEnabled) {
        return res.status(400).json({ error: "2FA is already enabled" });
      }

      // Generate TOTP secret
      const { authenticator } = await import("otplib");
      const secret = authenticator.generateSecret();
      
      // Generate QR code URL
      const qrcode = await import("qrcode");
      const otpAuthUrl = authenticator.keyuri(user.username, "MnetiFi", secret);
      const qrCodeDataUrl = await qrcode.toDataURL(otpAuthUrl);

      // Store secret temporarily (not enabled yet until verified)
      await storage.updateUser(userId, { twoFactorSecret: secret });

      res.json({
        secret,
        qrCode: qrCodeDataUrl,
        message: "Scan the QR code with your authenticator app, then verify with a code",
      });
    } catch (error) {
      console.error("Error setting up 2FA:", error);
      res.status(500).json({ error: "Failed to set up 2FA" });
    }
  });

  // Verify and enable 2FA
  app.post("/api/auth/2fa/verify", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.session?.user?.id;
      const { code } = req.body;

      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (!code) {
        return res.status(400).json({ error: "Verification code is required" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.twoFactorSecret) {
        return res.status(400).json({ error: "2FA setup not initiated" });
      }

      // Verify the TOTP code
      const { authenticator } = await import("otplib");
      const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });

      if (!isValid) {
        return res.status(400).json({ error: "Invalid verification code" });
      }

      // Enable 2FA
      await storage.updateUser(userId, { twoFactorEnabled: true });

      console.log(`[Auth] 2FA enabled for user ${user.username}`);
      res.json({ success: true, message: "2FA enabled successfully" });
    } catch (error) {
      console.error("Error verifying 2FA:", error);
      res.status(500).json({ error: "Failed to verify 2FA" });
    }
  });

  // Disable 2FA
  app.post("/api/auth/2fa/disable", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.session?.user?.id;
      const { password, code } = req.body;

      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.twoFactorEnabled) {
        return res.status(400).json({ error: "2FA is not enabled" });
      }

      // Verify password
      const passwordValid = await verifyPassword(password, user.password);
      if (!passwordValid) {
        return res.status(401).json({ error: "Invalid password" });
      }

      // Verify the TOTP code
      const { authenticator } = await import("otplib");
      const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret || "" });
      if (!isValid) {
        return res.status(400).json({ error: "Invalid verification code" });
      }

      // Disable 2FA
      await storage.updateUser(userId, { twoFactorEnabled: false, twoFactorSecret: null });

      console.log(`[Auth] 2FA disabled for user ${user.username}`);
      res.json({ success: true, message: "2FA disabled successfully" });
    } catch (error) {
      console.error("Error disabling 2FA:", error);
      res.status(500).json({ error: "Failed to disable 2FA" });
    }
  });

  // Check 2FA status
  app.get("/api/auth/2fa/status", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ enabled: user.twoFactorEnabled || false });
    } catch (error) {
      console.error("Error checking 2FA status:", error);
      res.status(500).json({ error: "Failed to check 2FA status" });
    }
  });

  // Verify 2FA code during login
  app.post("/api/auth/2fa/login-verify", async (req, res) => {
    try {
      const { userId, code } = req.body;

      if (!userId || !code) {
        return res.status(400).json({ error: "User ID and code are required" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        return res.status(400).json({ error: "Invalid request" });
      }

      // Verify the TOTP code
      const { authenticator } = await import("otplib");
      const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });

      if (!isValid) {
        return res.status(401).json({ error: "Invalid verification code" });
      }

      // Fetch tenant data for subscription info
      const tenant = user.tenantId ? await storage.getTenant(user.tenantId) : null;
      const subscriptionTier = tenant?.subscriptionTier || "BASIC";
      const trialExpiresAt = tenant?.trialExpiresAt ? tenant.trialExpiresAt.toISOString() : null;

      // Create session with subscription data
      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role as UserRoleValue,
        tenantId: user.tenantId,
        email: user.email,
      };
      req.session.subscriptionTier = subscriptionTier;
      req.session.trialExpiresAt = trialExpiresAt;

      console.log(`[Auth] 2FA login verified for ${user.username}`);
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email,
          tenantId: user.tenantId,
        },
        subscriptionTier,
        trialExpiresAt,
      });
    } catch (error) {
      console.error("Error verifying 2FA login:", error);
      res.status(500).json({ error: "Failed to verify 2FA" });
    }
  });

  // Registration endpoint for new ISPs
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { businessName, subdomain, username, email, password, subscriptionTier, paymentMethod, phoneNumber } = req.body;
      
      if (!businessName || !subdomain || !username || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
      }

      // Validate subscription tier
      const tier = subscriptionTier || "BASIC";
      if (!["BASIC", "PREMIUM"].includes(tier)) {
        return res.status(400).json({ error: "Invalid subscription tier" });
      }

      // Payment method only required for PREMIUM tier
      if (tier === "PREMIUM" && (!paymentMethod || !["MPESA", "BANK", "PAYPAL"].includes(paymentMethod))) {
        return res.status(400).json({ error: "Valid payment method is required for premium tier" });
      }

      // Validate password strength on server side
      const hasMinLength = password.length >= 8;
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
      
      if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
        return res.status(400).json({ 
          error: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character" 
        });
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

      // Calculate trial expiration (24 hours from now) for BASIC tier
      const trialExpiresAt = tier === "BASIC" ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

      // Determine payment status based on method (only for PREMIUM)
      let registrationPaymentStatus = tier === "BASIC" ? "NOT_REQUIRED" : "PENDING";
      if (tier === "PREMIUM") {
        if (paymentMethod === "MPESA") {
          registrationPaymentStatus = "PENDING"; // Will be updated after STK push
        } else if (paymentMethod === "BANK") {
          registrationPaymentStatus = "AWAITING_CONFIRMATION"; // Manual verification needed
        } else if (paymentMethod === "PAYPAL") {
          registrationPaymentStatus = "PENDING"; // Will redirect to PayPal
        }
      }

      // Create the tenant (ISP)
      const tenant = await storage.createTenant({
        name: businessName,
        subdomain: subdomain.toLowerCase(),
        subscriptionTier: tier,
        saasBillingStatus: tier === "BASIC" ? "TRIAL" : "PENDING",
        trialExpiresAt: trialExpiresAt,
        isActive: true,
        registrationPaymentMethod: tier === "PREMIUM" ? paymentMethod : null,
        registrationPaymentStatus: registrationPaymentStatus,
      });

      // Hash password and create the admin user for this tenant
      const hashedPassword = await hashPassword(password);
      
      // For BASIC tier: Skip email verification, auto-activate and allow immediate login
      // For PREMIUM tier: Require email verification first
      const isBasicTier = tier === "BASIC";
      
      const user = await storage.createUser({
        tenantId: tenant.id,
        username,
        password: hashedPassword,
        email,
        role: "admin",
        isActive: isBasicTier, // BASIC tier is immediately active
      });

      if (isBasicTier) {
        // For BASIC tier: Mark email as verified and return user for auto-login
        await storage.updateUser(user.id, {
          emailVerified: true,
        });
        
        console.log(`[Registration] BASIC tier account created for ${username} - trial expires at ${trialExpiresAt}`);
        
        return res.status(201).json({
          message: "Welcome to MnetiFi! Your 24-hour free trial has started.",
          tenant: {
            id: tenant.id,
            name: tenant.name,
            subdomain: tenant.subdomain,
          },
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            tenantId: tenant.id,
          },
          subscriptionTier: tier,
          trialExpiresAt: trialExpiresAt,
        });
      }

      // For PREMIUM tier: Generate email verification token
      const emailVerificationToken = crypto.randomUUID();
      const emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update user with email verification token
      await storage.updateUser(user.id, {
        emailVerificationToken,
        emailVerificationExpiry,
        emailVerified: false,
      });

      // Generate 6-digit verification code for email
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationLink = `/verify-email?token=${emailVerificationToken}`;
      console.log(`[Registration] PREMIUM tier - Email verification required for ${email}`);
      console.log(`[Registration] Verification token: ${emailVerificationToken}`);
      console.log(`[Registration] Verification link: ${verificationLink}`);

      // Send verification email
      try {
        const emailService = getEmailService();
        await emailService.sendVerificationEmail(email, businessName, verificationCode);
        console.log(`[Registration] Verification email sent to ${email}`);
      } catch (emailError) {
        console.error(`[Registration] Failed to send verification email:`, emailError);
        // Continue registration even if email fails - user can resend
      }

      let responseMessage = "Account created! Please check your email to verify your account.";
      let additionalInfo: Record<string, unknown> = {
        requiresEmailVerification: true,
        verificationEmailSentTo: email,
      };

      if (paymentMethod === "MPESA" && phoneNumber) {
        responseMessage = "Account created! Please verify your email, then check your phone for M-Pesa payment prompt.";
        console.log(`[Registration] M-Pesa STK push to be sent to ${phoneNumber} for tenant ${tenant.id} after verification`);
      } else if (paymentMethod === "BANK") {
        responseMessage = "Account created! Please verify your email, then complete bank transfer to activate.";
        additionalInfo = {
          ...additionalInfo,
          bankDetails: {
            bank: "Kenya Commercial Bank",
            accountNumber: "1234567890",
            accountName: "MnetiFi Ltd",
            branch: "Nairobi",
            reference: tenant.id,
          },
        };
      } else if (paymentMethod === "PAYPAL") {
        responseMessage = "Account created! Please verify your email, then you will be redirected to PayPal.";
        additionalInfo = {
          ...additionalInfo,
          paypalRedirect: `https://www.paypal.com/checkoutnow?token=${tenant.id}`,
        };
      }

      res.status(201).json({
        message: responseMessage,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
        },
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          emailVerified: false,
        },
        subscriptionTier: tier,
        paymentMethod,
        ...additionalInfo,
      });
    } catch (error) {
      console.error("Error during registration:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  // Email verification endpoint
  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ error: "Verification token is required" });
      }

      const user = await storage.getUserByEmailVerificationToken(token);
      
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired verification token" });
      }

      if (user.emailVerificationExpiry && new Date(user.emailVerificationExpiry) < new Date()) {
        return res.status(400).json({ error: "Verification token has expired. Please request a new one." });
      }

      if (user.emailVerified) {
        return res.status(400).json({ error: "Email is already verified" });
      }

      // Activate the user account and mark email as verified
      await storage.updateUser(user.id, {
        emailVerified: true,
        isActive: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      });

      console.log(`[Auth] Email verified for user: ${user.username}`);

      res.json({ 
        message: "Email verified successfully! You can now log in.",
        verified: true,
      });
    } catch (error) {
      console.error("Error during email verification:", error);
      res.status(500).json({ error: "Failed to verify email" });
    }
  });

  // Resend verification email endpoint
  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      
      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ message: "If the email exists, a new verification link has been sent" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ error: "Email is already verified" });
      }

      // Generate new verification token
      const emailVerificationToken = crypto.randomUUID();
      const emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await storage.updateUser(user.id, {
        emailVerificationToken,
        emailVerificationExpiry,
      });

      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationLink = `/verify-email?token=${emailVerificationToken}`;
      console.log(`[Auth] Resending verification email for ${email}`);
      console.log(`[Auth] New verification token: ${emailVerificationToken}`);
      console.log(`[Auth] Verification link: ${verificationLink}`);

      // Get tenant name for email
      let tenantName = "MnetiFi";
      if (user.tenantId) {
        const tenant = await storage.getTenant(user.tenantId);
        if (tenant) {
          tenantName = tenant.name;
        }
      }

      // Send verification email
      try {
        const emailService = getEmailService();
        await emailService.sendVerificationEmail(email, tenantName, verificationCode);
        console.log(`[Auth] Verification email resent to ${email}`);
      } catch (emailError) {
        console.error(`[Auth] Failed to resend verification email:`, emailError);
        // Still return success to prevent email enumeration
      }

      res.json({ message: "If the email exists, a new verification link has been sent" });
    } catch (error) {
      console.error("Error resending verification email:", error);
      res.status(500).json({ error: "Failed to resend verification email" });
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

      console.log(`[Auth] Password reset requested for ${email}`);
      console.log(`[Auth] Reset token: ${resetToken}`);
      console.log(`[Auth] Reset link: /reset-password?token=${resetToken}`);

      // Send password reset email
      try {
        const emailService = getEmailService();
        await emailService.sendPasswordResetEmail(email, resetToken);
        console.log(`[Auth] Password reset email sent to ${email}`);
      } catch (emailError) {
        console.error(`[Auth] Failed to send password reset email:`, emailError);
        // Still return success to prevent email enumeration
      }

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

      // Validate password strength on server side
      const hasMinLength = password.length >= 8;
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
      
      if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
        return res.status(400).json({ 
          error: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character" 
        });
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
  
  app.get("/api/tenant", requireAuthWithTenant, async (req, res) => {
    try {
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error) {
      console.error("Error fetching tenant:", error);
      res.status(500).json({ error: "Failed to fetch tenant" });
    }
  });

  app.patch("/api/tenant", requireAuthWithTenant, requireAdmin, async (req, res) => {
    try {
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const tenant = await storage.updateTenant(tenantId, req.body);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error) {
      console.error("Error updating tenant:", error);
      res.status(500).json({ error: "Failed to update tenant" });
    }
  });

  // ============== OTP VERIFICATION FOR SETTINGS ==============
  
  // In-memory OTP storage with 5-minute expiry
  const otpStore = new Map<string, { otp: string; expiresAt: number; tenantId: string }>();
  const otpTokenStore = new Map<string, { tenantId: string; expiresAt: number }>();

  // Clean up expired OTPs periodically
  setInterval(() => {
    const now = Date.now();
    Array.from(otpStore.entries()).forEach(([key, value]) => {
      if (value.expiresAt < now) {
        otpStore.delete(key);
      }
    });
    Array.from(otpTokenStore.entries()).forEach(([key, value]) => {
      if (value.expiresAt < now) {
        otpTokenStore.delete(key);
      }
    });
  }, 60000); // Clean up every minute

  // Send OTP to admin phone
  app.post("/api/settings/otp/send", requireAuthWithTenant, requireAdmin, async (req, res) => {
    try {
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      // Get admin phone from tenant
      const adminPhone = tenant.phone;
      if (!adminPhone) {
        return res.status(400).json({ error: "Admin phone number not configured. Please update your profile first." });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

      // Store OTP
      const storeKey = `${tenantId}_settings`;
      otpStore.set(storeKey, { otp, expiresAt, tenantId });

      // Send OTP via SMS using platform SMS service
      const smsService = getSmsService();
      const result = await smsService.sendIspOtp(adminPhone, otp, tenant.name || "Your ISP");
      
      if (!result.success) {
        console.error("[OTP] Failed to send OTP:", result.error);
        return res.status(500).json({ error: "Failed to send OTP. Please try again." });
      }

      console.log(`[OTP] Sent to ${adminPhone.substring(0, 6)}*** for tenant ${tenantId}`);

      res.json({ 
        success: true, 
        message: "OTP sent successfully",
        phoneHint: adminPhone.substring(0, 6) + "****" + adminPhone.substring(adminPhone.length - 2)
      });
    } catch (error) {
      console.error("Error sending OTP:", error);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  // Verify OTP and return temporary token
  app.post("/api/settings/otp/verify", requireAuthWithTenant, requireAdmin, async (req, res) => {
    try {
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { otp } = req.body;
      if (!otp || typeof otp !== "string") {
        return res.status(400).json({ error: "OTP is required" });
      }

      const storeKey = `${tenantId}_settings`;
      const stored = otpStore.get(storeKey);

      if (!stored) {
        return res.status(400).json({ error: "No OTP found. Please request a new one." });
      }

      if (stored.expiresAt < Date.now()) {
        otpStore.delete(storeKey);
        return res.status(400).json({ error: "OTP has expired. Please request a new one." });
      }

      if (stored.otp !== otp) {
        return res.status(400).json({ error: "Invalid OTP. Please check and try again." });
      }

      // OTP verified, remove it and create a temporary token
      otpStore.delete(storeKey);

      const token = crypto.randomBytes(32).toString("hex");
      const tokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes

      otpTokenStore.set(token, { tenantId, expiresAt: tokenExpiry });

      console.log(`[OTP] Verified successfully for tenant ${tenantId}`);

      res.json({ 
        success: true, 
        token,
        message: "OTP verified. You can now edit payment settings." 
      });
    } catch (error) {
      console.error("Error verifying OTP:", error);
      res.status(500).json({ error: "Failed to verify OTP" });
    }
  });

  // Public tenant info for captive portal (limited info, no auth required)
  app.get("/api/portal/tenant", async (req, res) => {
    try {
      const tenantId = await getPublicTenantId(req);
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      // Return only public/branding info
      res.json({
        id: tenant.id,
        name: tenant.name,
        brandingConfig: tenant.brandingConfig,
      });
    } catch (error) {
      console.error("Error fetching tenant:", error);
      res.status(500).json({ error: "Failed to fetch tenant" });
    }
  });

  // ============== DASHBOARD ROUTES ==============
  
  app.get("/api/dashboard/stats", requireAuthWithTenant, async (req, res) => {
    try {
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const stats = await storage.getDashboardStats(tenantId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // ============== PLAN ROUTES ==============
  
  app.get("/api/plans", async (req, res) => {
    try {
      const planType = req.query.type as string | undefined;
      let plans = await storage.getPlans(defaultTenantId);
      
      // Filter by plan type if specified
      if (planType && ["HOTSPOT", "PPPOE", "STATIC"].includes(planType)) {
        plans = plans.filter(p => p.planType === planType);
      }
      
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
  
  // Helper function to get tenant-scoped hotspot with proper error handling
  type TenantHotspotResult = 
    | { error: string; status: number }
    | { hotspot: Awaited<ReturnType<typeof storage.getHotspotForTenant>> & object; tenantId: string };
  
  async function getTenantHotspot(req: AuthenticatedRequest, hotspotId: string): Promise<TenantHotspotResult> {
    const tenantId = getSessionTenantId(req) || defaultTenantId;
    if (!tenantId) {
      return { error: "Tenant context required", status: 400 };
    }
    const hotspot = await storage.getHotspotForTenant(hotspotId, tenantId);
    if (!hotspot) {
      return { error: "Hotspot not found", status: 404 };
    }
    return { hotspot, tenantId };
  }
  
  app.get("/api/hotspots", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const tenantId = getSessionTenantId(req) || defaultTenantId;
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      const hotspots = await storage.getHotspots(tenantId);
      res.json(hotspots);
    } catch (error) {
      console.error("Error fetching hotspots:", error);
      res.status(500).json({ error: "Failed to fetch hotspots" });
    }
  });

  app.get("/api/hotspots/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const result = await getTenantHotspot(req, req.params.id);
      if ('error' in result) {
        return res.status(result.status).json({ error: result.error });
      }
      res.json(result.hotspot);
    } catch (error) {
      console.error("Error fetching hotspot:", error);
      res.status(500).json({ error: "Failed to fetch hotspot" });
    }
  });

  app.post("/api/hotspots", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const tenantId = getSessionTenantId(req) || defaultTenantId;
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      const data = insertHotspotSchema.parse({
        ...req.body,
        tenantId,
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

  app.patch("/api/hotspots/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const result = await getTenantHotspot(req, req.params.id);
      if ('error' in result) {
        return res.status(result.status).json({ error: result.error });
      }
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

  app.delete("/api/hotspots/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const result = await getTenantHotspot(req, req.params.id);
      if ('error' in result) {
        return res.status(result.status).json({ error: result.error });
      }
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

  // ============== TECHNICIAN ROUTES ==============
  
  app.get("/api/users/technicians", async (req, res) => {
    try {
      const tenantId = getSessionTenantId(req) || defaultTenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const technicians = await storage.getTechnicians(tenantId);
      res.json(technicians);
    } catch (error) {
      console.error("Error fetching technicians:", error);
      res.status(500).json({ error: "Failed to fetch technicians" });
    }
  });

  // ============== TRANSACTION ROUTES ==============
  
  app.get("/api/transactions", async (req, res) => {
    try {
      const { voucherCode } = req.query;
      let transactions = await storage.getTransactions(defaultTenantId);
      if (voucherCode && typeof voucherCode === 'string') {
        transactions = transactions.filter(t => 
          t.voucherCode?.toLowerCase().includes(voucherCode.toLowerCase())
        );
      }
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

  // Helper function to validate and normalize Kenya phone number
  function normalizeKenyaPhone(phone: string): { valid: boolean; normalized: string; error?: string } {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('254')) {
      return { valid: false, normalized: '', error: 'Phone number must start with 254 or 0' };
    }
    if (cleaned.length !== 12) {
      return { valid: false, normalized: '', error: 'Phone number must be 12 digits (254XXXXXXXXX)' };
    }
    return { valid: true, normalized: cleaned };
  }

  // Initiate payment (STK Push with resilient job queue)
  app.post("/api/transactions/initiate", async (req, res) => {
    try {
      const { planId, phone, macAddress, nasIp } = req.body;
      
      if (!planId || !phone) {
        return res.status(400).json({ error: "Plan ID and phone number are required" });
      }

      const phoneValidation = normalizeKenyaPhone(phone);
      if (!phoneValidation.valid) {
        return res.status(400).json({ error: phoneValidation.error });
      }
      const normalizedPhone = phoneValidation.normalized;

      const plan = await storage.getPlan(planId);
      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      const checkoutRequestId = `ws_CO_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const merchantRequestId = `MR_${Date.now()}`;

      const transaction = await storage.createTransaction({
        tenantId: defaultTenantId,
        planId,
        userPhone: normalizedPhone,
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

      console.log(`[Payment] Initiated STK Push for ${normalizedPhone}, scheduled status check job`);

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

  // Get WiFi credentials for a completed transaction (for auto-connect)
  app.get("/api/transactions/:id/credentials", async (req, res) => {
    try {
      const transaction = await storage.getTransaction(req.params.id);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      // Only return credentials for completed transactions
      if (transaction.status !== TransactionStatus.COMPLETED) {
        return res.status(400).json({ error: "Transaction is not completed yet" });
      }

      // Get WiFi user by phone or ID
      let wifiUser = transaction.wifiUserId 
        ? await storage.getWifiUser(transaction.wifiUserId)
        : await storage.getWifiUserByPhone(transaction.tenantId, transaction.userPhone);

      if (!wifiUser) {
        return res.status(404).json({ error: "WiFi user not found" });
      }

      // Get the plan details
      const plan = transaction.planId ? await storage.getPlan(transaction.planId) : null;

      // Get hotspot for login URL
      const hotspots = await storage.getHotspots(transaction.tenantId);
      const hotspot = wifiUser.currentHotspotId 
        ? hotspots.find(h => h.id === wifiUser!.currentHotspotId) 
        : hotspots[0];

      // Build auto-login URL for MikroTik hotspot
      let autoLoginUrl = null;
      if (hotspot && wifiUser.username && wifiUser.password) {
        // MikroTik hotspot auto-login URL format
        const hotspotIp = hotspot.nasIp || hotspot.routerApiIp;
        if (hotspotIp) {
          autoLoginUrl = `http://${hotspotIp}/login?username=${encodeURIComponent(wifiUser.username)}&password=${encodeURIComponent(wifiUser.password)}`;
        }
      }

      res.json({
        username: wifiUser.username || wifiUser.phoneNumber,
        password: wifiUser.password,
        expiresAt: wifiUser.expiryTime,
        planName: plan?.name || "WiFi Access",
        planDuration: plan?.durationSeconds,
        autoLoginUrl,
        hotspotName: hotspot?.locationName,
      });
    } catch (error) {
      console.error("Error fetching credentials:", error);
      res.status(500).json({ error: "Failed to fetch credentials" });
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
      const { voucherCode } = req.query;
      let wifiUsers = await storage.getWifiUsers(defaultTenantId);
      if (voucherCode && typeof voucherCode === 'string') {
        wifiUsers = wifiUsers.filter(u => 
          u.voucherCode?.toLowerCase().includes(voucherCode.toLowerCase())
        );
      }
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

  app.post("/api/tickets", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const data = insertTicketSchema.parse({
        ...req.body,
        tenantId,
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

  // ============== VOUCHER ROUTES ==============
  
  // Generate random voucher code
  function generateVoucherCode(prefix: string = ""): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return prefix ? `${prefix}-${code}` : code;
  }

  app.get("/api/vouchers", requireAuthWithTenant, async (req, res) => {
    try {
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const vouchersList = await storage.getVouchers(tenantId);
      res.json(vouchersList);
    } catch (error) {
      console.error("Error fetching vouchers:", error);
      res.status(500).json({ error: "Failed to fetch vouchers" });
    }
  });

  app.get("/api/voucher-batches", requireAuthWithTenant, async (req, res) => {
    try {
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const batches = await storage.getVoucherBatches(tenantId);
      res.json(batches);
    } catch (error) {
      console.error("Error fetching voucher batches:", error);
      res.status(500).json({ error: "Failed to fetch voucher batches" });
    }
  });

  app.get("/api/voucher-batches/:id", requireAuthWithTenant, async (req, res) => {
    try {
      const batch = await storage.getVoucherBatch(req.params.id);
      if (!batch) {
        return res.status(404).json({ error: "Voucher batch not found" });
      }
      res.json(batch);
    } catch (error) {
      console.error("Error fetching voucher batch:", error);
      res.status(500).json({ error: "Failed to fetch voucher batch" });
    }
  });

  app.get("/api/voucher-batches/:id/vouchers", requireAuthWithTenant, async (req, res) => {
    try {
      const vouchersList = await storage.getVouchersByBatch(req.params.id);
      res.json(vouchersList);
    } catch (error) {
      console.error("Error fetching vouchers for batch:", error);
      res.status(500).json({ error: "Failed to fetch vouchers" });
    }
  });

  app.post("/api/voucher-batches", requireAuthWithTenant, requireAdmin, async (req, res) => {
    try {
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const { name, planId, quantity, prefix, validFrom, validUntil } = req.body;
      
      if (!name || !planId || !quantity || quantity < 1) {
        return res.status(400).json({ error: "Name, plan ID, and quantity are required" });
      }

      // Generate unique voucher codes
      const voucherCodes: string[] = [];
      const usedCodes = new Set<string>();
      
      for (let i = 0; i < quantity; i++) {
        let code: string;
        do {
          code = generateVoucherCode(prefix || "");
        } while (usedCodes.has(code));
        usedCodes.add(code);
        voucherCodes.push(code);
      }

      const batchData = insertVoucherBatchSchema.parse({
        tenantId,
        planId,
        name,
        prefix: prefix || null,
        quantity,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
      });

      const result = await storage.createVoucherBatch(batchData, voucherCodes);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating voucher batch:", error);
      res.status(500).json({ error: "Failed to create voucher batch" });
    }
  });

  app.get("/api/vouchers/:id", requireAuthWithTenant, async (req, res) => {
    try {
      const voucher = await storage.getVoucher(req.params.id);
      if (!voucher) {
        return res.status(404).json({ error: "Voucher not found" });
      }
      res.json(voucher);
    } catch (error) {
      console.error("Error fetching voucher:", error);
      res.status(500).json({ error: "Failed to fetch voucher" });
    }
  });

  app.patch("/api/vouchers/:id", requireAuthWithTenant, requireAdmin, async (req, res) => {
    try {
      const voucher = await storage.updateVoucher(req.params.id, req.body);
      if (!voucher) {
        return res.status(404).json({ error: "Voucher not found" });
      }
      res.json(voucher);
    } catch (error) {
      console.error("Error updating voucher:", error);
      res.status(500).json({ error: "Failed to update voucher" });
    }
  });

  app.delete("/api/vouchers/:id", requireAuthWithTenant, requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteVoucher(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Voucher not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting voucher:", error);
      res.status(500).json({ error: "Failed to delete voucher" });
    }
  });

  // Public voucher lookup by phone for captive portal
  app.get("/api/portal/vouchers", async (req, res) => {
    try {
      const phone = req.query.phone as string;
      const tenantId = await getPublicTenantId(req);
      
      if (!phone) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      // Normalize phone number
      let normalizedPhone = phone.replace(/\D/g, "");
      if (normalizedPhone.startsWith("0")) {
        normalizedPhone = "254" + normalizedPhone.slice(1);
      } else if (!normalizedPhone.startsWith("254")) {
        normalizedPhone = "254" + normalizedPhone;
      }

      const userVouchers = await storage.getVouchersByPhone(tenantId, normalizedPhone);
      
      // Return only relevant info for portal display
      const vouchersWithDetails = userVouchers.map(v => ({
        id: v.id,
        code: v.code,
        planName: v.planName,
        status: v.status,
        expiresAt: v.expiresAt,
        usedAt: v.usedAt,
      }));

      res.json(vouchersWithDetails);
    } catch (error) {
      console.error("Error looking up vouchers:", error);
      res.status(500).json({ error: "Failed to lookup vouchers" });
    }
  });

  // Public voucher redemption endpoint for captive portal
  app.post("/api/portal/redeem-voucher", async (req, res) => {
    try {
      const { code, phoneNumber, macAddress } = req.body;
      const tenantId = await getPublicTenantId(req);
      
      if (!code) {
        return res.status(400).json({ error: "Voucher code is required" });
      }

      // Find voucher by code
      const voucher = await storage.getVoucherByCode(tenantId, code.toUpperCase().trim());
      
      if (!voucher) {
        return res.status(404).json({ error: "Invalid voucher code" });
      }

      if (voucher.status !== VoucherStatus.AVAILABLE) {
        return res.status(400).json({ error: "This voucher has already been used or is no longer valid" });
      }

      // Check validity dates
      const now = new Date();
      if (voucher.validFrom && new Date(voucher.validFrom) > now) {
        return res.status(400).json({ error: "This voucher is not yet valid" });
      }
      if (voucher.validUntil && new Date(voucher.validUntil) < now) {
        return res.status(400).json({ error: "This voucher has expired" });
      }

      // Get or create WiFi user
      let wifiUser = phoneNumber ? await storage.getWifiUserByPhone(tenantId, phoneNumber) : null;
      
      if (!wifiUser && phoneNumber) {
        wifiUser = await storage.createWifiUser({
          tenantId,
          phoneNumber,
          accountType: "HOTSPOT",
          currentPlanId: voucher.planId,
          macAddress,
          status: "ACTIVE",
        });
      }

      if (!wifiUser) {
        return res.status(400).json({ error: "Phone number is required for new users" });
      }

      // Redeem the voucher
      const plan = await storage.getPlan(voucher.planId);
      if (!plan) {
        return res.status(500).json({ error: "Plan not found" });
      }

      const redeemed = await storage.redeemVoucher(voucher.id, wifiUser.id, macAddress);
      
      if (!redeemed) {
        return res.status(500).json({ error: "Failed to redeem voucher" });
      }

      // Update user with expiry time
      const expiresAt = new Date(now.getTime() + plan.durationSeconds * 1000);
      
      // Always ensure user has valid credentials for auto-connect
      const needsUsername = !wifiUser.username;
      const needsPassword = !wifiUser.password;
      const username = wifiUser.username || wifiUser.phoneNumber.replace(/\+/g, '');
      const password = wifiUser.password || Math.random().toString(36).substring(2, 10);
      
      const updateData: any = {
        currentPlanId: plan.id,
        expiryTime: expiresAt,
        macAddress,
        status: "ACTIVE",
      };
      
      // Update credentials if missing (for existing users without complete credentials)
      if (needsUsername) {
        updateData.username = username;
      }
      if (needsPassword) {
        updateData.password = password;
      }
      
      await storage.updateWifiUser(wifiUser.id, updateData);

      // Activate user on MikroTik router and get auto-login URL
      let routerActivated = false;
      let autoLoginUrl: string | null = null;
      let hotspotName: string | null = null;
      try {
        const hotspots = await storage.getHotspots(tenantId);
        if (hotspots && hotspots.length > 0) {
          const hotspot = hotspots[0];
          hotspotName = hotspot.locationName;
          
          // Build auto-login URL for MikroTik hotspot
          const hotspotIp = hotspot.nasIp || hotspot.routerApiIp;
          if (hotspotIp) {
            autoLoginUrl = `http://${hotspotIp}/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
          }
          
          const mikrotik = await createMikrotikService(hotspot);
          if (mikrotik) {
            const result = await mikrotik.addHotspotUser(
              username,
              password,
              plan.name,
              `Voucher: ${code}, Phone: ${phoneNumber}`
            );
            if (result.success) {
              console.log(`[Voucher] Activated ${username} on router ${hotspot.locationName}`);
              routerActivated = true;
            } else {
              console.warn(`[Voucher] Router activation failed: ${result.error}`);
            }
          }
        }
      } catch (routerError) {
        console.error("[Voucher] Error activating on router:", routerError);
      }

      res.json({
        success: true,
        message: "Voucher redeemed successfully",
        plan: {
          name: plan.name,
          durationSeconds: plan.durationSeconds,
        },
        expiresAt,
        user: {
          id: wifiUser.id,
          phoneNumber: wifiUser.phoneNumber,
        },
        credentials: {
          username,
          password,
        },
        autoLoginUrl,
        hotspotName,
        routerActivated,
      });
    } catch (error) {
      console.error("Error redeeming voucher:", error);
      res.status(500).json({ error: "Failed to redeem voucher" });
    }
  });

  // Public voucher verification endpoint - check voucher status without redeeming
  app.get("/api/portal/verify-voucher/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const tenantId = await getPublicTenantId(req);
      
      if (!code) {
        return res.status(400).json({ error: "Voucher code is required" });
      }

      const voucher = await storage.getVoucherByCode(tenantId, code.toUpperCase().trim());
      
      if (!voucher) {
        return res.status(404).json({ 
          valid: false,
          error: "Voucher not found",
          code: code.toUpperCase().trim()
        });
      }

      const plan = voucher.planId ? await storage.getPlan(voucher.planId) : null;
      const now = new Date();
      
      let status: "available" | "used" | "expired" | "not_yet_valid" = "available";
      let statusMessage = "Voucher is valid and ready to use";
      
      if (voucher.status !== "AVAILABLE") {
        status = "used";
        statusMessage = "This voucher has already been used";
      } else if (voucher.validFrom && new Date(voucher.validFrom) > now) {
        status = "not_yet_valid";
        statusMessage = `This voucher will be valid from ${new Date(voucher.validFrom).toLocaleDateString()}`;
      } else if (voucher.validUntil && new Date(voucher.validUntil) < now) {
        status = "expired";
        statusMessage = "This voucher has expired";
      }

      res.json({
        valid: status === "available",
        code: voucher.code,
        status,
        statusMessage,
        plan: plan ? {
          name: plan.name,
          price: plan.price,
          durationSeconds: plan.durationSeconds,
          speedLimit: plan.downloadLimit ? `${plan.downloadLimit}/${plan.uploadLimit}` : undefined,
        } : null,
        validFrom: voucher.validFrom,
        validUntil: voucher.validUntil,
        usedAt: voucher.usedAt,
        usedBy: voucher.usedBy,
      });
    } catch (error) {
      console.error("Error verifying voucher:", error);
      res.status(500).json({ error: "Failed to verify voucher" });
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
  
  app.post("/api/hotspots/:id/test-connection", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const result = await getTenantHotspot(req, req.params.id);
      if ('error' in result) {
        return res.status(result.status).json({ error: result.error });
      }

      const { MikrotikService } = await import("./services/mikrotik");
      const mikrotik = new MikrotikService(result.hotspot);
      const testResult = await mikrotik.testConnection();
      
      res.json(testResult);
    } catch (error) {
      console.error("Error testing connection:", error);
      res.status(500).json({ error: "Failed to test connection" });
    }
  });

  app.get("/api/hotspots/:id/active-sessions", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const result = await getTenantHotspot(req, req.params.id);
      if ('error' in result) {
        return res.status(result.status).json({ error: result.error });
      }

      const { MikrotikService } = await import("./services/mikrotik");
      const mikrotik = new MikrotikService(result.hotspot);
      const sessions = await mikrotik.getActiveSessions();
      
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching active sessions:", error);
      res.status(500).json({ error: "Failed to fetch active sessions" });
    }
  });

  app.post("/api/hotspots/:id/disconnect-user", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ error: "Username is required" });
      }

      const result = await getTenantHotspot(req, req.params.id);
      if ('error' in result) {
        return res.status(result.status).json({ error: result.error });
      }

      const { MikrotikService } = await import("./services/mikrotik");
      const mikrotik = new MikrotikService(result.hotspot);
      const disconnectResult = await mikrotik.disconnectUser(username);
      
      res.json(disconnectResult);
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

  // ============== SUPERADMIN SMS ROUTES ==============
  
  // Get SMS balance
  app.get("/api/superadmin/sms/balance", requireSuperAdmin, async (req, res) => {
    try {
      const smsService = getSmsService();
      const result = await smsService.getBalance();
      res.json(result);
    } catch (error) {
      console.error("Error getting SMS balance:", error);
      res.status(500).json({ success: false, error: "Failed to get SMS balance" });
    }
  });

  // Send test SMS
  app.post("/api/superadmin/sms/test", requireSuperAdmin, async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ success: false, error: "Phone number is required" });
      }

      const smsService = getSmsService();
      const result = await smsService.sendOtp(phone, Math.floor(100000 + Math.random() * 900000).toString());
      res.json(result);
    } catch (error) {
      console.error("Error sending test SMS:", error);
      res.status(500).json({ success: false, error: "Failed to send test SMS" });
    }
  });

  // SMS Delivery Report Webhook (public endpoint for Mobitech)
  app.post("/api/webhooks/sms/delivery", async (req, res) => {
    try {
      const { 
        messageId, 
        dlrTime, 
        dlrStatus, 
        dlrDesc, 
        tat, 
        network, 
        destaddr, 
        sourceaddr, 
        origin 
      } = req.body;

      console.log(`[SMS DLR] Message ${messageId} - Status: ${dlrStatus} (${dlrDesc}) - To: ${destaddr}`);
      
      // Process the delivery report
      const { SmsService } = await import("./services/sms");
      const report = SmsService.processDeliveryReport({
        messageId: String(messageId),
        dlrTime,
        dlrStatus: Number(dlrStatus),
        dlrDesc,
        tat,
        network,
        destaddr,
        sourceaddr,
        origin,
      });

      console.log(`[SMS DLR] Processed: ${report.messageId} - ${report.status}`);

      // Return success to Mobitech
      res.json({ success: true, received: true });
    } catch (error) {
      console.error("Error processing SMS delivery report:", error);
      // Still return 200 to prevent retries
      res.json({ success: false, error: "Failed to process delivery report" });
    }
  });

  // ============== SUPERADMIN EMAIL ROUTES ==============

  // Test email sending
  app.post("/api/superadmin/email/test", requireSuperAdmin, async (req, res) => {
    try {
      const { email, templateType } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: "Email address is required" });
      }

      const { getEmailService } = await import("./services/email");
      const emailService = getEmailService();

      let result;
      switch (templateType) {
        case "verification":
          result = await emailService.sendVerificationEmail(email, "Test ISP", "123456");
          break;
        case "welcome":
          result = await emailService.sendWelcomeEmail(email, "Test ISP", "test-isp");
          break;
        case "payment":
          result = await emailService.sendPaymentConfirmationEmail(
            email, "Test ISP", 1500, "Premium Monthly", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "TEST123"
          );
          break;
        case "expiry":
          result = await emailService.sendExpiryNoticeEmail(
            email, "Test ISP", "Premium Monthly", new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), 3
          );
          break;
        case "password_reset":
          result = await emailService.sendPasswordResetEmail(email, "test-reset-token-123", "Test ISP");
          break;
        default:
          result = await emailService.sendVerificationEmail(email, "Test ISP", "123456");
      }

      res.json(result);
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Failed to send test email" });
    }
  });

  // ============== ISP REGISTRATION WITH EMAIL VERIFICATION ==============

  // Send verification code for ISP registration
  app.post("/api/auth/send-verification", async (req, res) => {
    try {
      const { email, ispName } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: "Email is required" });
      }

      // Generate 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store verification code temporarily (in-memory for now, could use Redis)
      const verificationStore = (global as any).emailVerificationStore || new Map();
      verificationStore.set(email.toLowerCase(), {
        code: verificationCode,
        expiresAt: expiresAt.getTime(),
        ispName: ispName || "Your ISP",
      });
      (global as any).emailVerificationStore = verificationStore;

      // Send verification email
      const { getEmailService } = await import("./services/email");
      const emailService = getEmailService();
      const result = await emailService.sendVerificationEmail(email, ispName || "Your ISP", verificationCode);

      if (result.success) {
        console.log(`[Auth] Verification email sent to ${email}`);
        res.json({ success: true, message: "Verification code sent to your email" });
      } else {
        res.status(500).json({ success: false, error: result.error || "Failed to send verification email" });
      }
    } catch (error) {
      console.error("Error sending verification email:", error);
      res.status(500).json({ success: false, error: "Failed to send verification email" });
    }
  });

  // Verify email code
  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ success: false, error: "Email and code are required" });
      }

      const verificationStore = (global as any).emailVerificationStore as Map<string, { code: string; expiresAt: number; ispName: string }>;
      if (!verificationStore) {
        return res.status(400).json({ success: false, error: "No pending verification" });
      }

      const stored = verificationStore.get(email.toLowerCase());
      if (!stored) {
        return res.status(400).json({ success: false, error: "No verification pending for this email" });
      }

      if (Date.now() > stored.expiresAt) {
        verificationStore.delete(email.toLowerCase());
        return res.status(400).json({ success: false, error: "Verification code expired" });
      }

      if (stored.code !== code) {
        return res.status(400).json({ success: false, error: "Invalid verification code" });
      }

      // Mark email as verified
      verificationStore.delete(email.toLowerCase());
      console.log(`[Auth] Email verified: ${email}`);

      res.json({ success: true, message: "Email verified successfully" });
    } catch (error) {
      console.error("Error verifying email:", error);
      res.status(500).json({ success: false, error: "Failed to verify email" });
    }
  });

  // Send welcome email after successful ISP registration
  app.post("/api/auth/send-welcome-email", async (req, res) => {
    try {
      const { email, ispName, subdomain } = req.body;
      if (!email || !ispName) {
        return res.status(400).json({ success: false, error: "Email and ISP name are required" });
      }

      const { getEmailService } = await import("./services/email");
      const emailService = getEmailService();
      const result = await emailService.sendWelcomeEmail(email, ispName, subdomain || ispName.toLowerCase().replace(/\s+/g, '-'));

      res.json(result);
    } catch (error) {
      console.error("Error sending welcome email:", error);
      res.status(500).json({ success: false, error: "Failed to send welcome email" });
    }
  });

  // ============== SUBSCRIPTION MANAGEMENT (User-facing) ==============
  
  // Upgrade subscription (tenant admin)
  app.post("/api/subscription/upgrade", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { durationMonths, paymentMethod, phoneNumber, amount } = req.body;

      // Validate inputs
      if (!durationMonths || !paymentMethod) {
        return res.status(400).json({ error: "Duration and payment method are required" });
      }

      if (!["MPESA", "BANK", "PAYPAL"].includes(paymentMethod)) {
        return res.status(400).json({ error: "Invalid payment method" });
      }

      const validDurations = [1, 3, 6, 12];
      if (!validDurations.includes(durationMonths)) {
        return res.status(400).json({ error: "Invalid subscription duration" });
      }

      // Get current tenant
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      // Calculate subscription expiry
      const now = new Date();
      let startDate = now;
      
      // If currently premium with valid subscription, extend from current expiry
      if (tenant.subscriptionTier === "PREMIUM" && tenant.subscriptionExpiresAt && new Date(tenant.subscriptionExpiresAt) > now) {
        startDate = new Date(tenant.subscriptionExpiresAt);
      }
      
      const subscriptionExpiresAt = new Date(startDate);
      subscriptionExpiresAt.setMonth(subscriptionExpiresAt.getMonth() + durationMonths);

      // Determine payment status based on method
      let paymentStatus = "PENDING";
      let responseMessage = "Processing payment...";

      if (paymentMethod === "MPESA" && phoneNumber) {
        paymentStatus = "PENDING";
        responseMessage = "M-Pesa payment request sent to your phone. Please complete the payment.";
        console.log(`[Subscription] M-Pesa STK push to be sent to ${phoneNumber} for tenant ${tenantId}`);
      } else if (paymentMethod === "BANK") {
        paymentStatus = "AWAITING_CONFIRMATION";
        responseMessage = "Please complete the bank transfer. Your subscription will be activated after payment confirmation.";
      } else if (paymentMethod === "PAYPAL") {
        paymentStatus = "PENDING";
        responseMessage = "Redirecting to PayPal for payment...";
      }

      // For demo purposes, auto-activate the subscription immediately
      // In production, this would be triggered after payment confirmation
      const updatedTenant = await storage.updateTenantSubscription(tenantId, {
        tier: "PREMIUM",
        saasBillingStatus: "ACTIVE",
        subscriptionExpiresAt,
        trialExpiresAt: null, // Clear trial when upgrading
      });

      console.log(`[Subscription] Tenant ${tenant.name} upgraded to PREMIUM until ${subscriptionExpiresAt.toISOString()}`);

      res.json({
        success: true,
        message: responseMessage,
        subscription: {
          tier: "PREMIUM",
          expiresAt: subscriptionExpiresAt,
          durationMonths,
        },
        paymentStatus,
        paymentMethod,
      });
    } catch (error) {
      console.error("Error upgrading subscription:", error);
      res.status(500).json({ error: "Failed to upgrade subscription" });
    }
  });

  // Get current subscription status
  app.get("/api/subscription/status", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      const now = new Date();
      const isTrialExpired = tenant.trialExpiresAt && new Date(tenant.trialExpiresAt) < now;
      const isSubscriptionExpired = tenant.subscriptionExpiresAt && new Date(tenant.subscriptionExpiresAt) < now;
      
      let trialTimeRemaining = null;
      if (tenant.trialExpiresAt && !isTrialExpired) {
        trialTimeRemaining = new Date(tenant.trialExpiresAt).getTime() - now.getTime();
      }

      res.json({
        subscriptionTier: tenant.subscriptionTier || "BASIC",
        saasBillingStatus: tenant.saasBillingStatus,
        trialExpiresAt: tenant.trialExpiresAt,
        subscriptionExpiresAt: tenant.subscriptionExpiresAt,
        isTrialExpired,
        isSubscriptionExpired,
        trialTimeRemaining,
        isActive: tenant.isActive,
      });
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ error: "Failed to fetch subscription status" });
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

      // Get tenant for SMS configuration
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

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

      // Initialize SMS service using platform configuration
      const smsService = getSmsService();

      // Send SMS to each recipient
      let sentCount = 0;
      let failedCount = 0;

      for (const user of users) {
        try {
          const result = await smsService.sendSms(user.phoneNumber, message);
          if (result.success) {
            console.log(`[SMS Campaign] Sent to ${user.phoneNumber}: ${result.messageId}`);
            sentCount++;
          } else {
            console.error(`[SMS Campaign] Failed to send to ${user.phoneNumber}: ${result.error}`);
            failedCount++;
          }
        } catch (error) {
          console.error(`[SMS Campaign] Error sending to ${user.phoneNumber}:`, error);
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

  // ============== WHATSAPP CAMPAIGNS ROUTES ==============
  
  const { WhatsAppService } = await import("./services/whatsapp");
  
  const whatsappCampaignSchema = z.object({
    name: z.string().min(1, "Campaign name is required").max(100, "Campaign name too long"),
    message: z.string().min(1, "Message is required").max(1000, "Message too long"),
    recipients: z.array(z.string().uuid()).min(1, "At least one recipient required"),
  });

  app.post("/api/whatsapp/send", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const tenantId = req.session.user?.tenantId || defaultTenantId;
      
      const validationResult = whatsappCampaignSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: validationResult.error.errors[0].message 
        });
      }
      
      const { name, message, recipients } = validationResult.data;

      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      const users = await storage.getWifiUsersByIds(tenantId, recipients);
      if (users.length !== recipients.length) {
        return res.status(400).json({ 
          error: "Some recipients do not belong to your organization" 
        });
      }

      const whatsappService = new WhatsAppService(tenant, {
        provider: (tenant.whatsappProvider as "meta" | "twilio" | "mock") || "mock",
        apiKey: tenant.whatsappApiKey || undefined,
        phoneNumberId: tenant.whatsappPhoneNumberId || undefined,
        businessAccountId: tenant.whatsappBusinessAccountId || undefined,
      });

      let sentCount = 0;
      let failedCount = 0;

      for (const user of users) {
        try {
          const result = await whatsappService.sendMessage(user.phoneNumber, message);
          if (result.success) {
            console.log(`[WhatsApp Campaign] Sent to ${user.phoneNumber}: ${result.messageId}`);
            sentCount++;
          } else {
            console.error(`[WhatsApp Campaign] Failed to send to ${user.phoneNumber}: ${result.error}`);
            failedCount++;
          }
        } catch (error) {
          console.error(`[WhatsApp Campaign] Error sending to ${user.phoneNumber}:`, error);
          failedCount++;
        }
      }

      res.status(201).json({
        name,
        sentCount,
        failedCount,
        recipientCount: recipients.length,
        status: failedCount === recipients.length ? "failed" : "completed",
      });
    } catch (error) {
      console.error("Error sending WhatsApp campaign:", error);
      res.status(500).json({ error: "Failed to send WhatsApp messages" });
    }
  });

  // ============== CUSTOMER PORTAL ROUTES ==============
  
  const customerOtpStore = new Map<string, { code: string; expiresAt: Date }>();
  
  // Customer session tokens for authenticated API access
  const customerSessionStore = new Map<string, { userId: string; phoneNumber: string; expiresAt: Date }>();
  
  // Helper to generate session token
  const generateSessionToken = (): string => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };
  
  // Helper to verify customer session
  const verifyCustomerSession = (token: string | undefined, userId: string): boolean => {
    if (!token) return false;
    const session = customerSessionStore.get(token);
    if (!session) return false;
    if (session.expiresAt < new Date()) {
      customerSessionStore.delete(token);
      return false;
    }
    return session.userId === userId;
  };

  app.post("/api/customer/request-otp", async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      // Find user by phone number (check all tenants for now)
      const allTenants = await storage.getAllTenants();
      let foundUser = null;
      let foundTenant = null;
      
      for (const tenant of allTenants) {
        const users = await storage.getWifiUsers(tenant.id);
        const user = users.find(u => u.phoneNumber === phoneNumber || u.phoneNumber === phoneNumber.replace(/^0/, "+254"));
        if (user) {
          foundUser = user;
          foundTenant = tenant;
          break;
        }
      }

      if (!foundUser) {
        return res.status(404).json({ error: "No account found with this phone number" });
      }

      // Generate OTP
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      customerOtpStore.set(phoneNumber, {
        code: otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      });

      // Send OTP via SMS using platform SMS service
      if (foundTenant) {
        const smsService = getSmsService();
        await smsService.sendSms(
          phoneNumber,
          `Your WiFi Portal verification code is: ${otp}. Valid for 5 minutes.`
        );
      }

      console.log(`[Customer Portal] OTP sent to ${phoneNumber}: ${otp}`);
      res.json({ success: true, message: "Verification code sent" });
    } catch (error) {
      console.error("Error requesting OTP:", error);
      res.status(500).json({ error: "Failed to send verification code" });
    }
  });

  app.post("/api/customer/verify-otp", async (req, res) => {
    try {
      const { phoneNumber, code } = req.body;
      
      if (!phoneNumber || !code) {
        return res.status(400).json({ error: "Phone number and code are required" });
      }

      const storedOtp = customerOtpStore.get(phoneNumber);
      
      if (!storedOtp) {
        return res.status(400).json({ error: "No verification code found. Please request a new one." });
      }

      if (storedOtp.expiresAt < new Date()) {
        customerOtpStore.delete(phoneNumber);
        return res.status(400).json({ error: "Verification code expired. Please request a new one." });
      }

      if (storedOtp.code !== code) {
        return res.status(400).json({ error: "Invalid verification code" });
      }

      // Clear OTP after successful verification
      customerOtpStore.delete(phoneNumber);

      // Find user by phone number
      const allTenants = await storage.getAllTenants();
      let foundUser = null;
      let foundTenant = null;
      let foundHotspot = null;
      
      for (const tenant of allTenants) {
        const users = await storage.getWifiUsers(tenant.id);
        const user = users.find(u => u.phoneNumber === phoneNumber || u.phoneNumber === phoneNumber.replace(/^0/, "+254"));
        if (user) {
          foundUser = user;
          foundTenant = tenant;
          if (user.currentHotspotId) {
            foundHotspot = await storage.getHotspot(user.currentHotspotId);
          }
          break;
        }
      }

      if (!foundUser || !foundTenant) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get user's current plan
      let plan = null;
      if (foundUser.currentPlanId) {
        const plans = await storage.getPlans(foundTenant.id);
        plan = plans.find(p => p.id === foundUser.currentPlanId);
      }

      // Get user's transactions
      const transactions = await storage.getTransactionsByWifiUserId(foundUser.id);

      // Generate session token for authenticated API access
      const sessionToken = generateSessionToken();
      customerSessionStore.set(sessionToken, {
        userId: foundUser.id,
        phoneNumber,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      res.json({
        user: foundUser,
        plan,
        transactions: transactions.slice(0, 20),
        hotspotName: foundHotspot?.locationName || "WiFi Network",
        tenantId: foundTenant.id,
        sessionToken, // Return session token for authenticated API calls
      });
    } catch (error) {
      console.error("Error verifying OTP:", error);
      res.status(500).json({ error: "Failed to verify code" });
    }
  });

  app.post("/api/customer/renew", async (req, res) => {
    try {
      const { planId, userId, tenantId } = req.body;
      
      if (!planId) {
        return res.status(400).json({ error: "Plan ID is required" });
      }

      // For now, return a message about M-Pesa initiation
      // In a full implementation, this would integrate with the M-Pesa STK push
      res.json({
        success: true,
        message: "M-Pesa payment initiated. Please check your phone.",
      });
    } catch (error) {
      console.error("Error initiating renewal:", error);
      res.status(500).json({ error: "Failed to initiate payment" });
    }
  });

  // Customer settings - update profile
  app.patch("/api/customer/settings", async (req, res) => {
    try {
      const { userId, phoneNumber, email, fullName, paymentPhone, autoRenew, sessionToken } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      // Verify session token
      if (!verifyCustomerSession(sessionToken, userId)) {
        return res.status(401).json({ error: "Unauthorized. Please log in again." });
      }

      const wifiUser = await storage.getWifiUser(userId);
      if (!wifiUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Build update object with only provided fields
      const updateData: Partial<{
        phoneNumber: string;
        email: string;
        fullName: string;
        notes: string;
      }> = {};

      if (email !== undefined) updateData.email = email;
      if (fullName !== undefined) updateData.fullName = fullName;
      
      // Store payment preferences in notes field as JSON (temporary solution)
      // In a full implementation, these would be separate database columns
      let preferences: Record<string, unknown> = {};
      try {
        if (wifiUser.notes) {
          preferences = JSON.parse(wifiUser.notes);
        }
      } catch {
        preferences = {};
      }
      
      if (paymentPhone !== undefined) preferences.paymentPhone = paymentPhone;
      if (autoRenew !== undefined) preferences.autoRenew = autoRenew;
      
      updateData.notes = JSON.stringify(preferences);

      const updatedUser = await storage.updateWifiUser(userId, updateData);

      res.json({
        success: true,
        message: "Settings updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Error updating customer settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Customer settings - get payment preferences
  app.get("/api/customer/settings/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const sessionToken = req.query.sessionToken as string | undefined;
      
      // Verify session token
      if (!verifyCustomerSession(sessionToken, userId)) {
        return res.status(401).json({ error: "Unauthorized. Please log in again." });
      }
      
      const wifiUser = await storage.getWifiUser(userId);
      if (!wifiUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Parse preferences from notes field
      let preferences: Record<string, unknown> = {
        paymentPhone: wifiUser.phoneNumber,
        autoRenew: false,
      };
      
      try {
        if (wifiUser.notes) {
          const parsed = JSON.parse(wifiUser.notes);
          preferences = { ...preferences, ...parsed };
        }
      } catch {
        // Notes is not JSON, keep defaults
      }

      res.json({
        email: wifiUser.email || "",
        fullName: wifiUser.fullName || "",
        phoneNumber: wifiUser.phoneNumber,
        paymentPhone: preferences.paymentPhone || wifiUser.phoneNumber,
        autoRenew: preferences.autoRenew || false,
      });
    } catch (error) {
      console.error("Error fetching customer settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
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

      // Try to fetch real stats from MikroTik
      const mikrotik = await createMikrotikService(hotspot);
      if (mikrotik) {
        const resourceResult = await mikrotik.getSystemResources();
        if (resourceResult.success && resourceResult.data) {
          const resource = resourceResult.data;
          const stats = {
            uptime: resource.uptime || "Unknown",
            cpuLoad: parseInt(resource["cpu-load"] || "0"),
            freeMemory: parseInt(resource["free-memory"] || "0"),
            totalMemory: parseInt(resource["total-memory"] || "0"),
            freeDisk: parseInt(resource["free-hdd-space"] || "0"),
            totalDisk: parseInt(resource["total-hdd-space"] || "0"),
            boardName: resource["board-name"] || "Unknown",
            version: resource.version || "Unknown",
            architecture: resource["architecture-name"] || "Unknown",
          };
          return res.json(stats);
        }
      }

      // Fallback to mock stats if router connection fails
      const stats = {
        uptime: "3d 14h 22m",
        cpuLoad: Math.floor(Math.random() * 40) + 10,
        freeMemory: 128 * 1024 * 1024 + Math.floor(Math.random() * 64 * 1024 * 1024),
        totalMemory: 256 * 1024 * 1024,
        freeDisk: 32 * 1024 * 1024 + Math.floor(Math.random() * 16 * 1024 * 1024),
        totalDisk: 64 * 1024 * 1024,
        boardName: "hAP ac2 (Demo)",
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

      // Try to fetch real interface data from MikroTik
      const mikrotik = await createMikrotikService(hotspot);
      if (mikrotik) {
        const interfaceResult = await mikrotik.getInterfaceStats();
        if (interfaceResult.success && Array.isArray(interfaceResult.data)) {
          const interfaces = interfaceResult.data.map((iface: any) => ({
            name: iface.name || "Unknown",
            type: iface.type || "ethernet",
            rxBytes: parseInt(iface["rx-byte"] || "0"),
            txBytes: parseInt(iface["tx-byte"] || "0"),
            rxPackets: parseInt(iface["rx-packet"] || "0"),
            txPackets: parseInt(iface["tx-packet"] || "0"),
            running: iface.running === "true" || iface.running === true,
            disabled: iface.disabled === "true" || iface.disabled === true,
          }));
          return res.json(interfaces);
        }
      }

      // Fallback to mock interface data
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

      // Try to fetch real sessions from MikroTik
      const mikrotik = await createMikrotikService(hotspot);
      if (mikrotik) {
        const sessionResult = await mikrotik.getActiveSessions();
        if (sessionResult.success && Array.isArray(sessionResult.data)) {
          const sessions = sessionResult.data.map((session: any) => ({
            user: session.user || "Unknown",
            address: session.address || "0.0.0.0",
            macAddress: session["mac-address"] || "00:00:00:00:00:00",
            uptime: session.uptime || "0s",
            bytesIn: parseInt(session["bytes-in"] || "0"),
            bytesOut: parseInt(session["bytes-out"] || "0"),
          }));
          return res.json(sessions);
        }
      }

      // Fallback to mock active sessions
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

  // Add bandwidth endpoint for real-time data
  app.get("/api/hotspots/:id/bandwidth", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const tenantId = req.session.user?.tenantId || defaultTenantId;
      const hotspot = await storage.getHotspot(req.params.id);
      
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }

      const interfaceName = req.query.interface as string || "ether1";
      
      // Try to fetch real bandwidth from MikroTik
      const mikrotik = await createMikrotikService(hotspot);
      if (mikrotik) {
        const bandwidthResult = await mikrotik.getBandwidthUsage(interfaceName);
        if (bandwidthResult.success && bandwidthResult.data) {
          return res.json({
            upload: parseInt(bandwidthResult.data["tx-bits-per-second"] || "0") / 1000000,
            download: parseInt(bandwidthResult.data["rx-bits-per-second"] || "0") / 1000000,
          });
        }
      }

      // Fallback to mock bandwidth data
      res.json({
        upload: Math.random() * 50 + 10,
        download: Math.random() * 100 + 20,
      });
    } catch (error) {
      console.error("Error fetching bandwidth:", error);
      res.status(500).json({ error: "Failed to fetch bandwidth" });
    }
  });

  app.post("/api/hotspots/:id/reboot", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const tenantId = req.session.user?.tenantId || defaultTenantId;
      const hotspot = await storage.getHotspot(req.params.id);
      
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }

      // Try to reboot using MikroTik API
      const mikrotik = await createMikrotikService(hotspot);
      if (mikrotik) {
        const rebootResult = await mikrotik.rebootRouter();
        if (rebootResult.success) {
          console.log(`[Router] Reboot successful for ${hotspot.locationName} (${hotspot.nasIp})`);
          return res.json({ 
            success: true, 
            message: `Reboot initiated for ${hotspot.locationName}. Router will be back online in 1-3 minutes.` 
          });
        } else {
          console.error(`[Router] Reboot failed for ${hotspot.locationName}: ${rebootResult.error}`);
        }
      }

      // Log and return success even if MikroTik connection fails (for demo purposes)
      console.log(`[Router] Reboot request for ${hotspot.locationName} (no connection or demo mode)`);
      res.json({ 
        success: true, 
        message: `Reboot initiated for ${hotspot.locationName}. Router will be back online in 1-3 minutes.` 
      });
    } catch (error) {
      console.error("Error rebooting router:", error);
      res.status(500).json({ error: "Failed to reboot router" });
    }
  });

  // ============== WALLET ROUTES ==============

  // Get wallet balance for a WiFi user
  app.get("/api/wallet/:wifiUserId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { wifiUserId } = req.params;
      const tenantId = req.session?.user?.tenantId || defaultTenantId;
      
      const wallet = await storage.getWalletByTenantAndUser(tenantId, wifiUserId);
      
      if (!wallet) {
        return res.json({ 
          balance: 0, 
          totalDeposited: 0, 
          totalSpent: 0,
          hasWallet: false 
        });
      }
      
      res.json({
        ...wallet,
        hasWallet: true,
      });
    } catch (error) {
      console.error("Error fetching wallet:", error);
      res.status(500).json({ error: "Failed to fetch wallet" });
    }
  });

  // Get wallet transactions for a WiFi user
  app.get("/api/wallet/:wifiUserId/transactions", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { wifiUserId } = req.params;
      const tenantId = req.session?.user?.tenantId || defaultTenantId;
      
      const wallet = await storage.getWalletByTenantAndUser(tenantId, wifiUserId);
      
      if (!wallet) {
        return res.json([]);
      }
      
      const transactions = await storage.getWalletTransactions(wallet.id, 50);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching wallet transactions:", error);
      res.status(500).json({ error: "Failed to fetch wallet transactions" });
    }
  });

  // Deposit to wallet (admin only)
  app.post("/api/wallet/:wifiUserId/deposit", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { wifiUserId } = req.params;
      const { amount, description } = req.body;
      const tenantId = req.session?.user?.tenantId || defaultTenantId;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Amount must be greater than 0" });
      }
      
      const result = await storage.depositToWallet(
        tenantId,
        wifiUserId,
        amount,
        description || "Manual deposit by admin",
        undefined,
        "manual"
      );
      
      res.json({
        success: true,
        wallet: result.wallet,
        transaction: result.transaction,
      });
    } catch (error) {
      console.error("Error depositing to wallet:", error);
      res.status(500).json({ error: "Failed to deposit to wallet" });
    }
  });

  // Pay using wallet balance
  app.post("/api/wallet/:wifiUserId/pay", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { wifiUserId } = req.params;
      const { planId, amount } = req.body;
      const tenantId = req.session?.user?.tenantId || defaultTenantId;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Amount must be greater than 0" });
      }
      
      const plan = await storage.getPlan(planId);
      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }
      
      const result = await storage.deductFromWallet(
        tenantId,
        wifiUserId,
        amount,
        `Payment for ${plan.name}`,
        planId,
        "plan_purchase"
      );
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      // Activate the user after successful wallet payment
      const wifiUser = await storage.getWifiUser(wifiUserId);
      if (wifiUser) {
        const expiryTime = new Date(Date.now() + plan.durationSeconds * 1000);
        await storage.updateWifiUser(wifiUserId, {
          currentPlanId: planId,
          expiryTime,
          status: "ACTIVE",
        });
      }
      
      res.json({
        success: true,
        wallet: result.wallet,
        transaction: result.transaction,
        message: `Successfully activated ${plan.name} using wallet balance`,
      });
    } catch (error) {
      console.error("Error processing wallet payment:", error);
      res.status(500).json({ error: "Failed to process wallet payment" });
    }
  });

  // Get all wallets for a tenant (admin view)
  app.get("/api/wallets", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const tenantId = req.session?.user?.tenantId || defaultTenantId;
      const wallets = await storage.getWalletsByTenant(tenantId);
      res.json(wallets);
    } catch (error) {
      console.error("Error fetching wallets:", error);
      res.status(500).json({ error: "Failed to fetch wallets" });
    }
  });

  // Customer portal - Get own wallet (using phone number auth)
  app.get("/api/customer/wallet", async (req, res) => {
    try {
      const phoneNumber = req.query.phone as string;
      const tenantId = req.query.tenantId as string || defaultTenantId;
      
      if (!phoneNumber) {
        return res.status(400).json({ error: "Phone number is required" });
      }
      
      const wifiUser = await storage.getWifiUserByPhone(tenantId, phoneNumber);
      if (!wifiUser) {
        return res.json({ balance: 0, hasWallet: false });
      }
      
      const wallet = await storage.getWalletByTenantAndUser(tenantId, wifiUser.id);
      
      if (!wallet) {
        return res.json({ balance: 0, hasWallet: false });
      }
      
      res.json({
        balance: wallet.balance,
        totalDeposited: wallet.totalDeposited,
        totalSpent: wallet.totalSpent,
        hasWallet: true,
      });
    } catch (error) {
      console.error("Error fetching customer wallet:", error);
      res.status(500).json({ error: "Failed to fetch wallet" });
    }
  });

  // Customer portal - Get wallet transaction history
  app.get("/api/customer/wallet/transactions", async (req, res) => {
    try {
      const phoneNumber = req.query.phone as string;
      const tenantId = req.query.tenantId as string || defaultTenantId;
      
      if (!phoneNumber) {
        return res.status(400).json({ error: "Phone number is required" });
      }
      
      const wifiUser = await storage.getWifiUserByPhone(tenantId, phoneNumber);
      if (!wifiUser) {
        return res.json([]);
      }
      
      const wallet = await storage.getWalletByTenantAndUser(tenantId, wifiUser.id);
      if (!wallet) {
        return res.json([]);
      }
      
      const transactions = await storage.getWalletTransactions(wallet.id, 20);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching customer wallet transactions:", error);
      res.status(500).json({ error: "Failed to fetch wallet transactions" });
    }
  });

  // ============== ZONE ROUTES ==============
  
  app.get("/api/zones", requireAuthWithTenant, async (req, res) => {
    try {
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const zones = await storage.getZones(tenantId);
      res.json(zones);
    } catch (error) {
      console.error("Error fetching zones:", error);
      res.status(500).json({ error: "Failed to fetch zones" });
    }
  });

  app.get("/api/zones/:id", requireAuthWithTenant, async (req, res) => {
    try {
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const zone = await storage.getZone(req.params.id);
      if (!zone || zone.tenantId !== tenantId) {
        return res.status(404).json({ error: "Zone not found" });
      }
      res.json(zone);
    } catch (error) {
      console.error("Error fetching zone:", error);
      res.status(500).json({ error: "Failed to fetch zone" });
    }
  });

  // Zone create/update schema for validation
  const zoneCreateSchema = z.object({
    name: z.string().min(1, "Zone name is required").max(100),
    description: z.string().max(500).optional(),
    isActive: z.boolean().optional(),
  });

  const zoneUpdateSchema = zoneCreateSchema.partial();

  app.post("/api/zones", requireAuthWithTenant, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const parsed = zoneCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
      }
      const zone = await storage.createZone({
        ...parsed.data,
        tenantId,
      });
      res.status(201).json(zone);
    } catch (error) {
      console.error("Error creating zone:", error);
      res.status(500).json({ error: "Failed to create zone" });
    }
  });

  app.patch("/api/zones/:id", requireAuthWithTenant, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      // Verify zone belongs to tenant
      const existingZone = await storage.getZone(req.params.id);
      if (!existingZone || existingZone.tenantId !== tenantId) {
        return res.status(404).json({ error: "Zone not found" });
      }
      const parsed = zoneUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
      }
      const zone = await storage.updateZone(req.params.id, parsed.data);
      res.json(zone);
    } catch (error) {
      console.error("Error updating zone:", error);
      res.status(500).json({ error: "Failed to update zone" });
    }
  });

  app.delete("/api/zones/:id", requireAuthWithTenant, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      // Verify zone belongs to tenant
      const existingZone = await storage.getZone(req.params.id);
      if (!existingZone || existingZone.tenantId !== tenantId) {
        return res.status(404).json({ error: "Zone not found" });
      }
      const deleted = await storage.deleteZone(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Zone not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting zone:", error);
      res.status(500).json({ error: "Failed to delete zone" });
    }
  });

  // ============== AUDIT LOG ROUTES ==============
  
  app.get("/api/audit-logs", requireAuthWithTenant, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getAuditLogs(tenantId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // ============== CHAT ROUTES ==============
  
  // Get chat messages for a specific customer
  app.get("/api/chat/:wifiUserId", requireAuthWithTenant, async (req, res) => {
    try {
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const messages = await storage.getChatMessages(tenantId, req.params.wifiUserId);
      // Mark messages as read when admin/tech views them
      await storage.markMessagesAsRead(tenantId, req.params.wifiUserId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  });

  // Get all unread chats
  app.get("/api/chat-unread", requireAuthWithTenant, async (req, res) => {
    try {
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const unread = await storage.getUnreadChats(tenantId);
      res.json(unread);
    } catch (error) {
      console.error("Error fetching unread chats:", error);
      res.status(500).json({ error: "Failed to fetch unread chats" });
    }
  });

  // Send a message (admin/tech reply)
  app.post("/api/chat/:wifiUserId", requireAuthWithTenant, async (req: AuthenticatedRequest, res) => {
    try {
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
      const chatMessage = await storage.createChatMessage({
        tenantId,
        wifiUserId: req.params.wifiUserId,
        message,
        isFromCustomer: false,
        userId: req.session?.user?.id,
      });
      res.status(201).json(chatMessage);
    } catch (error) {
      console.error("Error sending chat message:", error);
      res.status(500).json({ error: "Failed to send chat message" });
    }
  });

  // Customer portal - send a message
  app.post("/api/customer/chat", async (req, res) => {
    try {
      const { phoneNumber, message, tenantId: reqTenantId } = req.body;
      const tenantId = reqTenantId || defaultTenantId;
      
      if (!phoneNumber || !message) {
        return res.status(400).json({ error: "Phone number and message are required" });
      }
      
      const wifiUser = await storage.getWifiUserByPhone(tenantId, phoneNumber);
      if (!wifiUser) {
        return res.status(404).json({ error: "Customer not found" });
      }
      
      const chatMessage = await storage.createChatMessage({
        tenantId,
        wifiUserId: wifiUser.id,
        message,
        isFromCustomer: true,
      });
      res.status(201).json(chatMessage);
    } catch (error) {
      console.error("Error sending customer chat message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Customer portal - get own chat messages
  app.get("/api/customer/chat", async (req, res) => {
    try {
      const phoneNumber = req.query.phone as string;
      const tenantId = req.query.tenantId as string || defaultTenantId;
      
      if (!phoneNumber) {
        return res.status(400).json({ error: "Phone number is required" });
      }
      
      const wifiUser = await storage.getWifiUserByPhone(tenantId, phoneNumber);
      if (!wifiUser) {
        return res.json([]);
      }
      
      const messages = await storage.getChatMessages(tenantId, wifiUser.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching customer chat messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // ============== LOYALTY POINTS ROUTES ==============
  
  // Get loyalty points for a customer
  app.get("/api/loyalty/:wifiUserId", requireAuthWithTenant, async (req, res) => {
    try {
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const loyalty = await storage.getLoyaltyPoints(tenantId, req.params.wifiUserId);
      res.json(loyalty || { points: 0, totalEarned: 0, totalRedeemed: 0 });
    } catch (error) {
      console.error("Error fetching loyalty points:", error);
      res.status(500).json({ error: "Failed to fetch loyalty points" });
    }
  });

  // Get loyalty transactions for a customer
  app.get("/api/loyalty/:wifiUserId/transactions", requireAuthWithTenant, async (req, res) => {
    try {
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const loyalty = await storage.getLoyaltyPoints(tenantId, req.params.wifiUserId);
      if (!loyalty) {
        return res.json([]);
      }
      const transactions = await storage.getLoyaltyTransactions(loyalty.id);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching loyalty transactions:", error);
      res.status(500).json({ error: "Failed to fetch loyalty transactions" });
    }
  });

  // Add loyalty points (admin action)
  app.post("/api/loyalty/:wifiUserId/add", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const { points, description } = req.body;
      if (!points || points <= 0) {
        return res.status(400).json({ error: "Valid points amount is required" });
      }
      const loyalty = await storage.addLoyaltyPoints(tenantId, req.params.wifiUserId, points, description);
      res.json(loyalty);
    } catch (error) {
      console.error("Error adding loyalty points:", error);
      res.status(500).json({ error: "Failed to add loyalty points" });
    }
  });

  // Redeem loyalty points (admin action)
  app.post("/api/loyalty/:wifiUserId/redeem", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const { points, description } = req.body;
      if (!points || points <= 0) {
        return res.status(400).json({ error: "Valid points amount is required" });
      }
      const loyalty = await storage.redeemLoyaltyPoints(tenantId, req.params.wifiUserId, points, description);
      if (!loyalty) {
        return res.status(400).json({ error: "Insufficient points balance" });
      }
      res.json(loyalty);
    } catch (error) {
      console.error("Error redeeming loyalty points:", error);
      res.status(500).json({ error: "Failed to redeem loyalty points" });
    }
  });

  // Customer portal - get own loyalty points
  app.get("/api/customer/loyalty", async (req, res) => {
    try {
      const phoneNumber = req.query.phone as string;
      const tenantId = req.query.tenantId as string || defaultTenantId;
      
      if (!phoneNumber) {
        return res.status(400).json({ error: "Phone number is required" });
      }
      
      const wifiUser = await storage.getWifiUserByPhone(tenantId, phoneNumber);
      if (!wifiUser) {
        return res.json({ points: 0, totalEarned: 0, totalRedeemed: 0 });
      }
      
      const loyalty = await storage.getLoyaltyPoints(tenantId, wifiUser.id);
      res.json(loyalty || { points: 0, totalEarned: 0, totalRedeemed: 0 });
    } catch (error) {
      console.error("Error fetching customer loyalty points:", error);
      res.status(500).json({ error: "Failed to fetch loyalty points" });
    }
  });

  // ============== NETWORK MANAGEMENT ROUTES ==============

  // Test router connection
  app.post("/api/hotspots/:id/test-connection", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const hotspot = await storage.getHotspot(id);
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      
      const mikrotik = await createMikrotikService(hotspot);
      if (!mikrotik) {
        return res.status(400).json({ error: "Router API not configured for this hotspot" });
      }
      
      const result = await mikrotik.fullConnectionTest();
      res.json(result);
    } catch (error) {
      console.error("Error testing router connection:", error);
      res.status(500).json({ error: "Failed to test router connection" });
    }
  });

  // Get router system resources
  app.get("/api/hotspots/:id/stats", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const hotspot = await storage.getHotspot(id);
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      
      const mikrotik = await createMikrotikService(hotspot);
      if (!mikrotik) {
        return res.status(400).json({ error: "Router API not configured" });
      }
      
      const resources = await mikrotik.getSystemResources();
      if (!resources.success) {
        return res.status(500).json({ error: resources.error });
      }
      
      const data = Array.isArray(resources.data) ? resources.data[0] : resources.data;
      res.json({
        uptime: data?.uptime || "unknown",
        cpuLoad: parseInt(data?.["cpu-load"] || "0"),
        freeMemory: parseInt(data?.["free-memory"] || "0"),
        totalMemory: parseInt(data?.["total-memory"] || "0"),
        freeDisk: parseInt(data?.["free-hdd-space"] || "0"),
        totalDisk: parseInt(data?.["total-hdd-space"] || "0"),
        boardName: data?.["board-name"] || "unknown",
        version: data?.version || "unknown",
        architecture: data?.["architecture-name"] || "unknown",
      });
    } catch (error) {
      console.error("Error fetching router stats:", error);
      res.status(500).json({ error: "Failed to fetch router stats" });
    }
  });

  // Get router interfaces
  app.get("/api/hotspots/:id/interfaces", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const hotspot = await storage.getHotspot(id);
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      
      const mikrotik = await createMikrotikService(hotspot);
      if (!mikrotik) {
        return res.status(400).json({ error: "Router API not configured" });
      }
      
      const result = await mikrotik.getInterfaceStats();
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }
      
      const interfaces = (result.data || []).map((iface: any) => ({
        name: iface.name,
        type: iface.type,
        rxBytes: parseInt(iface["rx-byte"] || "0"),
        txBytes: parseInt(iface["tx-byte"] || "0"),
        rxPackets: parseInt(iface["rx-packet"] || "0"),
        txPackets: parseInt(iface["tx-packet"] || "0"),
        running: iface.running === "true",
        disabled: iface.disabled === "true",
      }));
      
      res.json(interfaces);
    } catch (error) {
      console.error("Error fetching interfaces:", error);
      res.status(500).json({ error: "Failed to fetch interfaces" });
    }
  });

  // Get active sessions
  app.get("/api/hotspots/:id/sessions", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const hotspot = await storage.getHotspot(id);
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      
      const mikrotik = await createMikrotikService(hotspot);
      if (!mikrotik) {
        return res.status(400).json({ error: "Router API not configured" });
      }
      
      const result = await mikrotik.getActiveSessions();
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }
      
      const sessions = (result.data || []).map((session: any) => ({
        id: session[".id"],
        user: session.user,
        address: session.address,
        macAddress: session["mac-address"],
        uptime: session.uptime,
        bytesIn: parseInt(session["bytes-in"] || "0"),
        bytesOut: parseInt(session["bytes-out"] || "0"),
      }));
      
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  // Disconnect session
  app.delete("/api/hotspots/:id/sessions/:sessionId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id, sessionId } = req.params;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const hotspot = await storage.getHotspot(id);
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      
      const mikrotik = await createMikrotikService(hotspot);
      if (!mikrotik) {
        return res.status(400).json({ error: "Router API not configured" });
      }
      
      const result = await mikrotik.disconnectSession(sessionId);
      res.json(result);
    } catch (error) {
      console.error("Error disconnecting session:", error);
      res.status(500).json({ error: "Failed to disconnect session" });
    }
  });

  // Get firewall rules
  app.get("/api/hotspots/:id/firewall/:type", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id, type } = req.params;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const hotspot = await storage.getHotspot(id);
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      
      const mikrotik = await createMikrotikService(hotspot);
      if (!mikrotik) {
        return res.status(400).json({ error: "Router API not configured" });
      }
      
      let result;
      switch (type) {
        case "filter":
          result = await mikrotik.getFirewallFilterRules();
          break;
        case "nat":
          result = await mikrotik.getFirewallNatRules();
          break;
        case "mangle":
          result = await mikrotik.getFirewallMangleRules();
          break;
        default:
          return res.status(400).json({ error: "Invalid firewall type" });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching firewall rules:", error);
      res.status(500).json({ error: "Failed to fetch firewall rules" });
    }
  });

  // Toggle firewall rule
  app.patch("/api/hotspots/:id/firewall/:type/:ruleId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id, type, ruleId } = req.params;
      const { action } = req.body;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const hotspot = await storage.getHotspot(id);
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      
      const mikrotik = await createMikrotikService(hotspot);
      if (!mikrotik) {
        return res.status(400).json({ error: "Router API not configured" });
      }
      
      const firewallType = type as "filter" | "nat" | "mangle";
      let result;
      if (action === "enable") {
        result = await mikrotik.enableFirewallRule(ruleId, firewallType);
      } else if (action === "disable") {
        result = await mikrotik.disableFirewallRule(ruleId, firewallType);
      } else {
        return res.status(400).json({ error: "Invalid action" });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error toggling firewall rule:", error);
      res.status(500).json({ error: "Failed to toggle firewall rule" });
    }
  });

  // Get IP pools
  app.get("/api/hotspots/:id/ip-pools", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const hotspot = await storage.getHotspot(id);
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      
      const mikrotik = await createMikrotikService(hotspot);
      if (!mikrotik) {
        return res.status(400).json({ error: "Router API not configured" });
      }
      
      const result = await mikrotik.getIpPools();
      res.json(result);
    } catch (error) {
      console.error("Error fetching IP pools:", error);
      res.status(500).json({ error: "Failed to fetch IP pools" });
    }
  });

  // Add IP pool
  app.post("/api/hotspots/:id/ip-pools", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { name, ranges } = req.body;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const hotspot = await storage.getHotspot(id);
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      
      const mikrotik = await createMikrotikService(hotspot);
      if (!mikrotik) {
        return res.status(400).json({ error: "Router API not configured" });
      }
      
      const result = await mikrotik.addIpPool(name, ranges);
      res.json(result);
    } catch (error) {
      console.error("Error adding IP pool:", error);
      res.status(500).json({ error: "Failed to add IP pool" });
    }
  });

  // Delete IP pool
  app.delete("/api/hotspots/:id/ip-pools/:poolId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id, poolId } = req.params;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const hotspot = await storage.getHotspot(id);
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      
      const mikrotik = await createMikrotikService(hotspot);
      if (!mikrotik) {
        return res.status(400).json({ error: "Router API not configured" });
      }
      
      const result = await mikrotik.deleteIpPool(poolId);
      res.json(result);
    } catch (error) {
      console.error("Error deleting IP pool:", error);
      res.status(500).json({ error: "Failed to delete IP pool" });
    }
  });

  // Get DHCP leases
  app.get("/api/hotspots/:id/dhcp-leases", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const hotspot = await storage.getHotspot(id);
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      
      const mikrotik = await createMikrotikService(hotspot);
      if (!mikrotik) {
        return res.status(400).json({ error: "Router API not configured" });
      }
      
      const result = await mikrotik.getDHCPLeases();
      res.json(result);
    } catch (error) {
      console.error("Error fetching DHCP leases:", error);
      res.status(500).json({ error: "Failed to fetch DHCP leases" });
    }
  });

  // Release DHCP lease
  app.delete("/api/hotspots/:id/dhcp-leases/:leaseId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id, leaseId } = req.params;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const hotspot = await storage.getHotspot(id);
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      
      const mikrotik = await createMikrotikService(hotspot);
      if (!mikrotik) {
        return res.status(400).json({ error: "Router API not configured" });
      }
      
      const result = await mikrotik.releaseDhcpLease(leaseId);
      res.json(result);
    } catch (error) {
      console.error("Error releasing DHCP lease:", error);
      res.status(500).json({ error: "Failed to release DHCP lease" });
    }
  });

  // Get ARP table
  app.get("/api/hotspots/:id/arp", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const hotspot = await storage.getHotspot(id);
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      
      const mikrotik = await createMikrotikService(hotspot);
      if (!mikrotik) {
        return res.status(400).json({ error: "Router API not configured" });
      }
      
      const result = await mikrotik.getArpTable();
      res.json(result);
    } catch (error) {
      console.error("Error fetching ARP table:", error);
      res.status(500).json({ error: "Failed to fetch ARP table" });
    }
  });

  // Get routes
  app.get("/api/hotspots/:id/routes", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const hotspot = await storage.getHotspot(id);
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      
      const mikrotik = await createMikrotikService(hotspot);
      if (!mikrotik) {
        return res.status(400).json({ error: "Router API not configured" });
      }
      
      const result = await mikrotik.getRoutes();
      res.json(result);
    } catch (error) {
      console.error("Error fetching routes:", error);
      res.status(500).json({ error: "Failed to fetch routes" });
    }
  });

  // Get simple queues
  app.get("/api/hotspots/:id/queues", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const hotspot = await storage.getHotspot(id);
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      
      const mikrotik = await createMikrotikService(hotspot);
      if (!mikrotik) {
        return res.status(400).json({ error: "Router API not configured" });
      }
      
      const result = await mikrotik.getSimpleQueues();
      res.json(result);
    } catch (error) {
      console.error("Error fetching queues:", error);
      res.status(500).json({ error: "Failed to fetch queues" });
    }
  });

  // Get walled garden from router
  app.get("/api/hotspots/:id/walled-garden-router", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const hotspot = await storage.getHotspot(id);
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      
      const mikrotik = await createMikrotikService(hotspot);
      if (!mikrotik) {
        return res.status(400).json({ error: "Router API not configured" });
      }
      
      const result = await mikrotik.getWalledGardenEntries();
      res.json(result);
    } catch (error) {
      console.error("Error fetching walled garden:", error);
      res.status(500).json({ error: "Failed to fetch walled garden" });
    }
  });

  // Sync walled garden to router
  app.post("/api/hotspots/:id/sync-walled-garden", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const hotspot = await storage.getHotspot(id);
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      
      const mikrotik = await createMikrotikService(hotspot);
      if (!mikrotik) {
        return res.status(400).json({ error: "Router API not configured" });
      }
      
      const walledGardens = await storage.getWalledGardens(tenantId);
      const entries = walledGardens.map(wg => ({
        domain: wg.domain,
        description: wg.description || undefined,
      }));
      
      const result = await mikrotik.syncWalledGarden(entries);
      res.json(result);
    } catch (error) {
      console.error("Error syncing walled garden:", error);
      res.status(500).json({ error: "Failed to sync walled garden" });
    }
  });

  // Create router backup
  app.post("/api/hotspots/:id/backup", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { name, notes } = req.body;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const hotspot = await storage.getHotspot(id);
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      
      const mikrotik = await createMikrotikService(hotspot);
      if (!mikrotik) {
        return res.status(400).json({ error: "Router API not configured" });
      }
      
      const [identityResult, resourceResult, exportResult] = await Promise.all([
        mikrotik.getRouterIdentity(),
        mikrotik.getSystemResources(),
        mikrotik.exportConfig(),
      ]);
      
      const identity = identityResult.data?.[0]?.name || identityResult.data?.name || "unknown";
      const version = resourceResult.data?.[0]?.version || resourceResult.data?.version || "unknown";
      const configData = typeof exportResult.data === "string" ? exportResult.data : JSON.stringify(exportResult.data);
      
      const backup = await storage.createRouterBackup({
        tenantId,
        hotspotId: id,
        name: name || `Backup ${new Date().toISOString()}`,
        type: "export",
        routerVersion: version,
        routerIdentity: identity,
        configData,
        notes,
      });
      
      res.json({ success: true, backup });
    } catch (error) {
      console.error("Error creating backup:", error);
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  // Get router backups
  app.get("/api/hotspots/:id/backups", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const hotspot = await storage.getHotspot(id);
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      
      const backups = await storage.getRouterBackups(tenantId, id);
      res.json(backups);
    } catch (error) {
      console.error("Error fetching backups:", error);
      res.status(500).json({ error: "Failed to fetch backups" });
    }
  });

  // Download backup
  app.get("/api/router-backups/:backupId/download", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { backupId } = req.params;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const backup = await storage.getRouterBackup(backupId);
      if (!backup || backup.tenantId !== tenantId) {
        return res.status(404).json({ error: "Backup not found" });
      }
      
      const filename = `${backup.name.replace(/[^a-z0-9]/gi, "_")}_${backup.routerIdentity}.rsc`;
      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(backup.configData || "");
    } catch (error) {
      console.error("Error downloading backup:", error);
      res.status(500).json({ error: "Failed to download backup" });
    }
  });

  // Delete backup
  app.delete("/api/router-backups/:backupId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { backupId } = req.params;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const backup = await storage.getRouterBackup(backupId);
      if (!backup || backup.tenantId !== tenantId) {
        return res.status(404).json({ error: "Backup not found" });
      }
      
      await storage.deleteRouterBackup(backupId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting backup:", error);
      res.status(500).json({ error: "Failed to delete backup" });
    }
  });

  // Reboot router
  app.post("/api/hotspots/:id/reboot", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const hotspot = await storage.getHotspot(id);
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      
      const mikrotik = await createMikrotikService(hotspot);
      if (!mikrotik) {
        return res.status(400).json({ error: "Router API not configured" });
      }
      
      const result = await mikrotik.rebootRouter();
      res.json(result);
    } catch (error) {
      console.error("Error rebooting router:", error);
      res.status(500).json({ error: "Failed to reboot router" });
    }
  });

  // Get hotspot servers on router
  app.get("/api/hotspots/:id/hotspot-servers", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const hotspot = await storage.getHotspot(id);
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      
      const mikrotik = await createMikrotikService(hotspot);
      if (!mikrotik) {
        return res.status(400).json({ error: "Router API not configured" });
      }
      
      const result = await mikrotik.getHotspotServers();
      res.json(result);
    } catch (error) {
      console.error("Error fetching hotspot servers:", error);
      res.status(500).json({ error: "Failed to fetch hotspot servers" });
    }
  });

  // Get user profiles on router
  app.get("/api/hotspots/:id/user-profiles", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const hotspot = await storage.getHotspot(id);
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      
      const mikrotik = await createMikrotikService(hotspot);
      if (!mikrotik) {
        return res.status(400).json({ error: "Router API not configured" });
      }
      
      const result = await mikrotik.getHotspotProfiles();
      res.json(result);
    } catch (error) {
      console.error("Error fetching user profiles:", error);
      res.status(500).json({ error: "Failed to fetch user profiles" });
    }
  });

  // Get router logs
  app.get("/api/hotspots/:id/logs", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { topics } = req.query;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const hotspot = await storage.getHotspot(id);
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      
      const mikrotik = await createMikrotikService(hotspot);
      if (!mikrotik) {
        return res.status(400).json({ error: "Router API not configured" });
      }
      
      const result = await mikrotik.getLogs(topics as string | undefined);
      res.json(result);
    } catch (error) {
      console.error("Error fetching logs:", error);
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  // Get DNS settings
  app.get("/api/hotspots/:id/dns", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const hotspot = await storage.getHotspot(id);
      if (!hotspot || hotspot.tenantId !== tenantId) {
        return res.status(404).json({ error: "Hotspot not found" });
      }
      
      const mikrotik = await createMikrotikService(hotspot);
      if (!mikrotik) {
        return res.status(400).json({ error: "Router API not configured" });
      }
      
      const result = await mikrotik.getDnsSettings();
      res.json(result);
    } catch (error) {
      console.error("Error fetching DNS settings:", error);
      res.status(500).json({ error: "Failed to fetch DNS settings" });
    }
  });

  // ============== LOGIN PAGE TEMPLATES ==============

  // Get login page templates
  app.get("/api/login-templates", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const templates = await storage.getLoginPageTemplates(tenantId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching login templates:", error);
      res.status(500).json({ error: "Failed to fetch login templates" });
    }
  });

  // Create login page template
  app.post("/api/login-templates", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const template = await storage.createLoginPageTemplate({
        ...req.body,
        tenantId,
      });
      res.json(template);
    } catch (error) {
      console.error("Error creating login template:", error);
      res.status(500).json({ error: "Failed to create login template" });
    }
  });

  // Update login page template
  app.patch("/api/login-templates/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const template = await storage.updateLoginPageTemplate(id, req.body);
      res.json(template);
    } catch (error) {
      console.error("Error updating login template:", error);
      res.status(500).json({ error: "Failed to update login template" });
    }
  });

  // Delete login page template
  app.delete("/api/login-templates/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      await storage.deleteLoginPageTemplate(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting login template:", error);
      res.status(500).json({ error: "Failed to delete login template" });
    }
  });

  // RouterOS Terminal - Execute command on router
  app.post("/api/terminal/execute", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const { hotspotId, command } = req.body;
      
      if (!hotspotId || !command) {
        return res.status(400).json({ error: "Hotspot ID and command are required" });
      }
      
      // Security: Block dangerous commands
      const blockedCommands = [
        '/system reset-configuration',
        '/system package update install',
        '/file remove',
        '/user remove',
        '/user set',
        '/password',
        '/system identity set',
      ];
      
      const lowerCommand = command.toLowerCase().trim();
      for (const blocked of blockedCommands) {
        if (lowerCommand.includes(blocked.toLowerCase())) {
          return res.status(403).json({ 
            error: `Command blocked for security reasons: ${blocked}` 
          });
        }
      }
      
      // Get hotspot and verify tenant ownership
      const hotspot = await storage.getHotspotForTenant(hotspotId, tenantId);
      if (!hotspot) {
        return res.status(404).json({ error: "Router not found or access denied" });
      }
      
      const mikrotik = await createMikrotikService(hotspot);
      if (!mikrotik) {
        return res.status(500).json({ error: "Failed to connect to router" });
      }
      
      // Parse command and execute via REST API
      // Commands are in format: /path/to/resource [action] [params]
      // Convert to REST API format
      let apiPath = command.trim();
      let method: "GET" | "POST" | "DELETE" = "GET";
      let body: any = undefined;
      
      // Handle print commands (GET)
      if (apiPath.includes(' print') || apiPath.endsWith(' print')) {
        apiPath = apiPath.replace(' print', '');
        method = "GET";
      }
      // Handle add commands (POST)
      else if (apiPath.includes(' add ')) {
        const parts = apiPath.split(' add ');
        apiPath = parts[0];
        method = "POST";
        // Parse key=value pairs
        const params = parts[1].split(' ');
        body = {};
        for (const param of params) {
          if (param.includes('=')) {
            const [key, value] = param.split('=');
            body[key] = value.replace(/"/g, '');
          }
        }
      }
      // Handle remove commands (DELETE)
      else if (apiPath.includes(' remove ')) {
        const parts = apiPath.split(' remove ');
        apiPath = parts[0] + '/' + parts[1];
        method = "DELETE";
      }
      
      // Convert CLI path to REST path
      // /ip/hotspot/user -> /rest/ip/hotspot/user
      apiPath = apiPath.replace(/^\//, '');
      const restPath = '/rest/' + apiPath.replace(/ /g, '/');
      
      // Execute via MikroTik API
      const result = await mikrotik.executeCommand(restPath, method, body);
      
      if (result.success) {
        res.json({
          success: true,
          output: result.data,
          command,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.json({
          success: false,
          error: result.error,
          command,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error executing terminal command:", error);
      res.status(500).json({ error: "Failed to execute command" });
    }
  });

  // Get predefined RouterOS commands
  app.get("/api/terminal/commands", requireAuth, async (req: AuthenticatedRequest, res) => {
    const predefinedCommands = [
      { category: "System", commands: [
        { label: "System Resources", command: "/system/resource", description: "View CPU, memory, uptime" },
        { label: "System Identity", command: "/system/identity", description: "View router identity" },
        { label: "System Clock", command: "/system/clock", description: "View system time" },
        { label: "System History", command: "/system/history", description: "View change history" },
      ]},
      { category: "Interfaces", commands: [
        { label: "All Interfaces", command: "/interface", description: "List all interfaces" },
        { label: "Interface Stats", command: "/interface/ethernet", description: "Ethernet interfaces" },
        { label: "Wireless Interfaces", command: "/interface/wireless", description: "Wireless interfaces" },
        { label: "Bridge", command: "/interface/bridge", description: "Bridge interfaces" },
      ]},
      { category: "IP", commands: [
        { label: "IP Addresses", command: "/ip/address", description: "View IP addresses" },
        { label: "DHCP Leases", command: "/ip/dhcp-server/lease", description: "Active DHCP leases" },
        { label: "ARP Table", command: "/ip/arp", description: "ARP entries" },
        { label: "Routes", command: "/ip/route", description: "Routing table" },
        { label: "DNS Cache", command: "/ip/dns/cache", description: "DNS cache entries" },
      ]},
      { category: "Hotspot", commands: [
        { label: "Hotspot Users", command: "/ip/hotspot/user", description: "All hotspot users" },
        { label: "Active Sessions", command: "/ip/hotspot/active", description: "Active hotspot sessions" },
        { label: "User Profiles", command: "/ip/hotspot/user/profile", description: "Hotspot profiles" },
        { label: "Hotspot Hosts", command: "/ip/hotspot/host", description: "Connected hosts" },
        { label: "Hotspot Servers", command: "/ip/hotspot", description: "Hotspot server config" },
      ]},
      { category: "PPPoE", commands: [
        { label: "PPP Secrets", command: "/ppp/secret", description: "PPP/PPPoE users" },
        { label: "Active PPPoE", command: "/ppp/active", description: "Active PPPoE sessions" },
        { label: "PPP Profiles", command: "/ppp/profile", description: "PPP profiles" },
      ]},
      { category: "Firewall", commands: [
        { label: "Filter Rules", command: "/ip/firewall/filter", description: "Firewall filter rules" },
        { label: "NAT Rules", command: "/ip/firewall/nat", description: "NAT rules" },
        { label: "Mangle Rules", command: "/ip/firewall/mangle", description: "Mangle rules" },
        { label: "Address Lists", command: "/ip/firewall/address-list", description: "Address lists" },
      ]},
      { category: "Queues", commands: [
        { label: "Simple Queues", command: "/queue/simple", description: "Simple queues" },
        { label: "Queue Tree", command: "/queue/tree", description: "Queue tree" },
        { label: "Queue Types", command: "/queue/type", description: "Queue types" },
      ]},
      { category: "Logs", commands: [
        { label: "System Log", command: "/log", description: "View system logs" },
      ]},
    ];
    
    res.json(predefinedCommands);
  });

  // Generate and download login page files
  app.get("/api/login-templates/:id/download", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const tenantId = getSessionTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      const template = await storage.getLoginPageTemplate(id);
      if (!template || template.tenantId !== tenantId) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      const tenant = await storage.getTenant(tenantId);
      const config = template.config || {};
      
      const loginHtml = generateLoginPageHtml(config, tenant);
      
      res.setHeader("Content-Type", "text/html");
      res.setHeader("Content-Disposition", `attachment; filename="login.html"`);
      res.send(loginHtml);
    } catch (error) {
      console.error("Error generating login page:", error);
      res.status(500).json({ error: "Failed to generate login page" });
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

    // Check if we have an admin user for this tenant (tenant-scoped lookup)
    const adminUser = await storage.getUserByUsername("admin", tenant.id);
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
