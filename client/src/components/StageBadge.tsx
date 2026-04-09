import { CheckCircle, Clock, XCircle, AlertCircle, FileText, Upload, Eye, Shield } from 'lucide-react';

const stageConfig: Record<string, { label: string; className: string }> = {
  NEW: { label: 'New', className: 'bg-slate-100 text-slate-700' },
  CONTACTED: { label: 'Contacted', className: 'bg-blue-50 text-blue-700' },
  DOCUMENTS_PENDING: { label: 'Docs Pending', className: 'bg-amber-50 text-amber-700' },
  DOCUMENTS_SUBMITTED: { label: 'Docs Submitted', className: 'bg-indigo-50 text-indigo-700' },
  UNDER_REVIEW: { label: 'Under Review', className: 'bg-purple-50 text-purple-700' },
  APPROVED: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700' },
  REJECTED: { label: 'Rejected', className: 'bg-red-50 text-red-700' },
  ONBOARDED: { label: 'Onboarded', className: 'bg-green-50 text-green-700' },
};

export function StageBadge({ stage }: { stage: string }) {
  const cfg = stageConfig[stage] || { label: stage, className: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`badge ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

const docStatusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  NOT_SUBMITTED: { label: 'Not Submitted', className: 'bg-slate-100 text-slate-600', icon: <AlertCircle className="w-3 h-3" /> },
  SUBMITTED: { label: 'Submitted', className: 'bg-amber-50 text-amber-700', icon: <Clock className="w-3 h-3" /> },
  VERIFIED: { label: 'Verified', className: 'bg-emerald-50 text-emerald-700', icon: <CheckCircle className="w-3 h-3" /> },
  REJECTED: { label: 'Rejected', className: 'bg-red-50 text-red-700', icon: <XCircle className="w-3 h-3" /> },
};

export function DocStatusBadge({ status }: { status: string }) {
  const cfg = docStatusConfig[status] || { label: status, className: 'bg-slate-100 text-slate-600', icon: null };
  return (
    <span className={`badge gap-1 ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-emerald-50 text-emerald-700' : score >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700';
  return <span className={`badge ${color} tabular-nums`}>{score}</span>;
}
