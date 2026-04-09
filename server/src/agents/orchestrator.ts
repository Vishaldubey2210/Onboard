import { Lead } from '@prisma/client';
import { runUnderstandingAgent } from './understanding.agent';
import { runReconciliationAgent } from './reconciliation.agent';
import { runQualificationAgent } from './qualification.agent';
import { runResponseAgent } from './response.agent';
import { runSyncAgent } from './sync.agent';
import { ProcessingResult } from '../../../shared/types';
import { logTimelineEvent } from '../services/timeline.service';

export interface OrchestratorInput {
  lead: Lead;
  rawInput: string;
  source: string;
}

export async function runAgentPipeline(
  input: OrchestratorInput
): Promise<ProcessingResult> {
  const { lead, rawInput, source } = input;

  console.log(`[Orchestrator] Starting pipeline for lead ${lead.id}`);

  // PHASE 1: Understanding Agent
  console.log('[Orchestrator] Running Understanding Agent...');
  const understanding = await runUnderstandingAgent(rawInput);
  await logTimelineEvent(lead.id, 'AI_UNDERSTANDING', `Detected intents from raw input with ${(understanding.confidence * 100).toFixed(0)}% confidence.`, source);
  console.log('[Orchestrator] Understanding complete. Confidence:', understanding.confidence);

  // PHASE 2: Reconciliation Agent
  console.log('[Orchestrator] Running Reconciliation Agent...');
  const reconciliation = await runReconciliationAgent(lead, understanding);
  if (reconciliation.should_update) {
    await logTimelineEvent(lead.id, 'AI_RECONCILIATION', `Conflict resolved. Preparing to update ${Object.keys(reconciliation.fields_to_update).length} fields.`, source);
  }
  console.log('[Orchestrator] Reconciliation complete. Should update:', reconciliation.should_update);

  // PHASE 3: Qualification Agent (uses updated data projection)
  const projectedLead = {
    ...lead,
    ...(reconciliation.should_update ? reconciliation.fields_to_update : {}),
  };
  console.log('[Orchestrator] Running Qualification Agent...');
  const qualification = await runQualificationAgent(projectedLead);
  console.log('[Orchestrator] Qualification complete. Score:', qualification.lead_score, 'Stage:', qualification.stage);

  // PHASE 4: Response Agent
  console.log('[Orchestrator] Running Response Agent...');
  const response = await runResponseAgent(projectedLead, qualification);
  await logTimelineEvent(lead.id, 'AI_RESPONSE', `Generated dynamic follow-ups focusing on: ${response.next_best_action}`, source);
  console.log('[Orchestrator] Response generated.');

  // PHASE 5: Sync Agent (DB write)
  console.log('[Orchestrator] Running Sync Agent...');
  const sync = await runSyncAgent(
    lead,
    reconciliation,
    qualification,
    response,
    understanding,
    source
  );
  console.log('[Orchestrator] Sync complete. Fields changed:', sync.fields_changed);

  // Build final result
  const result: ProcessingResult = {
    score: sync.new_score,
    stage: sync.new_stage as ProcessingResult['stage'],
    missing_fields: qualification.missing_fields,
    preferred_channel: (projectedLead.preferredChannel ?? 'WHATSAPP') as ProcessingResult['preferred_channel'],
    latest_update_source: source,
    extracted_info: understanding.raw_entities,
    next_best_action: response.next_best_action,
    whatsapp_message: response.whatsapp_message,
    email_message: response.email_message,
    callback_note: response.callback_note,
  };

  return result;
}
