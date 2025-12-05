import type { Request, Response, NextFunction } from "express";
import { UserRole, type UserRoleValue } from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    user?: {
      id: string;
      username: string;
      role: UserRoleValue;
      tenantId?: string | null;
      email?: string | null;
    };
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
