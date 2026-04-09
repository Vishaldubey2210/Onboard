'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

type Channel = 'WHATSAPP' | 'EMAIL' | 'CALL' | 'API';

const CHANNEL_CONFIG: Record<Channel, {
  icon: string;
  label: string;
  placeholder: string;
  multiline: boolean;
}> = {
  WHATSAPP: {
    icon: '💬',
    label: 'WhatsApp',
    placeholder: 'Hi, my name is Rajesh Kumar. I want to register my auto rickshaw. Phone: 9876543210. I have submitted my Aadhaar.',
    multiline: false,
  },
  EMAIL: {
    icon: '📧',
    label: 'Email',
    placeholder: 'Dear Support Team,\n\nMy name is Priya Sharma (9765432108). I would like to onboard my two-wheeler. I have uploaded my RC document and bank details. Please update my status.\n\nRegards,\nPriya',
    multiline: true,
  },
  CALL: {
    icon: '📞',
    label: 'Call Transcript',
    placeholder: 'Agent: Hello, this is OnboardAI support.\nDriver: Hi, my name is Vikram Singh. My phone is 9654321087.\nAgent: How can I help you?\nDriver: I want to check my onboarding status. I submitted all documents last week.\nAgent: Let me check. You have 3 vehicles correct?\nDriver: Yes, four wheelers.',
    multiline: true,
  },
  API: {
    icon: '🔌',
    label: 'API / JSON',
    placeholder: '{\n  "name": "Suresh Patel",\n  "phone": "9543210976",\n  "city": "Ahmedabad",\n  "vehicle_type": "THREE_WHEELER",\n  "vehicle_count": 2,\n  "aadhaar_status": "SUBMITTED",\n  "bank_status": "SUBMITTED"\n}',
    multiline: true,
  },
};

interface EventResult {
  eventId: string;
  leadId: string;
}

interface ProcessResult {
  score: number;
  stage: string;
  missing_fields: string[];
  next_best_action: string;
  whatsapp_message: string;
  email_message: string;
  callback_note: string;
}

