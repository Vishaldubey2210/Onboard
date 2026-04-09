export type LeadStage =
  | 'NEW'
  | 'CONTACTED'
  | 'DOCUMENTS_PENDING'
  | 'DOCUMENTS_SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ONBOARDED';

export type Channel = 'EMAIL' | 'WHATSAPP' | 'CALL' | 'API' | 'SYSTEM' | 'CSV';

export type DocumentStatus = 'NOT_SUBMITTED' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';

export type VehicleType =
  | 'TWO_WHEELER'
  | 'THREE_WHEELER'
  | 'FOUR_WHEELER'
  | 'HEAVY_VEHICLE';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  city?: string | null;
  vehicleType?: VehicleType | null;
  vehicleCount?: number | null;
  aadhaarStatus: DocumentStatus;
  bankStatus: DocumentStatus;
  rcStatus: DocumentStatus;
  appInstalled: boolean;
  preferredChannel: Channel;
  currentStage: LeadStage;
  leadScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeadEvent {
  id: string;
  leadId: string;
  source: Channel;
  rawInput: string;
  parsedOutput?: Record<string, unknown> | null;
  createdAt: string;
}

export interface LeadStateHistory {
  id: string;
  leadId: string;
  previousState: Record<string, unknown>;
  newState: Record<string, unknown>;
  changedBy: string;
  timestamp: string;
}

export interface AgentOutput {
  id: string;
  leadId: string;
  agentName: string;
  outputJson: Record<string, unknown>;
  createdAt: string;
}

export interface CommunicationLog {
  id: string;
  leadId: string;
  channel: Channel;
  message: string;
  direction: 'incoming' | 'outgoing';
  timestamp: string;
}

export interface ProcessingResult {
  score: number;
  stage: LeadStage;
  missing_fields: string[];
  preferred_channel: Channel;
  latest_update_source: string;
  extracted_info: Record<string, unknown>;
  next_best_action: string;
  whatsapp_message: string;
  email_message: string;
  callback_note: string;
}

export interface EventPayload {
  leadId?: string;
  phone?: string;
  source: Channel;
  rawInput: string;
}

export interface CSVRow {
  name: string;
  phone: string;
  email?: string;
  city?: string;
  vehicle_type?: string;
  vehicle_count?: string;
  preferred_channel?: string;
  [key: string]: string | undefined;
}
