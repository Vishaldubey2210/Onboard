import { Lead } from '@prisma/client';
import { callGroqJSON } from '../services/groq.service';
import { UnderstandingAgentOutput } from './understanding.agent';

export interface ReconciliationDecision {
  should_update: boolean;
  fields_to_update: Partial<{
    name: string;
    email: string;
    city: string;
    vehicleType: string;
    vehicleCount: number;
    aadhaarStatus: string;
    bankStatus: string;
    rcStatus: string;
    appInstalled: boolean;
    preferredChannel: string;
  }>;
  conflicts: Array<{
    field: string;
    db_value: unknown;
    new_value: unknown;
    resolution: string;
    reason: string;
  }>;
  confidence: number;
  reasoning: string;
}

const SYSTEM_PROMPT = `You are a data reconciliation agent for a driver onboarding system.

Your job: Compare the current database state of a lead with newly extracted information, and decide what should be updated.

Rules (CRITICAL - follow strictly):
1. NEVER downgrade a document status (e.g., VERIFIED → SUBMITTED is not allowed)
2. NEVER decrease vehicle count unless explicitly stated
3. Phone numbers are immutable once set
4. Prefer more complete/recent data over older data
5. If a field in DB is empty/null and new data has a value → always update
6. If both DB and new data have the same field → check if new is "better" (more verified, more specific)
7. Document status priority: NOT_SUBMITTED < SUBMITTED < VERIFIED (REJECTED is terminal unless overridden by support)
8. Flag conflicts explicitly with resolution reasoning

Return ONLY valid JSON with this structure:
{
  "should_update": boolean,
  "fields_to_update": { ...only fields that should change... },
  "conflicts": [ { "field": "", "db_value": "", "new_value": "", "resolution": "", "reason": "" } ],
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

export async function runReconciliationAgent(
  currentLead: Lead,
  newData: UnderstandingAgentOutput
): Promise<ReconciliationDecision> {
  const fallback: ReconciliationDecision = {
    should_update: false,
    fields_to_update: {},
    conflicts: [],
    confidence: 0,
    reasoning: 'Agent failed to reconcile',
  };

  const prompt = `
Current DB State:
${JSON.stringify(
  {
    name: currentLead.name,
    email: currentLead.email,
    city: currentLead.city,
    vehicleType: currentLead.vehicleType,
    vehicleCount: currentLead.vehicleCount,
    aadhaarStatus: currentLead.aadhaarStatus,
    bankStatus: currentLead.bankStatus,
    rcStatus: currentLead.rcStatus,
    appInstalled: currentLead.appInstalled,
    preferredChannel: currentLead.preferredChannel,
    currentStage: currentLead.currentStage,
  },
  null,
  2
)}

Newly Extracted Data:
${JSON.stringify(newData, null, 2)}

Analyze conflicts and decide what to update. Follow all rules strictly.`;

  const result = await callGroqJSON<ReconciliationDecision>(
    SYSTEM_PROMPT,
    prompt,
    fallback
  );

  return { ...fallback, ...result };
}
