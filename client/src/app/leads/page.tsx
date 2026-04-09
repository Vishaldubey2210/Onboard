import { Suspense } from 'react';
import LeadsTable from './LeadsTable';

export default function LeadsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Driver Applications</h1>
        <p className="text-slate-500 mt-1">Manage and verify fleet onboarding requests</p>
      </div>
      <Suspense fallback={<div className="card p-8 text-center text-slate-400">Loading leads...</div>}>
        <LeadsTable />
      </Suspense>
    </div>
  );
}
