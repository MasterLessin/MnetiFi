import type { Request, Response, NextFunction } from "express";
import { UserRole, type UserRoleValue, SubscriptionTier, TierFeatures } from "@shared/schema";
import { storage } from "../storage";

declare module "express-session" {
  interface SessionData {
    user?: {
      id: string;
      username: string;
      role: UserRoleValue;
      tenantId?: string | null;
      email?: string | null;
    };
    subscriptionTier?: string;
    trialExpiresAt?: string | null;
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: UserRoleValue;
    tenantId?: string | null;
    email?: string | null;
  };
}

const roleHierarchy: Record<UserRoleValue, number> = {
  [UserRole.SUPERADMIN]: 3,
  [UserRole.ADMIN]: 2,
  [UserRole.TECH]: 1,
};

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  (req as AuthenticatedRequest).user = req.session.user;
  next();
}

export function requireRole(...allowedRoles: UserRoleValue[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const userRole = req.session.user.role as UserRoleValue;
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: "Access denied",
        message: `This action requires one of the following roles: ${allowedRoles.join(", ")}`
      });
    }

    (req as AuthenticatedRequest).user = req.session.user;
    next();
  };
}

export function requireMinRole(minRole: UserRoleValue) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const userRole = req.session.user.role as UserRoleValue;
    const userRoleLevel = roleHierarchy[userRole] || 0;
    const requiredRoleLevel = roleHierarchy[minRole] || 0;

    if (userRoleLevel < requiredRoleLevel) {
      return res.status(403).json({ 
        error: "Access denied",
        message: `This action requires ${minRole} role or higher`
      });
    }

    (req as AuthenticatedRequest).user = req.session.user;
    next();
  };
}

export const requireSuperAdmin = requireRole(UserRole.SUPERADMIN);
export const requireAdmin = requireMinRole(UserRole.ADMIN);
export const requireTech = requireMinRole(UserRole.TECH);

export function requireTenantAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const userRole = req.session.user.role as UserRoleValue;
  
  if (userRole === UserRole.SUPERADMIN) {
    (req as AuthenticatedRequest).user = req.session.user;
    return next();
  }

  if (!req.session.user.tenantId) {
    return res.status(403).json({ 
      error: "Access denied",
      message: "User is not associated with any tenant"
    });
  }

  (req as AuthenticatedRequest).user = req.session.user;
  next();
}

// Helper function to get tenant ID from session
export function getSessionTenantId(req: Request): string | null {
  return req.session?.user?.tenantId || null;
}

// Combined middleware that requires auth AND tenant access, returns tenantId
export function requireAuthWithTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const userRole = req.session.user.role as UserRoleValue;
  
  // Superadmins can access any tenant - they should provide tenantId in query/body
  if (userRole === UserRole.SUPERADMIN) {
    (req as AuthenticatedRequest).user = req.session.user;
    return next();
  }

  if (!req.session.user.tenantId) {
    return res.status(403).json({ 
      error: "Access denied",
      message: "User is not associated with any tenant"
    });
  }

  (req as AuthenticatedRequest).user = req.session.user;
  next();
}

// Middleware to require PREMIUM subscription tier
export async function requirePremium(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const userRole = req.session.user.role as UserRoleValue;
  
  // Superadmins bypass subscription checks
  if (userRole === UserRole.SUPERADMIN) {
    (req as AuthenticatedRequest).user = req.session.user;
    return next();
  }

  const tenantId = req.session.user.tenantId;
  if (!tenantId) {
    return res.status(403).json({ 
      error: "Access denied",
      message: "User is not associated with any tenant"
    });
  }

  try {
    const tenant = await storage.getTenant(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    const now = new Date();
    const isPremium = tenant.subscriptionTier === SubscriptionTier.PREMIUM;
    const isTrialActive = tenant.trialExpiresAt && new Date(tenant.trialExpiresAt) > now;
    
    // Subscription is active if:
    // - No expiration set (null = indefinite for legacy/admin-created tenants)
    // - Expiration date is in the future
    const isSubscriptionActive = !tenant.subscriptionExpiresAt || new Date(tenant.subscriptionExpiresAt) > now;

    // Allow access if:
    // 1. Any tier during active trial period (trial gives full access)
    // 2. Premium tier with active (or no) subscription expiry
    if (isTrialActive) {
      (req as AuthenticatedRequest).user = req.session.user;
      return next();
    }

    if (isPremium && isSubscriptionActive) {
      (req as AuthenticatedRequest).user = req.session.user;
      return next();
    }

    // Subscription required
    return res.status(403).json({ 
      error: "Premium subscription required",
      message: "This feature requires an active Premium subscription. Please upgrade to continue.",
      upgradeUrl: "/dashboard/upgrade"
    });
  } catch (error) {
    console.error("Error checking subscription:", error);
    return res.status(500).json({ error: "Failed to verify subscription" });
  }
}

// Middleware to require a specific feature based on subscription tier
export function requireFeature(featureName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const userRole = req.session.user.role as UserRoleValue;
    
    // Superadmins bypass feature checks
    if (userRole === UserRole.SUPERADMIN) {
      (req as AuthenticatedRequest).user = req.session.user;
      return next();
    }

    const tenantId = req.session.user.tenantId;
    if (!tenantId) {
      return res.status(403).json({ 
        error: "Access denied",
        message: "User is not associated with any tenant"
      });
    }

    try {
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      const now = new Date();
      const isTrialActive = tenant.trialExpiresAt && new Date(tenant.trialExpiresAt) > now;
      
      // Subscription is active if no expiration set (legacy) or expiration is in future
      const isSubscriptionActive = !tenant.subscriptionExpiresAt || new Date(tenant.subscriptionExpiresAt) > now;
      
      // During trial, allow all features
      if (isTrialActive) {
        (req as AuthenticatedRequest).user = req.session.user;
        return next();
      }

      // Check if the feature is available for this tier
      const tier = (tenant.subscriptionTier || SubscriptionTier.BASIC) as keyof typeof TierFeatures;
      const allowedFeatures = TierFeatures[tier] || TierFeatures.BASIC;
      
      // Check if feature is in the allowed list for this tier AND subscription is active
      if (allowedFeatures.includes(featureName as any) && isSubscriptionActive) {
        (req as AuthenticatedRequest).user = req.session.user;
        return next();
      }

      // Check if feature is PREMIUM-only (in PREMIUM but not in BASIC)
      const isPremiumFeature = TierFeatures.PREMIUM.includes(featureName as any) && 
                               !TierFeatures.BASIC.includes(featureName as any);

      return res.status(403).json({ 
        error: isPremiumFeature ? "Premium subscription required" : "Feature not available",
        message: isPremiumFeature 
          ? `This feature requires a Premium subscription. Please upgrade to continue.`
          : "This feature is not available on your subscription plan.",
        upgradeUrl: "/dashboard/upgrade"
      });
    } catch (error) {
      console.error("Error checking feature access:", error);
      return res.status(500).json({ error: "Failed to verify feature access" });
    }
  };
}
