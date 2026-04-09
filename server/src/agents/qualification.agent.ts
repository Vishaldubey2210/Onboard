import { Lead } from '@prisma/client';
import { callGroqJSON } from '../services/groq.service';

export interface QualificationAgentOutput {
  lead_score: number;
  stage: string;
  missing_fields: string[];
  completeness_pct: number;
  reasoning: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

// Deterministic scoring rules (AI supplements, not replaces)
export function computeLeadScoreDeterministic(lead: Partial<Lead>): number {
  let score = 0;

  // Basic info completeness (30 points)
  if (lead.name) score += 5;
  if (lead.email) score += 5;
  if (lead.city) score += 5;
  if (lead.vehicleType) score += 8;
  if (lead.vehicleCount && lead.vehicleCount > 0) score += 7;

  // Document status (45 points)
  const docScore = (status: string | null | undefined) => {
    if (status === 'VERIFIED') return 15;
    if (status === 'SUBMITTED') return 8;
    if (status === 'REJECTED') return 0;
    return 0;
  };
  score += docScore(lead.aadhaarStatus);
  score += docScore(lead.bankStatus);
  score += docScore(lead.rcStatus);

  // App installed (15 points)
  if (lead.appInstalled) score += 15;

  // Stage bonus (10 points)
  const stageBonus: Record<string, number> = {
    NEW: 0,
    CONTACTED: 2,
    DOCUMENTS_PENDING: 3,
    DOCUMENTS_SUBMITTED: 5,
    UNDER_REVIEW: 7,
    APPROVED: 10,
    ONBOARDED: 10,
    REJECTED: 0,
  };
  score += stageBonus[lead.currentStage ?? 'NEW'] ?? 0;

  return Math.min(100, score);
}

export function computeMissingFields(lead: Partial<Lead>): string[] {
  const missing: string[] = [];
  if (!lead.email) missing.push('email');
  if (!lead.city) missing.push('city');
  if (!lead.vehicleType) missing.push('vehicle_type');
  if (!lead.vehicleCount || lead.vehicleCount === 0) missing.push('vehicle_count');
  if (lead.aadhaarStatus === 'NOT_SUBMITTED') missing.push('aadhaar_document');
  if (lead.bankStatus === 'NOT_SUBMITTED') missing.push('bank_document');
  if (lead.rcStatus === 'NOT_SUBMITTED') missing.push('rc_document');
  if (!lead.appInstalled) missing.push('app_installation');
  return missing;
}

export function determineStage(lead: Partial<Lead>): string {
  if (lead.currentStage === 'REJECTED' || lead.currentStage === 'ONBOARDED') {
    return lead.currentStage;
  }

  const allDocsVerified =
    lead.aadhaarStatus === 'VERIFIED' &&
    lead.bankStatus === 'VERIFIED' &&
    lead.rcStatus === 'VERIFIED';

  const allDocsSubmitted =
    (lead.aadhaarStatus === 'SUBMITTED' || lead.aadhaarStatus === 'VERIFIED') &&
    (lead.bankStatus === 'SUBMITTED' || lead.bankStatus === 'VERIFIED') &&
    (lead.rcStatus === 'SUBMITTED' || lead.rcStatus === 'VERIFIED');

  const anyDocSubmitted =
    lead.aadhaarStatus !== 'NOT_SUBMITTED' ||
    lead.bankStatus !== 'NOT_SUBMITTED' ||
    lead.rcStatus !== 'NOT_SUBMITTED';

  if (allDocsVerified && lead.appInstalled) return 'APPROVED';
  if (allDocsVerified) return 'UNDER_REVIEW';
  if (allDocsSubmitted) return 'DOCUMENTS_SUBMITTED';
  if (anyDocSubmitted) return 'DOCUMENTS_PENDING';
  if (lead.currentStage === 'CONTACTED') return 'CONTACTED';
  return 'NEW';
}

const SYSTEM_PROMPT = `You are a lead qualification agent for a driver onboarding platform.

Given a lead's current state, provide:
1. An AI-assisted lead score (0-100)  
2. Stage determination
3. Missing fields list
4. Priority classification

The deterministic score is already computed. Your job is to validate and optionally adjust based on context.

Return ONLY valid JSON:
{
  "lead_score": number,
  "stage": string,
  "missing_fields": [],
  "completeness_pct": number,
  "reasoning": string,
  "priority": "HIGH" | "MEDIUM" | "LOW"
}`;

export async function runQualificationAgent(
  lead: Partial<Lead>
): Promise<QualificationAgentOutput> {
  const deterministicScore = computeLeadScoreDeterministic(lead);
  const missingFields = computeMissingFields(lead);
  const stage = determineStage(lead);

  const fallback: QualificationAgentOutput = {
    lead_score: deterministicScore,
    stage,
    missing_fields: missingFields,
    completeness_pct: Math.round(((8 - missingFields.length) / 8) * 100),
    reasoning: 'Deterministic scoring applied',
    priority: deterministicScore >= 70 ? 'HIGH' : deterministicScore >= 40 ? 'MEDIUM' : 'LOW',
  };

  try {
    const prompt = `
Lead State:
${JSON.stringify(lead, null, 2)}

Deterministic Score: ${deterministicScore}
Deterministic Stage: ${stage}
Missing Fields: ${missingFields.join(', ')}

Validate and refine this qualification. Consider:
- Vehicle count (higher = higher priority)
- City tier (metro cities = higher priority)
- Document completeness progression`;

    const result = await callGroqJSON<QualificationAgentOutput>(
      SYSTEM_PROMPT,
      prompt,
      fallback
    );

    // CRITICAL: AI can only adjust score by ±10 from deterministic
    const clampedScore = Math.min(
      deterministicScore + 10,
      Math.max(deterministicScore - 10, result.lead_score ?? deterministicScore)
    );

    return {
      ...fallback,
      ...result,
      lead_score: Math.min(100, Math.max(0, clampedScore)),
      // Stage is deterministic - AI cannot override
      stage,
      missing_fields: missingFields,
    };
  } catch {
    return fallback;
  }
}
