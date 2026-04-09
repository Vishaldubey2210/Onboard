import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';
import { authenticateToken } from '../middlewares/auth.middleware';
import { verifyLeadOrgAccess } from '../middlewares/org.guard';

const router = Router();

const EventSchema = z.object({
  leadId: z.string().uuid().optional(),
  phone: z.string().optional(),
  source: z.enum(['EMAIL', 'WHATSAPP', 'CALL', 'API', 'SYSTEM', 'CSV']),
  rawInput: z.string().min(1, 'rawInput cannot be empty'),
});

// POST /event - ingest raw event from any channel
router.post('/event', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const parsed = EventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
  }

  const { leadId, phone, source, rawInput } = parsed.data;

  if (!leadId && !phone) {
    return res.status(400).json({ error: 'Either leadId or phone is required' });
  }

  // Find lead
  let lead = null;
  if (leadId) {
    lead = await prisma.lead.findUnique({ where: { id: leadId } });
  } else if (phone) {
    const normalized = phone.replace(/\D/g, '').slice(-10);
    lead = await prisma.lead.findUnique({ where: { phone: normalized } });
  }

  if (!lead) {
    return res.status(404).json({ error: 'Lead not found. Upload via CSV first.' });
  }

  // ─── MULTI-TENANT ISOLATION ───
  const { allowed } = await verifyLeadOrgAccess(req, lead.id);
  if (!allowed) {
    return res.status(403).json({ error: 'Forbidden: You do not have access to this lead' });
  }

  // Store the event
  const event = await prisma.leadEvent.create({
    data: {
      leadId: lead.id,
      source: source as Prisma.LeadEventCreateInput['source'],
      rawInput,
      parsedOutput: null,
    },
  });

  // Log as incoming communication
  await prisma.communicationLog.create({
    data: {
      leadId: lead.id,
      channel: source as Prisma.CommunicationLogCreateInput['channel'],
      message: rawInput,
      direction: 'incoming',
    },
  });

  return res.json({
    success: true,
    eventId: event.id,
    leadId: lead.id,
    message: 'Event stored. Call POST /process/:leadId to trigger AI processing.',
  });
});

export default router;
