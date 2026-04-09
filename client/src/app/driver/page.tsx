'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { DocStatusBadge } from '@/components/StageBadge';
import ChatWidget from '@/components/ChatWidget';
import { showToast } from '@/components/ui';
import { DocPreview } from '@/components/DocPreview';
import { 
  FileText, Upload, Eye, RefreshCw, CheckCircle, Clock, AlertCircle, 
  XCircle, Target, Smartphone, PartyPopper, AlertTriangle, Shield, User
} from 'lucide-react';

const STAGE_STEPS = [
  { key: 'NEW', label: 'Registered', icon: <FileText className="w-4 h-4" /> },
  { key: 'DOCUMENTS_PENDING', label: 'Docs Pending', icon: <Clock className="w-4 h-4" /> },
  { key: 'DOCUMENTS_SUBMITTED', label: 'Submitted', icon: <Upload className="w-4 h-4" /> },
  { key: 'UNDER_REVIEW', label: 'Review', icon: <Eye className="w-4 h-4" /> },
  { key: 'APPROVED', label: 'Approved', icon: <Shield className="w-4 h-4" /> },
  { key: 'ONBOARDED', label: 'Onboarded', icon: <CheckCircle className="w-4 h-4" /> },
];

function getStageIndex(stage: string) {
  const idx = STAGE_STEPS.findIndex(s => s.key === stage);
  return idx >= 0 ? idx : 0;
}

