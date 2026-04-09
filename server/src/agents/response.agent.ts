import { Lead } from '@prisma/client';
import { callGroqJSON } from '../services/groq.service';
import { QualificationAgentOutput } from './qualification.agent';

export interface ResponseAgentOutput {
  whatsapp_message: string;
  email_subject: string;
  email_message: string;
  callback_note: string;
  next_best_action: string;
}

const SYSTEM_PROMPT = `You are a communication agent for a driver onboarding platform (like Rapido/Ola).

Generate personalized, professional messages in a friendly tone for Indian drivers.

Context: You help drivers complete their onboarding (Aadhaar, bank details, RC document, app install).

Rules:
- WhatsApp: Short, conversational, use emojis appropriately, max 3 sentences
- Email: Professional, detailed, include specific next steps
- Callback note: Brief internal note for the support agent making the call
- Next best action: Specific actionable step (e.g., "Request Aadhaar upload via WhatsApp")
- Use driver's name if available
- Mention specific missing documents by name
- Be encouraging and clear

Return ONLY valid JSON:
{
  "whatsapp_message": string,
  "email_subject": string,
  "email_message": string,
  "callback_note": string,
  "next_best_action": string
}`;

export async function runResponseAgent(
  lead: Partial<Lead>,
  qualification: QualificationAgentOutput
): Promise<ResponseAgentOutput> {
  const fallback: ResponseAgentOutput = {
    whatsapp_message: `Hi ${lead.name ?? 'there'}! 👋 Please complete your onboarding. Missing: ${qualification.missing_fields.join(', ')}`,
    email_subject: `Complete Your Onboarding - ${lead.name ?? 'Driver'}`,
    email_message: `Dear ${lead.name ?? 'Driver'},\n\nPlease complete your onboarding by submitting: ${qualification.missing_fields.join(', ')}.\n\nThank you.`,
    callback_note: `Lead in ${qualification.stage} stage. Missing: ${qualification.missing_fields.join(', ')}. Score: ${qualification.lead_score}.`,
    next_best_action: qualification.missing_fields.length > 0
      ? `Collect missing: ${qualification.missing_fields[0]}`
      : 'Approve and onboard driver',
  };

  try {
    const prompt = `
Lead Information:
- Name: ${lead.name ?? 'Unknown'}
- City: ${lead.city ?? 'Unknown'}
- Vehicle Type: ${lead.vehicleType ?? 'Unknown'}
- Vehicle Count: ${lead.vehicleCount ?? 'Unknown'}
- Stage: ${qualification.stage}
- Lead Score: ${qualification.lead_score}/100
- Priority: ${qualification.priority}
- Missing Fields: ${qualification.missing_fields.join(', ') || 'None - fully complete!'}
- Aadhaar: ${lead.aadhaarStatus}
- Bank: ${lead.bankStatus}  
- RC: ${lead.rcStatus}
- App Installed: ${lead.appInstalled}

Generate personalized messages for this driver.`;

    const result = await callGroqJSON<ResponseAgentOutput>(
      SYSTEM_PROMPT,
      prompt,
      fallback
    );

    return { ...fallback, ...result };
  } catch {
    return fallback;
  }
}
