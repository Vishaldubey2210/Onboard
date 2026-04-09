/**
 * Notification Service — Mock Integration Layer
 * 
 * Simulates WhatsApp and Email sending for the onboarding platform.
 * All notifications are logged to the database (CommunicationLog)
 * and printed to the console for debugging.
 * 
 * In production, replace the mock functions with:
 * - Twilio / Gupshup for WhatsApp
 * - SendGrid / AWS SES for Email
 */
import prisma from '../utils/prisma';
import { logTimelineEvent } from './timeline.service';

export interface NotificationPayload {
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadEmail?: string | null;
  message: string;
  channel: 'WHATSAPP' | 'EMAIL';
  subject?: string; // Email only
  triggeredBy: string; // 'SYSTEM', 'ADMIN', 'AI_PIPELINE', etc.
}

/**
 * Send a mock WhatsApp message.
 * Logs to DB + console. Replace with Twilio in production.
 */
export async function sendWhatsAppMock(payload: NotificationPayload): Promise<boolean> {
  const { leadId, leadName, leadPhone, message, triggeredBy } = payload;

  console.log(`\n📱 [WhatsApp MOCK] ─────────────────────────`);
  console.log(`   To: ${leadName} (${leadPhone})`);
  console.log(`   Message: ${message.slice(0, 120)}${message.length > 120 ? '...' : ''}`);
  console.log(`   Triggered by: ${triggeredBy}`);
  console.log(`───────────────────────────────────────────\n`);

  try {
    // Store in CommunicationLog
    await prisma.communicationLog.create({
      data: {
        leadId,
        channel: 'WHATSAPP',
        message: message,
        direction: 'outgoing',
      }
    });

    // Log timeline event
    await logTimelineEvent(
      leadId,
      'NOTIFICATION_SENT',
      `WhatsApp message sent to ${leadName}: "${message.slice(0, 80)}..."`,
      triggeredBy
    );

    return true;
  } catch (err) {
    console.error('[Notification] WhatsApp mock failed:', err);
    return false;
  }
}

/**
 * Send a mock Email.
 * Logs to DB + console. Replace with SendGrid/SES in production.
 */
export async function sendEmailMock(payload: NotificationPayload): Promise<boolean> {
  const { leadId, leadName, leadEmail, message, subject, triggeredBy } = payload;

  console.log(`\n📧 [Email MOCK] ───────────────────────────`);
  console.log(`   To: ${leadName} <${leadEmail || 'no-email@placeholder.com'}>`);
  console.log(`   Subject: ${subject || 'OnboardAI Notification'}`);
  console.log(`   Body: ${message.slice(0, 120)}${message.length > 120 ? '...' : ''}`);
  console.log(`   Triggered by: ${triggeredBy}`);
  console.log(`───────────────────────────────────────────\n`);

  try {
    // Store in CommunicationLog
    await prisma.communicationLog.create({
      data: {
        leadId,
        channel: 'EMAIL',
        message: `[Subject: ${subject || 'Notification'}] ${message}`,
        direction: 'outgoing',
      }
    });

    // Log timeline event
    await logTimelineEvent(
      leadId,
      'NOTIFICATION_SENT',
      `Email sent to ${leadName} (${leadEmail || 'no-email'}): "${subject || 'Notification'}"`,
      triggeredBy
    );

    return true;
  } catch (err) {
    console.error('[Notification] Email mock failed:', err);
    return false;
  }
}

/**
 * Smart notification dispatcher.
 * Picks the best channel based on the lead's preferred channel.
 */
export async function sendNotification(payload: NotificationPayload): Promise<boolean> {
  if (payload.channel === 'EMAIL' && payload.leadEmail) {
    return sendEmailMock(payload);
  }
  // Default to WhatsApp
  return sendWhatsAppMock({ ...payload, channel: 'WHATSAPP' });
}

/**
 * Send reminder notification for stalled leads.
 */
export async function sendReminderNotification(
  leadId: string,
  leadName: string,
  leadPhone: string,
  leadEmail: string | null,
  missingItems: string[],
  preferredChannel: string
): Promise<boolean> {
  const itemList = missingItems.join(', ');
  const whatsappMsg = `Hi ${leadName}! 👋 Your onboarding is almost there. Please upload: ${itemList}. Complete it now to start earning! 🚀`;
  const emailMsg = `Dear ${leadName},\n\nWe noticed your onboarding is pending. Please submit the following: ${itemList}.\n\nComplete your onboarding today to start earning with our platform.\n\nBest regards,\nOnboardAI Team`;

  return sendNotification({
    leadId,
    leadName,
    leadPhone,
    leadEmail,
    message: preferredChannel === 'EMAIL' ? emailMsg : whatsappMsg,
    channel: preferredChannel === 'EMAIL' ? 'EMAIL' : 'WHATSAPP',
    subject: `Action Required: Complete Your Onboarding — ${leadName}`,
    triggeredBy: 'SYSTEM_AUTOMATION',
  });
}

/**
 * Send escalation alert notification (to admin channels / internal logs).
 */
export async function sendEscalationNotification(
  leadId: string,
  leadName: string,
  leadPhone: string,
  reason: string
): Promise<boolean> {
  const msg = `⚠️ ESCALATION: Lead "${leadName}" (${leadPhone}) has been escalated. Reason: ${reason}. Immediate attention required.`;

  console.log(`\n🚨 [ESCALATION ALERT] ─────────────────────`);
  console.log(`   Lead: ${leadName} (${leadPhone})`);
  console.log(`   Reason: ${reason}`);
  console.log(`───────────────────────────────────────────\n`);

  try {
    await prisma.communicationLog.create({
      data: {
        leadId,
        channel: 'SYSTEM',
        message: msg,
        direction: 'outgoing',
      }
    });

    await logTimelineEvent(leadId, 'ESCALATION_ALERT', msg, 'SYSTEM');
    return true;
  } catch (err) {
    console.error('[Notification] Escalation alert failed:', err);
    return false;
  }
}
