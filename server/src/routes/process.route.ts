import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { runAgentPipeline } from '../agents/orchestrator';
import { authenticateToken } from '../middlewares/auth.middleware';
import { verifyLeadOrgAccess } from '../middlewares/org.guard';

const router = Router();

// POST /process/:leadId - run full agent pipeline
router.post('/process/:leadId', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { leadId } = req.params;
  const { rawInput, source } = req.body as { rawInput?: string; source?: string };

  // ─── MULTI-TENANT ISOLATION ───
  const { allowed, lead } = await verifyLeadOrgAccess(req, leadId);
  if (!allowed || !lead) {
    return res.status(404).json({ error: 'Lead not found or access denied' });
  }

  // Use provided rawInput, or fetch latest unprocessed event, or use lead summary
  let inputText = rawInput;
  let inputSource = (source ?? 'SYSTEM') as string;

  if (!inputText) {
    const latestEvent = await prisma.leadEvent.findFirst({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });
    if (latestEvent) {
      inputText = latestEvent.rawInput;
      inputSource = latestEvent.source;
    } else {
      inputText = JSON.stringify({
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        city: lead.city,
        vehicleType: lead.vehicleType,
      });
      inputSource = 'SYSTEM';
    }
  }

  try {
    const result = await runAgentPipeline({
      lead,
      rawInput: inputText,
      source: inputSource,
    });

    return res.json({ success: true, result });
  } catch (err) {
    console.error('[Process] Pipeline error:', err);
    return res.status(500).json({
      error: 'Agent pipeline failed',
      detail: (err as Error).message,
    });
  }
});

// GET /process/:leadId/latest - get latest processing result
router.get('/process/:leadId/latest', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { leadId } = req.params;

  // ─── MULTI-TENANT ISOLATION ───
  const { allowed, lead } = await verifyLeadOrgAccess(req, leadId);
  if (!allowed || !lead) {
    return res.status(404).json({ error: 'Lead not found or access denied' });
  }

  const agentOutputs = await prisma.agentOutput.findMany({
    where: { leadId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const latestByAgent = agentOutputs.reduce((acc, output) => {
    if (!acc[output.agentName]) acc[output.agentName] = output;
    return acc;
  }, {} as Record<string, typeof agentOutputs[0]>);

  const qualification = latestByAgent['qualification_agent']?.outputJson as Record<string, unknown> | null;
  const responseAgent = latestByAgent['response_agent']?.outputJson as Record<string, unknown> | null;

  if (!qualification || !responseAgent) {
    return res.json({ processed: false, lead });
  }

  return res.json({
    processed: true,
    result: {
      score: lead.leadScore,
      stage: lead.currentStage,
      missing_fields: qualification?.missing_fields ?? [],
      preferred_channel: lead.preferredChannel,
      latest_update_source: 'agent_pipeline',
      extracted_info: {},
      next_best_action: responseAgent?.next_best_action ?? '',
      whatsapp_message: responseAgent?.whatsapp_message ?? '',
      email_message: responseAgent?.email_message ?? '',
      callback_note: responseAgent?.callback_note ?? '',
    },
    lead,
  });
});

export default router;
