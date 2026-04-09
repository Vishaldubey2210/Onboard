/**
 * Organization Guard — Multi-Tenant Data Isolation Helpers
 * 
 * Every query that touches leads, analytics, or audit data
 * MUST use these helpers to ensure strict org-level isolation.
 */
import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

/**
 * Extract orgId from the authenticated user on the request.
 * Returns null if no org is set (legacy/unassigned users).
 */
export function getOrgId(req: Request): string | null {
  const user = (req as any).user;
  return user?.orgId ?? null;
}

/**
 * Build a Prisma `where` clause scoped to the current user's org.
 * If the user has an orgId, all queries are filtered.
 * If no orgId (legacy data), returns empty filter (backwards compatible).
 */
export function orgWhere(req: Request): { orgId?: string } {
  const orgId = getOrgId(req);
  return orgId ? { orgId } : {};
}

/**
 * Verify that a specific lead belongs to the user's org.
 * Returns the lead if ownership checks pass, or null.
 */
export async function verifyLeadOrgAccess(
  req: Request,
  leadId: string
): Promise<{ allowed: boolean; lead: any | null }> {
  const user = (req as any).user;
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });

  if (!lead) return { allowed: false, lead: null };

  // ADMIN: must belong to same org
  if (user.role === 'ADMIN') {
    if (user.orgId && lead.orgId && user.orgId !== lead.orgId) {
      return { allowed: false, lead: null };
    }
    return { allowed: true, lead };
  }

  // DRIVER: must be their own lead
  if (user.role === 'DRIVER') {
    if (lead.driverId !== user.id) {
      return { allowed: false, lead: null };
    }
    return { allowed: true, lead };
  }

  // Unknown role
  return { allowed: false, lead: null };
}

/**
 * Express middleware: reject requests where user has no org assigned.
 * Use on routes that REQUIRE org context (optional — for strict mode).
 */
export function requireOrg(req: Request, res: Response, next: NextFunction) {
  const orgId = getOrgId(req);
  if (!orgId) {
    return res.status(403).json({ 
      error: 'Organization required. Please contact your administrator.' 
    });
  }
  next();
}
