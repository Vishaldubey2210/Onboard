import { callGroqJSON } from '../services/groq.service';

export interface UnderstandingAgentOutput {
  name?: string;
  phone?: string;
  email?: string;
  city?: string;
  vehicle_type?: string;
  vehicle_count?: number;
  aadhaar_status?: string;
  bank_status?: string;
  rc_status?: string;
  app_installed?: boolean;
  preferred_channel?: string;
  intent?: string;
  confidence: number;
  raw_entities: Record<string, unknown>;
}

const SYSTEM_PROMPT = `You are an information extraction agent for a driver/fleet onboarding system.

Your job: Extract structured data from any incoming message (email, WhatsApp, call transcript, API payload).

Extract these fields if present:
- name (string)
- phone (10-digit Indian mobile number, normalize format)
- email (string)
- city (string)
- vehicle_type (one of: TWO_WHEELER, THREE_WHEELER, FOUR_WHEELER, HEAVY_VEHICLE)
- vehicle_count (integer)
- aadhaar_status (one of: NOT_SUBMITTED, SUBMITTED, VERIFIED, REJECTED)
- bank_status (one of: NOT_SUBMITTED, SUBMITTED, VERIFIED, REJECTED)
- rc_status (one of: NOT_SUBMITTED, SUBMITTED, VERIFIED, REJECTED)
- app_installed (boolean)
- preferred_channel (one of: EMAIL, WHATSAPP, CALL, API)
- intent (what the user wants: e.g. "submit_documents", "check_status", "register", "inquiry")

Rules:
- Only include fields you can confidently extract
- Phone numbers: normalize to 10-digit without country code
- confidence: 0-1 score of how much useful info was extracted
- raw_entities: any other entities found that don't fit the schema

Return ONLY valid JSON. No explanations.

Example output:
{
  "name": "Rajesh Kumar",
  "phone": "9876543210",
  "city": "Delhi",
  "vehicle_type": "THREE_WHEELER",
  "intent": "register",
  "confidence": 0.9,
  "raw_entities": {}
}`;

export async function runUnderstandingAgent(
  rawInput: string
): Promise<UnderstandingAgentOutput> {
  const fallback: UnderstandingAgentOutput = {
    confidence: 0,
    raw_entities: {},
  };

  const result = await callGroqJSON<UnderstandingAgentOutput>(
    SYSTEM_PROMPT,
    `Extract structured data from this input:\n\n${rawInput}`,
    fallback
  );

  return { ...fallback, ...result };
}
