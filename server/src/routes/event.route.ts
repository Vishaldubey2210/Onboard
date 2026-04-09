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
  email: z.string().optional(),
  forceMerge: z.boolean().optional(),
  source: z.enum(['EMAIL', 'WHATSAPP', 'CALL', 'API', 'SYSTEM', 'CSV']),
  rawInput: z.string().min(1, 'rawInput cannot be empty'),
}).refine(data => data.leadId || data.phone || data.email, {
  message: "At least one identifier (leadId, phone, or email) is required"
});

// POST /event - ingest raw event from any channel
router.post('/event', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const parsed = EventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
  }

  const { leadId, phone, email, source, rawInput, forceMerge } = parsed.data;

  // Validation Rule
  if (!leadId && !phone && !email) {
    return res.status(400).json({ error: 'At least one identifier required' });
  }

  let lead = null;
  let identifiedBy: 'phone' | 'email' | 'leadId' | 'auto_created' | 'phone_and_email' | 'phone_force_merge' = 'auto_created';

  // Strict identity logic
  const normalizedPhone = phone ? phone.replace(/\D/g, '').slice(-10) : null;
  const normalizedEmail = email ? email.toLowerCase().trim() : null;

  const phoneMatch = normalizedPhone ? await prisma.lead.findFirst({ where: { phone: normalizedPhone } }) : null;
  const emailMatch = normalizedEmail ? await prisma.lead.findFirst({ where: { email: normalizedEmail } }) : null;

  // By Lead ID (Highest priority override)
  if (leadId) {
    lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (lead) identifiedBy = 'leadId';
  } else {
    // Identity Conflict Checking Rule
    if (phoneMatch && emailMatch && phoneMatch.id !== emailMatch.id) {
      if (!forceMerge) {
        return res.status(409).json({ 
          error: 'Identity Conflict: phone and email belong to different leads',
          code: 'IDENTITY_CONFLICT' 
        });
      } else {
        // Force merge: Select phone match as survivor
        lead = phoneMatch;
        identifiedBy = 'phone_force_merge';
      }
    } else if (phoneMatch && emailMatch && phoneMatch.id === emailMatch.id) {
      lead = phoneMatch;
      identifiedBy = 'phone_and_email';
    } else if (phoneMatch) {
      lead = phoneMatch;
      identifiedBy = 'phone';
    } else if (emailMatch) {
      lead = emailMatch;
      identifiedBy = 'email';
    }
  }

  // Auto-Create
  if (!lead) {
    identifiedBy = 'auto_created';
    const fallbackPhone = normalizedPhone || `auto_${Math.random().toString().slice(2, 12)}`;
    
    lead = await prisma.lead.create({
      data: {
        name: "Unknown Caller",
        phone: fallbackPhone,
        email: normalizedEmail,
        preferredChannel: source as Prisma.LeadCreateInput['preferredChannel'],
        orgId: user.orgId,
        lastUpdatedFrom: source as any,
        identifiedBy,
      }
    });

    await prisma.leadTimeline.create({
      data: {
        leadId: lead.id,
        eventType: 'AUTO_LEAD_CREATED',
        message: 'Lead auto-created from Email/API interaction',
        source: source
      }
    });
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
    identifiedBy,
    message: 'Event stored. Call POST /process/:leadId to trigger AI processing.',
  });
});

export default router;
