import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';
import { logTimelineEvent } from '../services/timeline.service';
import { dispatchWebhooks } from '../services/webhook.service';
import { orgWhere, verifyLeadOrgAccess } from '../middlewares/org.guard';

const router = Router();

// GET /leads — Org-scoped listing
router.get('/leads', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const page = parseInt(req.query.page as string ?? '1', 10);
  const limit = parseInt(req.query.limit as string ?? '20', 10);
  const stage = req.query.stage as string | undefined;
  const search = req.query.search as string | undefined;
  const city = req.query.city as string | undefined;
  const minScore = req.query.minScore ? parseInt(req.query.minScore as string, 10) : undefined;

  const skip = (page - 1) * limit;

  const where = {
    // ─── MULTI-TENANT ISOLATION ───
    ...orgWhere(req),
    ...(stage ? { currentStage: stage as never } : {}),
    ...(city ? { city: { contains: city, mode: 'insensitive' as never } } : {}),
    ...(minScore !== undefined ? { leadScore: { gte: minScore } } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as never } },
            { phone: { contains: search } },
            { email: { contains: search, mode: 'insensitive' as never } },
            { city: { contains: search, mode: 'insensitive' as never } },
          ],
        }
      : {}),
  };

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: [{ leadScore: 'desc' }, { updatedAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return res.json({
    data: leads,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// GET /lead/:id — Org-scoped detail
router.get('/lead/:id', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;

  // ─── MULTI-TENANT ISOLATION ───
  const { allowed, lead: rawLead } = await verifyLeadOrgAccess(req, id);
  if (!allowed || !rawLead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      events: { orderBy: { createdAt: 'desc' }, take: 20 },
      stateHistory: { orderBy: { timestamp: 'desc' }, take: 20 },
      agentOutputs: { orderBy: { createdAt: 'desc' }, take: 20 },
      communicationLogs: { orderBy: { timestamp: 'desc' }, take: 20 },
    },
  });

  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  // Get latest processing result if available
  const latestSync = lead.agentOutputs
    .filter((o) => o.agentName === 'qualification_agent')
    .at(0);

  return res.json({
    lead,
    latestQualification: latestSync?.outputJson ?? null,
  });
});

// GET /lead/:id/timeline — Org-scoped
router.get('/lead/:id/timeline', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;

  // ─── MULTI-TENANT ISOLATION ───
  const { allowed } = await verifyLeadOrgAccess(req, id);
  if (!allowed) return res.status(404).json({ error: 'Lead not found' });

  const timelines = await prisma.leadTimeline.findMany({
    where: { leadId: id },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ success: true, data: timelines });
});

// GET /lead/:id/debug — Org-scoped
router.get('/lead/:id/debug', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;

  // ─── MULTI-TENANT ISOLATION ───
  const { allowed } = await verifyLeadOrgAccess(req, id);
  if (!allowed) return res.status(404).json({ error: 'Lead not found or access denied' });

  const logs = await prisma.promptLog.findMany({
    where: { leadId: id },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ success: true, data: logs });
});

// GET /lead/:id/explain — AI Explainability (Org-scoped)
router.get('/lead/:id/explain', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;

  // ─── MULTI-TENANT ISOLATION ───
  const { allowed } = await verifyLeadOrgAccess(req, id);
  if (!allowed) return res.status(404).json({ error: 'Lead not found' });

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const latestOutput = await prisma.agentOutput.findFirst({
    where: { leadId: id, agentName: 'qualification' },
    orderBy: { createdAt: 'desc' }
  });

  const promptLogs = await prisma.promptLog.findMany({
    where: { leadId: id },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  const qualification = latestOutput?.outputJson as any;
  const explanation = {
    leadId: id,
    currentScore: lead.leadScore,
    currentStage: lead.currentStage,
    priority: lead.priority,
    confidence: lead.confidence,
    scoreReasoning: qualification?.reasoning || 'No AI reasoning available — deterministic scoring was used.',
    missingFields: qualification?.missing_fields || [],
    stageReasoning: `Stage "${lead.currentStage}" determined by document statuses: Aadhaar(${lead.aadhaarStatus}), Bank(${lead.bankStatus}), RC(${lead.rcStatus}), App(${lead.appInstalled ? 'Yes' : 'No'})`,
    promptHistory: promptLogs.map(p => ({
      agent: p.agentName,
      promptPreview: p.prompt.slice(0, 200) + '...',
      responsePreview: p.response.slice(0, 200) + '...',
      timestamp: p.createdAt
    }))
  };

  res.json({ success: true, data: explanation });
});

// POST /lead/:id/override — Human override (Admin Only, Org-scoped)
router.post('/lead/:id/override', authenticateToken, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { stage, score, priority, reason } = req.body;

  // ─── MULTI-TENANT ISOLATION ───
  const { allowed } = await verifyLeadOrgAccess(req, id);
  if (!allowed) return res.status(404).json({ error: 'Lead not found' });

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const updateData: any = {};
  if (stage) updateData.currentStage = stage;
  if (score !== undefined) updateData.leadScore = score;
  if (priority) updateData.priority = priority;
  if (stage === 'ONBOARDED') updateData.onboardedAt = new Date();

  const updatedLead = await prisma.lead.update({
    where: { id },
    data: updateData
  });

  await logTimelineEvent(id, 'MANUAL_OVERRIDE', `Admin override: ${reason || 'No reason provided'}. Changes: ${JSON.stringify(updateData)}`, user.name);

  const { logAudit } = await import('../services/audit.service');
  await logAudit(user.id, 'AI_OVERRIDE', 'lead', id, `Reason: ${reason}. Data: ${JSON.stringify(updateData)}`);

  res.json({ success: true, lead: updatedLead });
});

export default router;
