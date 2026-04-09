import { Lead, Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { ReconciliationDecision } from './reconciliation.agent';
import { QualificationAgentOutput } from './qualification.agent';
import { ResponseAgentOutput } from './response.agent';
import { UnderstandingAgentOutput } from './understanding.agent';
import { dispatchWebhooks } from '../services/webhook.service';

export interface SyncAgentOutput {
  lead_id: string;
  updated: boolean;
  fields_changed: string[];
  new_stage: string;
  new_score: number;
}

export async function runSyncAgent(
  currentLead: Lead,
  reconciliation: ReconciliationDecision,
  qualification: QualificationAgentOutput,
  response: ResponseAgentOutput,
  understanding: UnderstandingAgentOutput,
  source: string
): Promise<SyncAgentOutput> {
  const fieldsChanged: string[] = [];
  const previousState = { ...currentLead } as Record<string, unknown>;

  // Build update payload from reconciliation decision
  const updateData: Prisma.LeadUpdateInput = {
    lastUpdatedFrom: source as any
  };

  if (reconciliation.should_update && reconciliation.fields_to_update) {
    const f = reconciliation.fields_to_update;

    if (f.name && (!currentLead.name || currentLead.name === 'Unknown Caller') && f.name !== currentLead.name) {
      updateData.name = f.name;
      fieldsChanged.push('name');
    }
    if (!currentLead.email && f.email) {
      updateData.email = f.email;
      fieldsChanged.push('email');
    }
    if (!currentLead.city && f.city) {
      updateData.city = f.city;
      fieldsChanged.push('city');
    }
    if (!currentLead.vehicleType && f.vehicleType) {
      updateData.vehicleType = f.vehicleType as Lead['vehicleType'];
      fieldsChanged.push('vehicleType');
    }
    if (!currentLead.vehicleCount && f.vehicleCount) {
      updateData.vehicleCount = f.vehicleCount;
      fieldsChanged.push('vehicleCount');
    }
    if (currentLead.aadhaarStatus === 'NOT_SUBMITTED' && f.aadhaarStatus && f.aadhaarStatus !== 'NOT_SUBMITTED') {
      updateData.aadhaarStatus = f.aadhaarStatus as Lead['aadhaarStatus'];
      (updateData as any).aadhaarSource = source;
      fieldsChanged.push('aadhaarStatus');
    }
    if (currentLead.bankStatus === 'NOT_SUBMITTED' && f.bankStatus && f.bankStatus !== 'NOT_SUBMITTED') {
      updateData.bankStatus = f.bankStatus as Lead['bankStatus'];
      (updateData as any).bankSource = source;
      fieldsChanged.push('bankStatus');
    }
    if (currentLead.rcStatus === 'NOT_SUBMITTED' && f.rcStatus && f.rcStatus !== 'NOT_SUBMITTED') {
      updateData.rcStatus = f.rcStatus as Lead['rcStatus'];
      (updateData as any).rcSource = source;
      fieldsChanged.push('rcStatus');
    }
    if (f.appInstalled !== undefined && f.appInstalled !== currentLead.appInstalled) {
      updateData.appInstalled = f.appInstalled;
      fieldsChanged.push('appInstalled');
    }
    if (f.preferredChannel && f.preferredChannel !== currentLead.preferredChannel) {
      updateData.preferredChannel = f.preferredChannel as Lead['preferredChannel'];
      fieldsChanged.push('preferredChannel');
    }
  }

  // Generate explicit timeline tracking descriptions
  const timelineEvents: Prisma.LeadTimelineCreateManyInput[] = fieldsChanged.map(field => ({
    leadId: currentLead.id,
    eventType: 'FIELD_UPDATED',
    message: `${source}: Updated ${field} with new information.`,
    source: source
  }));

  // Always update stage and score from qualification
  const newStage = qualification.stage as Lead['currentStage'];
  const newScore = qualification.lead_score;

  if (newStage !== currentLead.currentStage) {
    updateData.currentStage = newStage;
    fieldsChanged.push('currentStage');
  }
  if (newScore !== currentLead.leadScore) {
    updateData.leadScore = newScore;
    fieldsChanged.push('leadScore');
  }
  if (qualification.priority !== currentLead.priority) {
    updateData.priority = qualification.priority;
    fieldsChanged.push('priority');
  }
  if (understanding.confidence !== currentLead.confidence) {
    updateData.confidence = understanding.confidence;
    fieldsChanged.push('confidence');
  }

  // Execute DB operations in a transaction
  await prisma.$transaction(async (tx) => {
    // 1. Update lead if there are changes
    if (fieldsChanged.length > 0) {
      await tx.lead.update({
        where: { id: currentLead.id },
        data: updateData,
      });
    }

    // 2. Always save state history
    const newState = {
      ...previousState,
      ...updateData,
      currentStage: newStage,
      leadScore: newScore,
    };

    await tx.leadStateHistory.create({
      data: {
        leadId: currentLead.id,
        previousState: previousState as Prisma.InputJsonValue,
        newState: newState as Prisma.InputJsonValue,
        changedBy: source,
      },
    });

    // 3. Save explicit timeline events
    if (timelineEvents.length > 0) {
      await tx.leadTimeline.createMany({ data: timelineEvents });
    }

    // 4. Save agent outputs
    await tx.agentOutput.createMany({
      data: [
        {
          leadId: currentLead.id,
          agentName: 'understanding_agent',
          outputJson: understanding as Prisma.InputJsonValue,
        },
        {
          leadId: currentLead.id,
          agentName: 'reconciliation_agent',
          outputJson: reconciliation as unknown as Prisma.InputJsonValue,
        },
        {
          leadId: currentLead.id,
          agentName: 'qualification_agent',
          outputJson: qualification as unknown as Prisma.InputJsonValue,
        },
        {
          leadId: currentLead.id,
          agentName: 'response_agent',
          outputJson: response as unknown as Prisma.InputJsonValue,
        },
      ],
    });

    // 4. Log outgoing communication
    await tx.communicationLog.create({
      data: {
        leadId: currentLead.id,
        channel: (currentLead.preferredChannel ?? 'WHATSAPP') as Lead['preferredChannel'],
        message: response.whatsapp_message,
        direction: 'outgoing',
      },
    });
  });

  // Trigger global webhooks asynchronously
  if (fieldsChanged.length > 0) {
    dispatchWebhooks('LEAD_UPDATED', {
      lead_id: currentLead.id,
      fields_changed: fieldsChanged,
      new_stage: newStage,
      new_score: newScore
    }).catch(console.error);
  }

  return {
    lead_id: currentLead.id,
    updated: fieldsChanged.length > 0,
    fields_changed: fieldsChanged,
    new_stage: newStage,
    new_score: newScore,
  };
}
