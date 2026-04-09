import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticateToken } from '../middlewares/auth.middleware';
import { callGroqJSON } from '../services/groq.service';
import { runUnderstandingAgent } from '../agents/understanding.agent';
import { verifyLeadOrgAccess } from '../middlewares/org.guard';

const router = Router();

// POST /ai/chat
router.post('/chat', authenticateToken, async (req: Request, res: Response) => {
  const { leadId, message } = req.body;
  if (!leadId || !message) return res.status(400).json({ error: 'leadId and message required' });

  // ─── MULTI-TENANT ISOLATION ───
  const { allowed } = await verifyLeadOrgAccess(req, leadId);
  if (!allowed) return res.status(404).json({ error: 'Lead not found or access denied' });

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, name: true, phone: true, currentStage: true, leadScore: true, aadhaarStatus: true, rcStatus: true, bankStatus: true }
  });
  
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const SYSTEM_PROMPT = `You are an AI onboarding assistant for a logistics platform.
The user (driver) is asking a question via chat. Answer clearly, mixing English and Hindi (Hinglish).

Here is the current Lead Status context:
- Name: ${lead.name}
- Stage: ${lead.currentStage}
- Aadhaar Document: ${lead.aadhaarStatus}
- Vehicle RC: ${lead.rcStatus}
- Bank Details: ${lead.bankStatus}

If documents are NOT_SUBMITTED or REJECTED, instruct them to upload those exact missing documents.
If they ask for status, tell them their current stage and what is missing.
Keep the reply brief, polite, and helpful (maximum 2-3 sentences).

Output format MUST be valid JSON:
{
  "reply": "string (the conversational response)",
  "suggestions": ["Short Action 1", "Short Action 2"]
}`;

  try {
    const result = await callGroqJSON<{ reply: string, suggestions: string[] }>(
      SYSTEM_PROMPT,
      message,
      { reply: "Sorry, I am facing technical difficulties.", suggestions: ["Try again later"] }
    );
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('AI Chat Error:', err);
    res.status(500).json({ error: 'Failed to process AI chat' });
  }
});

// POST /ai/voice
router.post('/voice', authenticateToken, async (req: Request, res: Response) => {
  const { transcript } = req.body;
  if (!transcript) return res.status(400).json({ error: 'transcript required in body' });

  try {
    // Re-use our robust Understanding Agent logic
    const understandingResult = await runUnderstandingAgent(transcript);
    
    // Add voice summarization
    const SYSTEM_PROMPT = `You are a voice assistant summarizer analyzing a call transcript from a driver onboarding call.
Create a short summary of the call and determine the immediate next best action for the onboarding team.
Output JSON:
{
  "summary": "1 sentence summary",
  "next_action": "what should be done next?"
}`;

    const summaryResult = await callGroqJSON<{ summary: string, next_action: string }>(
      SYSTEM_PROMPT,
      transcript,
      { summary: "Could not summarize audio transcript.", next_action: "Review transcript manually." }
    );

    res.json({
      success: true,
      data: {
        summary: summaryResult.summary,
        intent: understandingResult.intent || 'general_inquiry',
        extracted_info: {
          name: understandingResult.name,
          phone: understandingResult.phone,
          city: understandingResult.city,
          vehicle_type: understandingResult.vehicle_type
        },
        next_action: summaryResult.next_action
      }
    });
  } catch (err) {
    console.error('AI Voice Error:', err);
    res.status(500).json({ error: 'Failed to process AI voice simulator' });
  }
});

export default router;
