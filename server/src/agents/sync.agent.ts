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
  const updateData: Prisma.LeadUpdateInput = {};

  if (reconciliation.should_update && reconciliation.fields_to_update) {
    const f = reconciliation.fields_to_update;

    if (f.name && f.name !== currentLead.name) {
      updateData.name = f.name;
      fieldsChanged.push('name');
    }
    if (f.email && f.email !== currentLead.email) {
      updateData.email = f.email;
      fieldsChanged.push('email');
    }
    if (f.city && f.city !== currentLead.city) {
      updateData.city = f.city;
      fieldsChanged.push('city');
    }
    if (f.vehicleType && f.vehicleType !== currentLead.vehicleType) {
      updateData.vehicleType = f.vehicleType as Lead['vehicleType'];
      fieldsChanged.push('vehicleType');
    }
    if (f.vehicleCount && f.vehicleCount !== currentLead.vehicleCount) {
      updateData.vehicleCount = f.vehicleCount;
      fieldsChanged.push('vehicleCount');
    }
    if (f.aadhaarStatus && f.aadhaarStatus !== currentLead.aadhaarStatus) {
      updateData.aadhaarStatus = f.aadhaarStatus as Lead['aadhaarStatus'];
      fieldsChanged.push('aadhaarStatus');
    }
    if (f.bankStatus && f.bankStatus !== currentLead.bankStatus) {
      updateData.bankStatus = f.bankStatus as Lead['bankStatus'];
      fieldsChanged.push('bankStatus');
    }
    if (f.rcStatus && f.rcStatus !== currentLead.rcStatus) {
      updateData.rcStatus = f.rcStatus as Lead['rcStatus'];
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

    // 3. Save agent outputs
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
