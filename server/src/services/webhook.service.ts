import prisma from '../utils/prisma';
import axios from 'axios';

export async function dispatchWebhooks(event: string, payload: any) {
  try {
    const subscriptions = await prisma.webhookSubscription.findMany({
      where: {
        OR: [
          { event: '*' },
          { event },
        ]
      }
    });

    for (const sub of subscriptions) {
      try {
        await axios.post(sub.url, {
          event,
          timestamp: new Date().toISOString(),
          data: payload,
        }, { timeout: 5000 });
      } catch (e: any) {
        console.error(`[Webhook Error] Failed to dispatch to ${sub.url}:`, e.message);
      }
    }
  } catch (error) {
    console.error('[Webhook System] Error evaluating subscriptions:', error);
  }
}
