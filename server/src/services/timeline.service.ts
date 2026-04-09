import prisma from '../utils/prisma';
import { broadcastLeadUpdate } from './socket.service';

export async function logTimelineEvent(
  leadId: string,
  eventType: string,
  message: string,
  source?: string
) {
  try {
    const timeline = await prisma.leadTimeline.create({
      data: {
        leadId,
        eventType,
        message,
        source,
      },
    });
    
    // Broadcast real-time update
    broadcastLeadUpdate(leadId, 'timeline_update', timeline);

    return timeline;
  } catch (err) {
    console.error(`[Timeline Error] Failed to log event for lead ${leadId}:`, err);
  }
}
