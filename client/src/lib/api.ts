const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : '/api';

function getAuthHeaders() {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options?.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.error ?? `HTTP ${res.status}`);
    if (data.code) (err as any).code = data.code;
    throw err;
  }

  return data as T;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  vehicleType: string | null;
  vehicleCount: number | null;
  aadhaarStatus: string;
  bankStatus: string;
  rcStatus: string;
  appInstalled: boolean;
  preferredChannel: string;
  currentStage: string;
  leadScore: number;
  createdAt: string;
  updatedAt: string;
  lastUpdatedFrom: string | null;
  identifiedBy: string | null;
  aadhaarSource: string | null;
  bankSource: string | null;
  rcSource: string | null;
}

export interface LeadDetail extends Lead {
  events: Array<{
    id: string;
    source: string;
    rawInput: string;
    createdAt: string;
  }>;
  stateHistory: Array<{
    id: string;
    previousState: Record<string, unknown>;
    newState: Record<string, unknown>;
    changedBy: string;
    timestamp: string;
  }>;
  agentOutputs: Array<{
    id: string;
    agentName: string;
    outputJson: Record<string, unknown>;
    createdAt: string;
  }>;
  communicationLogs: Array<{
    id: string;
    channel: string;
    message: string;
    direction: string;
    timestamp: string;
  }>;
}

export interface ProcessingResult {
  score: number;
  stage: string;
  missing_fields: string[];
  preferred_channel: string;
  latest_update_source: string;
  extracted_info: Record<string, unknown>;
  next_best_action: string;
  whatsapp_message: string;
  email_message: string;
  callback_note: string;
}

export const api = {
  // Auth
  login: (payload: any) =>
    apiFetch<{ success: boolean; token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  register: (payload: any) =>
    apiFetch<{ success: boolean; token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Leads
  getLeads: (params?: { page?: number; limit?: number; stage?: string; search?: string; city?: string; minScore?: number }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.stage) q.set('stage', params.stage);
    if (params?.search) q.set('search', params.search);
    if (params?.city) q.set('city', params.city);
    if (params?.minScore !== undefined) q.set('minScore', String(params.minScore));
    return apiFetch<{ data: Lead[]; pagination: { page: number; total: number; totalPages: number } }>(
      `/leads?${q.toString()}`
    );
  },

  getLead: (id: string) =>
    apiFetch<{ lead: LeadDetail; latestQualification: Record<string, unknown> | null }>(`/lead/${id}`),

  getTimeline: (id: string) =>
    apiFetch<{ success: boolean; data: any[] }>(`/lead/${id}/timeline`),

  getDebugLogs: (id: string) =>
    apiFetch<{ success: boolean; data: any[] }>(`/lead/${id}/debug`),

  getAnalytics: () =>
    apiFetch<{ success: boolean; data: any }>(`/analytics`),

  // Interaction Simulator
  postEvent: (data: { leadId?: string; phone?: string; email?: string; name?: string; source: string; rawInput: string; forceMerge?: boolean }) =>
    apiFetch<{ success: boolean; eventId: string; leadId: string; identifiedBy: string }>('/event', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Processing
  processLead: (leadId: string, rawInput?: string, source?: string) =>
    apiFetch<{ success: boolean; result: ProcessingResult }>(`/process/${leadId}`, {
      method: 'POST',
      body: JSON.stringify({ rawInput, source }),
    }),

  getLatestResult: (leadId: string) =>
    apiFetch<{ processed: boolean; result?: ProcessingResult; lead: Lead }>(`/process/${leadId}/latest`),

  // Documents
  uploadDocument: async (id: string, docType: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('docType', docType);
    const res = await fetch(`${API_BASE}/lead/${id}/upload-document`, {
      method: 'POST',
      body: form,
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Upload failed');
    return data as { success: boolean; lead: LeadDetail };
  },
  verifyDocument: (id: string, docType: string) =>
    apiFetch<{ success: boolean; lead: LeadDetail }>(`/lead/${id}/verify-document`, {
      method: 'POST', body: JSON.stringify({ docType })
    }),
  rejectDocument: (id: string, docType: string, reason: string) =>
    apiFetch<{ success: boolean; lead: LeadDetail }>(`/lead/${id}/reject-document`, {
      method: 'POST', body: JSON.stringify({ docType, reason })
    }),

  // Advanced AI
  chatWithAI: (leadId: string, message: string) =>
    apiFetch<{ success: boolean; data: { reply: string, suggestions: string[] } }>('/ai/chat', {
      method: 'POST', body: JSON.stringify({ leadId, message })
    }),
  simulateVoice: (transcript: string) =>
    apiFetch<{ success: boolean; data: any }>('/ai/voice', {
      method: 'POST', body: JSON.stringify({ transcript })
    }),

  // Advanced Analytics
  getAnalyticsOverview: () => apiFetch<{ success: boolean; data: any }>('/analytics/overview'),
  getAnalyticsPerformance: () => apiFetch<{ success: boolean; data: any[] }>('/analytics/performance'),
  getAnalyticsFunnel: () => apiFetch<{ success: boolean; data: any }>('/analytics/funnel'),
  getAnalyticsCityWise: () => apiFetch<{ success: boolean; data: any[] }>('/analytics/city-wise'),
  getAnalyticsDropOff: () => apiFetch<{ success: boolean; data: any[] }>('/analytics/drop-off'),
  getAnalyticsRejectionRate: () => apiFetch<{ success: boolean; data: any }>('/analytics/rejection-rate'),
  getAuditLogs: () => apiFetch<{ success: boolean; data: any[] }>('/analytics/audit-logs'),

  // Explainability
  getExplainability: (id: string) => apiFetch<{ success: boolean; data: any }>(`/lead/${id}/explain`),

  // Override
  overrideLead: (id: string, payload: { stage?: string; score?: number; priority?: string; reason: string }) =>
    apiFetch<{ success: boolean; lead: any }>(`/lead/${id}/override`, {
      method: 'POST', body: JSON.stringify(payload)
    }),

  // Driver Self-Service
  getDriverLead: () => apiFetch<{ success: boolean; lead: any; nextAction: string }>('/driver/my-lead'),
  updateDriverProfile: (payload: { city?: string; vehicleType?: string; vehicleCount?: number; email?: string }) =>
    apiFetch<{ success: boolean; lead: any }>('/driver/update-profile', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // CSV Upload (special - uses FormData)
  uploadCSV: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE}/upload-csv`, { 
      method: 'POST', 
      body: form,
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Upload failed');
    return data as { success: boolean; total: number; created: number; skipped: number; errors: string[] };
  },
};