export default function SimulatePage() {
  const [channel, setChannel] = useState<Channel>('WHATSAPP');
  const [identifier, setIdentifier] = useState('');
  const [input, setInput] = useState('');
  const [eventResult, setEventResult] = useState<EventResult | null>(null);
  const [processResult, setProcessResult] = useState<ProcessResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [conflictDetected, setConflictDetected] = useState(false);
  const [step, setStep] = useState<'idle' | 'event' | 'processing' | 'done'>('idle');

  const cfg = CHANNEL_CONFIG[channel];

  const handleSubmit = async (forceMergeOverride = false) => {
    let finalPhone = undefined;
    let finalEmail = undefined;

    // Unified Identifier Extraction
    const val = identifier.trim();
    if (!val && channel !== 'API') {
      setError(`Driver identification (Phone or Email) is required to target the correct Lead in the database.`);
      return;
    }

    if (val) {
      if (val.includes('@')) {
        finalEmail = val;
      } else {
        finalPhone = val;
      }
    }

    // Validate and Parse based on Channel
    if (channel === 'API') {
      try {
        const parsed = JSON.parse(input);
        if (!finalPhone && parsed.phone) finalPhone = parsed.phone;
        if (!finalEmail && parsed.email) finalEmail = parsed.email;
        if (!finalPhone && !finalEmail) throw new Error('You must provide an Identifier above, or include "phone" or "email" in JSON.');
      } catch (e) {
        setError('API/JSON error: ' + (e as Error).message);
        return;
      }
    }

    if (!input.trim()) {
      setError('Interaction content is required.');
      return;
    }
    
    setError('');
    setConflictDetected(false);
    setEventResult(null);
    setProcessResult(null);
    setLoading(true);
    setStep('event');

    try {
      const evtRes = await api.postEvent({
        phone: finalPhone,
        email: finalEmail,
        source: channel,
        rawInput: input.trim(),
        forceMerge: forceMergeOverride,
      });
      setEventResult(evtRes);
      setStep('processing');

      const procRes = await api.processLead(evtRes.leadId, input.trim(), channel);
      setProcessResult(procRes.result);
      setStep('done');
    } catch (e: any) {
      if (e.code === 'IDENTITY_CONFLICT') {
        setConflictDetected(true);
      }
      setError(e.message);
      setStep('idle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-end border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fleet Interaction Sandbox</h1>
          <p className="text-slate-500 mt-1">Simulate driver communications to test AI interpretation and automation workflows.</p>
        </div>
        <div className="bg-blue-50 px-3 py-1.5 rounded-lg text-blue-700 text-xs font-bold uppercase tracking-wider">
          Testing Mode
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left Column: Input */}
        <div className="lg:col-span-3 space-y-6">
          <section className="card p-6">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">1. Select Channel</h2>
            <div className="grid grid-cols-4 gap-3">
              {(Object.keys(CHANNEL_CONFIG) as Channel[]).map((ch) => (
                <button
                  key={ch}
                  onClick={() => { setChannel(ch); setInput(''); setStep('idle'); setEventResult(null); setProcessResult(null); }}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    channel === ch
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-slate-100 hover:border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="text-2xl mb-1">{CHANNEL_CONFIG[ch].icon}</div>
                  <div className="text-[10px] font-black uppercase tracking-tighter">{CHANNEL_CONFIG[ch].label}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="card p-6 space-y-5">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">2. Interaction Details</h2>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Lead Identifier (Phone / Email)</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Ex: 9876543210 or driver@email.com"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              />
              <p className="text-[10px] text-slate-400 mt-1.5 italic">
                <strong>Testing Notice:</strong> Regardless of channel, provide the phone/email to explicitly target and update that Lead's database record. Drivers will be auto-created if they don't exist.
              </p>
            </div>

            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="block text-xs font-bold text-slate-500 uppercase">{cfg.label} Content</label>
                <button
                  type="button"
                  onClick={() => setInput(cfg.placeholder)}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider"
                >
                  Load Template
                </button>
              </div>
              {cfg.multiline ? (
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={cfg.placeholder}
                  rows={6}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono transition-all"
                />
              ) : (
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={cfg.placeholder}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all"
                />
              )}
            </div>

            {error && !conflictDetected && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg font-medium">
                ⚠️ {error}
              </div>
            )}

            {conflictDetected && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl animate-in fade-in zoom-in duration-300 shadow-sm border-l-4 border-l-orange-500">
                <h3 className="text-orange-800 font-bold text-sm mb-1">⚠️ Identity Conflict Detected</h3>
                <p className="text-orange-700 text-xs mb-3">
                  The provided phone number and email address correspond to entirely different leads in the system. Proceeding will force a manual merge of these identities.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleSubmit(true)}
                    className="flex-1 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition-all"
                  >
                    Force Import / Merge Data
                  </button>
                  <button
                    onClick={() => { setConflictDetected(false); setError(''); }}
                    className="flex-1 px-3 py-2 bg-white border border-orange-200 text-orange-700 hover:bg-orange-50 text-xs font-bold rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!conflictDetected && (
              <button
                onClick={() => handleSubmit(false)}
                disabled={loading}
                className="w-full h-12 bg-slate-900 hover:bg-black text-white font-bold rounded-xl transition-all shadow-lg shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Processing Interaction...
                  </span>
                ) : (
                  <>🚀 Run Simulation</>
                )}
              </button>
            )}
          </section>
        </div>

        {/* Right Column: Flow & Results */}
        <div className="lg:col-span-2 space-y-6">
          <section className="card p-6 min-h-[300px]">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Interaction Flow</h2>
            <div className="space-y-6 relative">
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-100"></div>
              {[
                { id: 'event', label: 'Ingest Event', desc: 'Interaction logged in timeline', done: ['processing', 'done'].includes(step) },
                { id: 'understand', label: 'AI Interpretation', desc: 'Understanding driver intent', done: step === 'done' },
                { id: 'logic', label: 'Agent Logic', desc: 'Calculating next best action', done: step === 'done' },
                { id: 'sync', label: 'Record Sync', desc: 'Updating application states', done: step === 'done' },
              ].map(({ id, label, desc, done }, i) => (
                <div key={id} className="relative flex gap-4">
                  <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center z-10 border-2 transition-all ${
                    done ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100' : 'bg-white border-slate-200 text-slate-400'
                  }`}>
                    {done ? <span className="text-[10px]">✓</span> : <span className="text-[10px]">{i + 1}</span>}
                  </div>
                  <div>
                    <div className={`text-xs font-bold uppercase tracking-tight ${done ? 'text-slate-900' : 'text-slate-400'}`}>{label}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {step === 'done' && processResult && (
              <div className="mt-8 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Resulting State</span>
                    <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full">Score: {processResult.score}</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 mb-1">{processResult.stage.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-slate-600 line-clamp-2">{processResult.next_best_action}</div>
                </div>
                
                {eventResult && (
                  <a
                    href={`/leads/${eventResult.leadId}`}
                    className="mt-4 w-full h-10 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl flex items-center justify-center hover:bg-slate-50 transition-all"
                  >
                    View Driver Application →
                  </a>
                )}
              </div>
            )}
          </section>

          {/* Voice Integration Preview */}
          <div className="card p-6 bg-gradient-to-br from-purple-600 to-indigo-700 text-white border-0 shadow-lg shadow-purple-100">
            <h2 className="text-xs font-black uppercase tracking-widest opacity-80 mb-4">Voice AI Studio</h2>
            <div className="space-y-3">
              <div className="p-3 bg-white/10 rounded-xl border border-white/10">
                <p className="text-[11px] leading-relaxed opacity-90 italic">
                  "Hi, mera naam Rahul hai. Menu taxi register karni hai. documents upload kar diye hain."
                </p>
              </div>
              <p className="text-[10px] opacity-70">
                AI extracts intent, name, and document status automatically from call transcripts to update driver profiles.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
