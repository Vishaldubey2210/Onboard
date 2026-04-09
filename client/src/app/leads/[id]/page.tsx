'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, LeadDetail, ProcessingResult } from '@/lib/api';
import { StageBadge, DocStatusBadge } from '@/components/StageBadge';
import { ScoreRing } from '@/components/ScoreRing';
import ChatWidget from '@/components/ChatWidget';
import { DocPreview } from '@/components/DocPreview';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="font-semibold text-slate-900 mb-4 pb-3 border-b border-slate-100">{title}</h2>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ lead: LeadDetail; latestQualification: Record<string, unknown> | null } | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [debugLogs, setDebugLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadDocType, setActiveUploadDocType] = useState<string>('');

  const load = async () => {
    try {
      const [detail, latest, timelineRes, debugRes] = await Promise.all([
        api.getLead(id),
        api.getLatestResult(id),
        api.getTimeline(id),
        api.getDebugLogs(id),
      ]);
      setData(detail);
      setTimeline(timelineRes.data || []);
      setDebugLogs(debugRes.data || []);
      if (latest.processed && latest.result) setResult(latest.result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        setUser(parsed);
      } catch (e) {}
    }
  }, []);


  const handleDocAction = async (docType: string, action: 'verify' | 'reject') => {
    try {
      let reason = '';
      if (action === 'reject') {
        reason = prompt('Please enter the reason for rejection:') || '';
        if (!reason && action === 'reject') return; // Cancel if no reason provided
      }
      setProcessing(true);
      if (action === 'verify') {
        await api.verifyDocument(id, docType);
      } else if (action === 'reject') {
        await api.rejectDocument(id, docType, reason);
      }
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadDocType) return;
    
    setProcessing(true);
    try {
      await api.uploadDocument(id, activeUploadDocType, file);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProcessing(false);
      setActiveUploadDocType('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleProcess = async () => {
    setProcessing(true);
    try {
      const res = await api.processLead(id);
      setResult(res.result);
      await load(); // refresh
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="card p-10 text-center text-slate-400">Loading lead...</div>;
  if (error) return <div className="card p-6 text-red-600">Error: {error}</div>;
  if (!data) return null;

  const { lead } = data;

  return (
    <div className="space-y-6">
      <input
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/leads" className="hover:text-blue-600">Applications</Link>
            <span>/</span>
            <span>{lead.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Application Review</h1>
          <div className="flex items-center gap-2 mt-1">
            <StageBadge stage={lead.currentStage} />
            <span className="text-sm text-slate-500 font-mono">{lead.phone}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleProcess}
            disabled={processing}
            className="btn-primary"
          >
            {processing ? '⚙️ Processing...' : '🤖 Run Verification Agent'}
          </button>
        </div>
      </div>

      {/* Score + Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5 flex flex-col items-center">
          <div className="text-sm text-slate-500 mb-2">Driver Score</div>
          <ScoreRing score={lead.leadScore} />
        </div>
        <div className="card p-5 col-span-2">
          <h2 className="font-semibold text-slate-900 mb-3">Profile</h2>
          <div className="grid grid-cols-2 gap-x-6">
            <InfoRow label="Email" value={lead.email ?? '—'} />
            <InfoRow label="City" value={lead.city ?? '—'} />
            <InfoRow label="Priority" value={
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${(lead as any).priority === 'HIGH' ? 'bg-red-100 text-red-700' : (lead as any).priority === 'MEDIUM' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>
                {(lead as any).priority ?? 'LOW'}
              </span>
            } />
            <InfoRow label="Confidence" value={(lead as any).confidence ? `${((lead as any).confidence * 100).toFixed(1)}%` : '—'} />
            <InfoRow label="Vehicle Type" value={lead.vehicleType?.replace(/_/g, ' ') ?? '—'} />
            <InfoRow label="Vehicle Count" value={lead.vehicleCount ?? '—'} />
            <InfoRow label="App Installed" value={lead.appInstalled ? '✅ Yes' : '❌ No'} />
            <InfoRow label="Preferred Channel" value={lead.preferredChannel} />
          </div>
        </div>
      </div>

      {/* Documents */}
      <Section title="Document Status">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { id: 'aadhaar', label: 'Aadhaar Card', status: lead.aadhaarStatus, url: (lead as any).aadhaarUrl, rejectReason: (lead as any).aadhaarRejectReason },
            { id: 'bank', label: 'Bank Details', status: lead.bankStatus, url: (lead as any).bankUrl, rejectReason: (lead as any).bankRejectReason },
            { id: 'rc', label: 'Vehicle RC', status: lead.rcStatus, url: (lead as any).rcUrl, rejectReason: (lead as any).rcRejectReason },
          ].map(({ id: docId, label, status, url, rejectReason }) => (
            <div key={label} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="font-medium text-slate-900">{label}</div>
                <DocStatusBadge status={status} />
              </div>
              
              {/* Document Preview Thumbnail */}
              {url && <DocPreview url={url} label={label} />}

              {status === 'REJECTED' && rejectReason && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
                  <span className="font-semibold">Reason:</span> {rejectReason}
                </div>
              )}
              
              <div className="flex flex-wrap gap-2 mt-auto pt-3 border-t border-slate-200">
                <button
                  onClick={() => {
                    setActiveUploadDocType(docId);
                    fileInputRef.current?.click();
                  }}
                  className="px-2 py-1 bg-white border border-slate-300 text-slate-700 rounded text-xs hover:bg-slate-50 transition"
                  disabled={processing}
                >
                  Upload File
                </button>
                {user?.role === 'ADMIN' && (
                  <>
                    <button
                      onClick={() => handleDocAction(docId, 'verify')}
                      className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs hover:bg-emerald-100 transition"
                      disabled={processing || status === 'VERIFIED'}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDocAction(docId, 'reject')}
                      className="px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded text-xs hover:bg-red-100 transition"
                      disabled={processing || status === 'REJECTED'}
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* AI Results */}
      {result && (
        <Section title="🤖 Latest AI Processing Result">
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="text-sm font-semibold text-blue-800 mb-1">Next Best Action</div>
              <div className="text-blue-700">{result.next_best_action}</div>
            </div>

            {result.missing_fields.length > 0 && (
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                <div className="text-sm font-semibold text-yellow-800 mb-2">Missing Fields</div>
                <div className="flex flex-wrap gap-2">
                  {result.missing_fields.map((f) => (
                    <span key={f} className="badge bg-yellow-100 text-yellow-700">{f.replace(/_/g, ' ')}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                  💬 WhatsApp Message
                </div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap">{result.whatsapp_message}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-xs font-semibold text-slate-600 mb-2">📧 Email Message</div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap">{result.email_message}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-xs font-semibold text-slate-600 mb-2">📞 Callback Note</div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap">{result.callback_note}</div>
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* New Vertical Timeline */}
      <Section title="🕐 Live Timeline">
        <div className="space-y-6 max-h-96 overflow-y-auto pr-2 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
          {timeline.length === 0 && (
            <div className="text-sm text-slate-400 py-4 text-center">No timeline events yet.</div>
          )}
          {timeline.map((evt) => (
            <div key={evt.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-blue-500 text-slate-500 group-[.is-active]:text-blue-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                ⚡
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-bold text-slate-900 text-sm">{evt.eventType}</div>
                  <time className="text-xs font-medium text-slate-500">{new Date(evt.createdAt).toLocaleTimeString()}</time>
                </div>
                <div className="text-sm text-slate-500">{evt.message}</div>
                {evt.source && <div className="text-xs text-blue-500 mt-2">Source: {evt.source}</div>}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* LLM Debug Panel */}
      <Section title="🧠 Prompt Debug Panel">
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {debugLogs.length === 0 && (
            <div className="text-sm text-slate-400 py-4 text-center">No AI debug logs recorded.</div>
          )}
          {debugLogs.map((log) => (
            <details key={log.id} className="group bg-slate-50 border border-slate-200 rounded-lg">
              <summary className="flex cursor-pointer items-center justify-between p-4 font-medium text-slate-900">
                <span>{log.agentName} <span className="text-xs text-slate-500 font-normal ml-2">{new Date(log.createdAt).toLocaleString()}</span></span>
                <span className="transition group-open:rotate-180">▼</span>
              </summary>
              <div className="px-4 pb-4 border-t border-slate-200 pt-4 flex flex-col gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">Prompt</h4>
                  <pre className="text-xs bg-slate-800 text-emerald-400 p-3 rounded overflow-x-auto whitespace-pre-wrap">{log.prompt}</pre>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">Response</h4>
                  <pre className="text-xs bg-slate-800 text-sky-400 p-3 rounded overflow-x-auto whitespace-pre-wrap">{log.response}</pre>
                </div>
              </div>
            </details>
          ))}
        </div>
      </Section>

      {/* Comms */}
      <Section title="💬 Communication Logs">
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {lead.communicationLogs.length === 0 && (
            <div className="text-sm text-slate-400 py-4 text-center">No communications yet.</div>
          )}
          {lead.communicationLogs.map((log) => (
            <div
              key={log.id}
              className={`flex gap-3 text-sm ${log.direction === 'outgoing' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`max-w-sm p-3 rounded-lg text-sm ${
                log.direction === 'outgoing'
                  ? 'bg-blue-100 text-blue-900'
                  : 'bg-slate-100 text-slate-800'
              }`}>
                <div className="text-xs font-medium mb-1 opacity-70">
                  {log.channel} · {log.direction}
                </div>
                {log.message}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* AI Explainability Panel */}
      <ExplainPanel leadId={id} />

      {/* Manual Override (Admin Only) */}
      {user?.role === 'ADMIN' && <OverridePanel leadId={id} onDone={load} />}
      
      <ChatWidget leadId={id} />
    </div>
  );
}

function ExplainPanel({ leadId }: { leadId: string }) {
  const [data, setData] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const loadExplain = async () => {
    if (data) { setOpen(!open); return; }
    try {
      const res = await api.getExplainability(leadId);
      if (res.success) { setData(res.data); setOpen(true); }
    } catch {}
  };

  return (
    <div className="card p-5">
      <button onClick={loadExplain} className="flex items-center gap-2 font-semibold text-slate-900 w-full text-left">
        <span>🧠 AI Explainability</span>
        <span className="text-xs text-blue-600 ml-auto">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && data && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-xs text-blue-600 font-medium">Score</div>
              <div className="text-lg font-bold text-blue-900">{data.currentScore}/100</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-xs text-slate-500 font-medium">Stage</div>
              <div className="text-sm font-bold text-slate-900">{data.currentStage?.replace(/_/g, ' ')}</div>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <div className="text-xs text-amber-600 font-medium">Priority</div>
              <div className="text-sm font-bold text-amber-900">{data.priority}</div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg">
              <div className="text-xs text-emerald-600 font-medium">Confidence</div>
              <div className="text-sm font-bold text-emerald-900">{data.confidence ? `${(data.confidence * 100).toFixed(0)}%` : 'N/A'}</div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="text-xs font-bold text-slate-500 uppercase mb-1">Score Reasoning</div>
            <div className="text-sm text-slate-700">{data.scoreReasoning}</div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="text-xs font-bold text-slate-500 uppercase mb-1">Stage Determination</div>
            <div className="text-sm text-slate-700">{data.stageReasoning}</div>
          </div>

          {data.missingFields?.length > 0 && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
              <div className="text-xs font-bold text-yellow-700 uppercase mb-2">Missing Fields</div>
              <div className="flex flex-wrap gap-2">
                {data.missingFields.map((f: string) => (
                  <span key={f} className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">{f.replace(/_/g, ' ')}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OverridePanel({ leadId, onDone }: { leadId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState('');
  const [score, setScore] = useState('');
  const [priority, setPriority] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOverride = async () => {
    if (!reason.trim()) return alert('Please provide a reason for the override.');
    setLoading(true);
    try {
      await api.overrideLead(leadId, {
        stage: stage || undefined,
        score: score ? parseInt(score) : undefined,
        priority: priority || undefined,
        reason
      });
      setOpen(false);
      setStage(''); setScore(''); setPriority(''); setReason('');
      await onDone();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-5 border-2 border-orange-100">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 font-semibold text-orange-800 w-full text-left">
        <span>⚡ Manual Override (Admin)</span>
        <span className="text-xs text-orange-600 ml-auto">{open ? 'Cancel' : 'Open'}</span>
      </button>
      {open && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-500 font-medium">Stage</label>
              <select value={stage} onChange={e => setStage(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm mt-1">
                <option value="">No change</option>
                {['NEW','CONTACTED','DOCUMENTS_PENDING','DOCUMENTS_SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','ONBOARDED'].map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">Score (0-100)</label>
              <input type="number" min="0" max="100" value={score} onChange={e => setScore(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm mt-1" placeholder="—" />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm mt-1">
                <option value="">No change</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium">Reason for Override *</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm mt-1" placeholder="Why are you overriding the AI decision?" />
          </div>
          <button onClick={handleOverride} disabled={loading || !reason.trim()} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition">
            {loading ? 'Applying...' : '⚡ Apply Override'}
          </button>
        </div>
      )}
    </div>
  );
}