export default function DriverDashboardPage() {
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeDocType, setActiveDocType] = useState('');

  // Profile Form State
  const [savingProfile, setSavingProfile] = useState(false);
  const [city, setCity] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleCount, setVehicleCount] = useState<number | ''>('');

  const load = async () => {
    try {
      const res = await api.getDriverLead();
      if (res.success) {
        setLead(res.lead);
        if (!city && res.lead.city) setCity(res.lead.city);
        if (!vehicleType && res.lead.vehicleType) setVehicleType(res.lead.vehicleType);
        if (!vehicleCount && res.lead.vehicleCount) setVehicleCount(res.lead.vehicleCount);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeDocType || !lead) return;
    setUploading(true);
    try {
      await api.uploadDocument(lead.id, activeDocType, file);
      showToast('Document uploaded successfully!', 'success');
      await load();
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setUploading(false);
      setActiveDocType('');
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.updateDriverProfile({ city, vehicleType, vehicleCount: Number(vehicleCount) });
      showToast('Profile updated!', 'success');
      await load();
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="skeleton h-8 w-48" />
      <div className="skeleton h-4 w-72" />
      <div className="card p-8"><div className="skeleton h-20 w-full" /></div>
      <div className="card p-6"><div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="skeleton h-32" />)}</div></div>
    </div>
  );

  if (error) return (
    <div className="max-w-3xl mx-auto card p-8 text-center">
      <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
      <p className="text-red-600 font-medium">Error: {error}</p>
    </div>
  );

  if (!lead) return (
    <div className="max-w-3xl mx-auto card p-8 text-center">
      <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
      <p className="text-slate-500">No onboarding record found. Please contact support.</p>
    </div>
  );

  const currentIdx = getStageIndex(lead.currentStage);
  const docsConfig = [
    { id: 'aadhaar', label: 'Aadhaar Card', desc: 'Government ID proof', status: lead.aadhaarStatus, url: lead.aadhaarUrl, reason: lead.aadhaarRejectReason },
    { id: 'bank', label: 'Bank Details', desc: 'Bank account passbook', status: lead.bankStatus, url: lead.bankUrl, reason: lead.bankRejectReason },
    { id: 'rc', label: 'Vehicle RC', desc: 'Registration certificate', status: lead.rcStatus, url: lead.rcUrl, reason: lead.rcRejectReason },
  ];

  const profileIncomplete = !lead.city || !lead.vehicleType || !lead.vehicleCount;

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in-up">
      <input type="file" accept="image/*,.pdf" className="hidden" ref={fileRef} onChange={handleFileUpload} />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Onboarding</h1>
        <p className="text-slate-500 mt-1 text-sm">Welcome, <span className="font-semibold text-slate-700">{lead.name}</span>. Track your onboarding progress below.</p>
        
        {profileIncomplete && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium animate-pulse">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            ⚠️ Please complete your vehicle profile below to continue onboarding.
          </div>
        )}
      </div>

      {/* Journey Progress */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Target className="w-5 h-5 text-indigo-500" />
          <h2 className="font-bold text-slate-900">Your Journey</h2>
        </div>
        <div className="flex items-center justify-between relative">
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200 z-0" />
          <div className="absolute top-5 left-0 h-0.5 bg-indigo-500 z-0 transition-all duration-700" style={{ width: `${(currentIdx / (STAGE_STEPS.length - 1)) * 100}%` }} />
          {STAGE_STEPS.map((step, i) => (
            <div key={step.key} className="relative flex flex-col items-center z-10" style={{ width: `${100 / STAGE_STEPS.length}%` }}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                i <= currentIdx
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}>
                {i < currentIdx ? <CheckCircle className="w-5 h-5" /> : step.icon}
              </div>
              <span className={`text-[10px] mt-2 text-center font-semibold ${
                i <= currentIdx ? 'text-indigo-700' : 'text-slate-400'
              }`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Complete Profile Form */}
      {profileIncomplete && (
        <div className="card p-6 border-l-4 border-l-red-500 shadow-sm transition-all duration-300">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-slate-800" />
            <h2 className="font-bold text-slate-900">Complete Application Profile</h2>
          </div>
          <form onSubmit={handleProfileSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label text-xs mb-1">City</label>
              <input type="text" required value={city} onChange={(e) => setCity(e.target.value)}
                className="input focus:ring-1 focus:ring-indigo-500 h-10 w-full" placeholder="e.g. Mumbai" />
            </div>
            <div>
              <label className="label text-xs mb-1">Vehicle Type</label>
              <select required value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}
                className="input focus:ring-1 focus:ring-indigo-500 h-10 w-full">
                <option value="">Select type</option>
                <option value="TWO_WHEELER">Two Wheeler</option>
                <option value="THREE_WHEELER">Three Wheeler</option>
                <option value="FOUR_WHEELER">Four Wheeler</option>
                <option value="HEAVY_VEHICLE">Heavy Vehicle</option>
              </select>
            </div>
            <div>
              <label className="label text-xs mb-1">Vehicle Count</label>
              <input type="number" required min="1" value={vehicleCount} onChange={(e) => setVehicleCount(e.target.value === '' ? '' : Number(e.target.value))}
                className="input focus:ring-1 focus:ring-indigo-500 h-10 w-full" placeholder="e.g. 1" />
            </div>
            <div className="md:col-span-3 flex justify-end mt-2">
              <button type="submit" disabled={savingProfile} className="btn-primary w-full md:w-auto h-10 px-6">
                {savingProfile ? 'Saving...' : 'Save Profile Details'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Documents */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <FileText className="w-5 h-5 text-indigo-500" />
          <h2 className="font-bold text-slate-900">Your Documents</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {docsConfig.map(doc => (
            <div key={doc.id} className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col gap-3 hover:border-slate-300 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{doc.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{doc.desc}</div>
                </div>
                <DocStatusBadge status={doc.status} />
              </div>

              {/* Document Preview */}
              {doc.url && <DocPreview url={doc.url} label={doc.label} />}

              {doc.status === 'REJECTED' && doc.reason && (
                <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
                  <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span><span className="font-semibold">Rejected:</span> {doc.reason}</span>
                </div>
              )}

              {(doc.status === 'NOT_SUBMITTED' || doc.status === 'REJECTED') && (
                <button
                  onClick={() => { setActiveDocType(doc.id); fileRef.current?.click(); }}
                  disabled={uploading}
                  className="mt-auto btn-primary text-xs h-9"
                >
                  {uploading && activeDocType === doc.id ? (
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading...</span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      {doc.status === 'REJECTED' ? <RefreshCw className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
                      {doc.status === 'REJECTED' ? 'Re-upload' : 'Upload'}
                    </span>
                  )}
                </button>
              )}

              {doc.status === 'SUBMITTED' && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                  <Clock className="w-3 h-3" />
                  Awaiting review...
                </div>
              )}

              {doc.status === 'VERIFIED' && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 p-2 rounded-lg">
                  <CheckCircle className="w-3 h-3" />
                  Verified
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Next Steps */}
      <div className="card p-6 border border-indigo-100 bg-indigo-50/30">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-indigo-500" />
          <h2 className="font-bold text-slate-900">What's Next? (AI Suggested)</h2>
        </div>
        <div className="p-4 bg-white rounded-xl border border-indigo-100 shadow-sm flex items-start flex-col gap-3">
          <span className="text-sm font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md mb-2">Priority Action</span>
          <p className="text-slate-700 font-medium whitespace-pre-wrap">{lead.nextAction || 'Complete your onboarding steps above.'}</p>
        </div>
      </div>

      {/* Timeline */}
      {lead.timelines && lead.timelines.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-indigo-500" />
            <h2 className="font-bold text-slate-900">Activity Log</h2>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto pr-2">
            {lead.timelines.map((evt: any) => (
              <div key={evt.id} className="flex gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-1 bg-indigo-200 rounded-full shrink-0" />
                <div>
                  <div className="font-semibold text-slate-900 text-xs">{evt.eventType.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{evt.message}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{new Date(evt.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ChatWidget leadId={lead.id} />
    </div>
  );
}

function NextStep({ icon, text }: { icon: React.ReactNode; text: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg">
      {icon}
      <span>{text}</span>
    </li>
  );
}
