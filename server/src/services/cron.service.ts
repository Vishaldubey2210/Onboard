import cron from 'node-cron';
import prisma from '../utils/prisma';
import { runAgentPipeline } from '../agents/orchestrator';
import { logTimelineEvent } from './timeline.service';
import { sendReminderNotification, sendEscalationNotification } from './notification.service';

export function startCronJobs() {
  console.log('[Cron] Initializing auto follow-up jobs...');

  // ─── Every hour: Reminder, Escalation, Auto-Status ────
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Running scheduled automation suite');
    try {
      const now = new Date();
      const deadline24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const deadline72h = new Date(now.getTime() - 72 * 60 * 60 * 1000);

      // ── 1) Auto reminder (24h stuck) ──
      const reminderLeads = await prisma.lead.findMany({
        where: {
          currentStage: { in: ['NEW', 'DOCUMENTS_PENDING'] },
          updatedAt: { lte: deadline24h, gt: deadline72h }
        }
      });

      for (const lead of reminderLeads) {
        await logTimelineEvent(lead.id, 'AUTO_REMINDER', '24h auto-reminder triggered for stalled lead', 'SYSTEM');
        
        // Find missing docs to list in notification
        const missing: string[] = [];
        if (lead.aadhaarStatus === 'NOT_SUBMITTED' || lead.aadhaarStatus === 'REJECTED') missing.push('Aadhaar');
        if (lead.rcStatus === 'NOT_SUBMITTED' || lead.rcStatus === 'REJECTED') missing.push('Vehicle RC');
        if (lead.bankStatus === 'NOT_SUBMITTED' || lead.bankStatus === 'REJECTED') missing.push('Bank Details');
        
        await sendReminderNotification(
          lead.id, 
          lead.name, 
          lead.phone, 
          lead.email, 
          missing.length ? missing : ['Pending steps'], 
          lead.preferredChannel
        );
      }

      // ── 2) SLA Escalation (72h stuck) ──
      const escalationLeads = await prisma.lead.findMany({
        where: {
          currentStage: { in: ['NEW', 'DOCUMENTS_PENDING', 'DOCUMENTS_SUBMITTED'] },
          updatedAt: { lte: deadline72h },
          escalated: false
        }
      });

      for (const lead of escalationLeads) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { escalated: true, priority: 'HIGH' }
        });
        await logTimelineEvent(lead.id, 'SLA_ESCALATION', '72h SLA breached – lead escalated to HIGH priority', 'SYSTEM');
        
        await sendEscalationNotification(
          lead.id,
          lead.name,
          lead.phone,
          '72h SLA breached without verification'
        );
      }

      // ── 3) Auto status: All docs verified → ONBOARDED ──
      const autoOnboardLeads = await prisma.lead.findMany({
        where: {
          aadhaarStatus: 'VERIFIED',
          bankStatus: 'VERIFIED',
          rcStatus: 'VERIFIED',
          appInstalled: true,
          currentStage: { notIn: ['ONBOARDED', 'REJECTED'] }
        }
      });

      for (const lead of autoOnboardLeads) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { currentStage: 'ONBOARDED', onboardedAt: now }
        });
        await logTimelineEvent(lead.id, 'AUTO_ONBOARDED', 'All documents verified + app installed → Auto-onboarded', 'SYSTEM');
      }

      console.log(`[Cron] Processed ${reminderLeads.length} reminders, ${escalationLeads.length} escalations, ${autoOnboardLeads.length} auto-onboards`);
    } catch (err) {
      console.error('[Cron] Error running scheduled jobs:', err);
    }
  });
}
