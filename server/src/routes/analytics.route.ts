import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticateToken } from '../middlewares/auth.middleware';
import { orgWhere } from '../middlewares/org.guard';

const router = Router();

// GET /analytics — Basic stats (Org-scoped)
router.get('/analytics', authenticateToken, async (req: Request, res: Response) => {
  try {
    const whereOrg = orgWhere(req);
    const [totalLeads, completedLeads, newLeads, timelineEvents] = await Promise.all([
      prisma.lead.count({ where: whereOrg }),
      prisma.lead.count({ where: { ...whereOrg, currentStage: 'ONBOARDED' } }),
      prisma.lead.count({ where: { ...whereOrg, currentStage: 'NEW' } }),
      // Timeline events linked to leads in this org
      prisma.leadTimeline.count({
        where: whereOrg.orgId ? { lead: { orgId: whereOrg.orgId } } : {}
      })
    ]);

    const conversionRate = totalLeads > 0 ? ((completedLeads / totalLeads) * 100).toFixed(1) : 0;
    const aggr = await prisma.lead.aggregate({ 
      where: whereOrg,
      _avg: { leadScore: true } 
    });
    
    return res.json({
      success: true,
      data: {
        totalLeads,
        completedLeads,
        newLeads,
        timelineEvents,
        conversionRate,
        averageScore: aggr._avg.leadScore || 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /analytics/overview
router.get('/analytics/overview', authenticateToken, async (req: Request, res: Response) => {
  try {
    const whereOrg = orgWhere(req);
    const [totalLeads, completedLeads, pendingLeads, pendingVerification, escalatedCount] = await Promise.all([
      prisma.lead.count({ where: whereOrg }),
      prisma.lead.count({ where: { ...whereOrg, currentStage: 'ONBOARDED' } }),
      prisma.lead.count({ where: { ...whereOrg, currentStage: { notIn: ['ONBOARDED', 'REJECTED'] } } }),
      prisma.lead.count({
        where: {
          ...whereOrg,
          OR: [
            { aadhaarStatus: 'SUBMITTED' },
            { bankStatus: 'SUBMITTED' },
            { rcStatus: 'SUBMITTED' },
          ]
        }
      }),
      prisma.lead.count({ where: { ...whereOrg, escalated: true } })
    ]);

    const conversionRate = totalLeads > 0 ? ((completedLeads / totalLeads) * 100).toFixed(1) : 0;
    
    const onboardedWithDates = await prisma.lead.findMany({
      where: { ...whereOrg, currentStage: 'ONBOARDED', onboardedAt: { not: null } },
      select: { createdAt: true, onboardedAt: true }
    });

    let avgOnboardingHours = 0;
    if (onboardedWithDates.length > 0) {
      const totalMs = onboardedWithDates.reduce((acc, l) => {
        return acc + (l.onboardedAt!.getTime() - l.createdAt.getTime());
      }, 0);
      avgOnboardingHours = totalMs / onboardedWithDates.length / (1000 * 60 * 60);
    }

    return res.json({
      success: true,
      data: {
        totalLeads,
        completedLeads,
        pendingLeads,
        pendingVerification,
        escalatedCount,
        conversionRate,
        avgOnboardingTime: avgOnboardingHours.toFixed(1) + ' hrs'
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch overview analytics' });
  }
});

// GET /analytics/funnel
router.get('/analytics/funnel', authenticateToken, async (req: Request, res: Response) => {
  try {
    const whereOrg = orgWhere(req);
    const leadStages = await prisma.lead.groupBy({
      by: ['currentStage'],
      _count: true,
      where: whereOrg
    });

    const counts: Record<string, number> = {};
    leadStages.forEach(s => { counts[s.currentStage] = s._count; });

    const getCount = (...stages: string[]) => stages.reduce((acc, curr) => acc + (counts[curr] || 0), 0);

    const started = getCount('NEW', 'CONTACTED', 'DOCUMENTS_PENDING', 'DOCUMENTS_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'ONBOARDED');
    const docs_submitted = getCount('DOCUMENTS_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'ONBOARDED');
    const verified = getCount('APPROVED', 'ONBOARDED');
    const onboarded = getCount('ONBOARDED');

    return res.json({ success: true, data: { started, docs_submitted, verified, onboarded } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch funnel analytics' });
  }
});

// GET /analytics/city-wise
router.get('/analytics/city-wise', authenticateToken, async (req: Request, res: Response) => {
  try {
    const whereOrg = orgWhere(req);
    const cities = await prisma.lead.groupBy({
      by: ['city'],
      _count: true,
      where: { ...whereOrg, city: { not: null } },
      orderBy: { _count: { city: 'desc' } }
    });

    const onboardedByCity = await prisma.lead.groupBy({
      by: ['city'],
      _count: true,
      where: { ...whereOrg, city: { not: null }, currentStage: 'ONBOARDED' }
    });

    const onboardedMap: Record<string, number> = {};
    onboardedByCity.forEach(o => { if (o.city) onboardedMap[o.city] = o._count; });

    const data = cities.map(c => ({
      city: c.city || 'Unknown',
      total: c._count,
      onboarded: onboardedMap[c.city || ''] || 0,
      onboardingRate: c._count > 0 ? (((onboardedMap[c.city || ''] || 0) / c._count) * 100).toFixed(1) : '0'
    }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch city analytics' });
  }
});

// GET /analytics/drop-off
router.get('/analytics/drop-off', authenticateToken, async (req: Request, res: Response) => {
  try {
    const whereOrg = orgWhere(req);
    const stages = await prisma.lead.groupBy({
      by: ['currentStage'],
      _count: true,
      where: whereOrg
    });

    const counts: Record<string, number> = {};
    stages.forEach(s => { counts[s.currentStage] = s._count; });

    const stageOrder = ['NEW', 'CONTACTED', 'DOCUMENTS_PENDING', 'DOCUMENTS_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'ONBOARDED'];
    const dropOff = stageOrder.map((stage) => ({
      stage,
      count: counts[stage] || 0,
      stuckLeads: counts[stage] || 0,
    }));

    res.json({ success: true, data: dropOff });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch drop-off analytics' });
  }
});

// GET /analytics/rejection-rate
router.get('/analytics/rejection-rate', authenticateToken, async (req: Request, res: Response) => {
  try {
    const whereOrg = orgWhere(req);
    const [aadhaarRejected, bankRejected, rcRejected, totalLeads] = await Promise.all([
      prisma.lead.count({ where: { ...whereOrg, aadhaarStatus: 'REJECTED' } }),
      prisma.lead.count({ where: { ...whereOrg, bankStatus: 'REJECTED' } }),
      prisma.lead.count({ where: { ...whereOrg, rcStatus: 'REJECTED' } }),
      prisma.lead.count({ where: whereOrg })
    ]);

    const totalRejections = aadhaarRejected + bankRejected + rcRejected;
    const totalPossible = totalLeads * 3;

    res.json({
      success: true,
      data: {
        aadhaarRejected,
        bankRejected,
        rcRejected,
        totalRejections,
        overallRejectionRate: totalPossible > 0 ? ((totalRejections / totalPossible) * 100).toFixed(1) : '0'
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rejection rate' });
  }
});

// GET /analytics/audit-logs
router.get('/analytics/audit-logs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const whereOrg = orgWhere(req);
    // If no org (legacy) return everything. If org, return audit logs linked to that org.
    // NOTE: AuditLog schema now needs filtering logic. If AuditLog has a direct relation or we rely on User orgId:
    const logs = await prisma.auditLog.findMany({
      where: whereOrg.orgId ? { user: { orgId: whereOrg.orgId } } : {},
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { name: true, role: true } } }
    });
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
