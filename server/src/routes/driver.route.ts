import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// GET /driver/my-lead — Get driver's own lead
router.get('/my-lead', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as any).user;

  const lead = await prisma.lead.findFirst({
    where: { driverId: user.id },
    include: {
      events: { orderBy: { createdAt: 'desc' }, take: 5 },
      timelines: { orderBy: { createdAt: 'desc' }, take: 10 },
      communicationLogs: { orderBy: { timestamp: 'desc' }, take: 10 },
    }
  });

  if (!lead) return res.status(404).json({ error: 'No lead found for this driver' });

  // ─── GAP 2: DYNAMIC NEXT BEST ACTION ───
  const latestResponseAgent = await prisma.agentOutput.findFirst({
    where: { leadId: lead.id, agentName: 'response_agent' },
    orderBy: { createdAt: 'desc' }
  });
  
  const nextAction = (latestResponseAgent?.outputJson as any)?.next_best_action 
    || 'Complete your onboarding steps above.';

  res.json({ success: true, lead, nextAction });
});

// POST /driver/update-profile — Driver self-service update
router.post('/update-profile', authenticateToken, requireRole(['DRIVER']), async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { city, vehicleType, vehicleCount, email } = req.body;

  let lead = await prisma.lead.findFirst({
    where: { driverId: user.id }
  });

  if (!lead) return res.status(404).json({ error: 'No lead profile found' });

  // Update lead
  lead = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      city: city || undefined,
      vehicleType: vehicleType || undefined,
      vehicleCount: vehicleCount ? parseInt(vehicleCount, 10) : undefined,
      email: email || undefined,
    }
  });

  // Log to timeline
  const { logTimelineEvent } = await import('../services/timeline.service');
  await logTimelineEvent(lead.id, 'PROFILE_UPDATED', 'Driver updated their profile details.', user.name);

  // Trigger AI pipeline transparently in the background so score/stage updates
  const { runAgentPipeline } = await import('../agents/orchestrator');
  runAgentPipeline({
    lead,
    rawInput: 'Driver dynamically updated their profile.',
    source: 'SYSTEM'
  }).catch(e => console.error('[Driver] Background AI Pipeline failed:', e));

  res.json({ success: true, lead });
});

export default router;
