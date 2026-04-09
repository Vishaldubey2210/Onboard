'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { DashboardSkeleton } from '@/components/ui';
import { 
  Users, Search, CheckCircle, AlertTriangle, TrendingUp, 
  MapPin, Clock, ClipboardList, Upload, FlaskConical, XCircle,
  Activity
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [funnel, setFunnel] = useState<any>(null);
  const [cityStats, setCityStats] = useState<any[]>([]);
  const [rejectionStats, setRejectionStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, overviewRes, funnelRes, cityRes, rejectRes, auditRes] = await Promise.all([
          api.getAnalytics(),
          api.getAnalyticsOverview(),
          api.getAnalyticsFunnel(),
          api.getAnalyticsCityWise(),
          api.getAnalyticsRejectionRate(),
          api.getAuditLogs(),
        ]);
        if (statsRes.success) setStats(statsRes.data);
        if (overviewRes.success) setOverview(overviewRes.data);
        if (funnelRes.success) setFunnel(funnelRes.data);
        if (cityRes.success) setCityStats(cityRes.data);
        if (rejectRes.success) setRejectionStats(rejectRes.data);
        if (auditRes.success) setAuditLogs(auditRes.data);
      } catch (e) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const funnelSteps = funnel ? [
    { label: 'Started', count: funnel.started, color: 'bg-indigo-500' },
    { label: 'Docs Submitted', count: funnel.docs_submitted, color: 'bg-amber-500' },
    { label: 'Verified', count: funnel.verified, color: 'bg-emerald-500' },
    { label: 'Onboarded', count: funnel.onboarded, color: 'bg-green-600' },
  ] : [];

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1 text-sm">Monitor fleet onboarding performance and AI operations.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-sm">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-emerald-700 font-semibold text-xs">System Operational</span>
        </div>
      </div>

      {error && !loading && (
        <div className="card p-6 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <p className="text-amber-800 font-medium text-sm">Unable to connect to analytics server. Some data may be unavailable.</p>
          </div>
        </div>
      )}

      {/* Primary Stats */}
      {stats && overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Drivers" value={stats.totalLeads} icon={<Users className="w-5 h-5" />} color="text-indigo-600" iconBg="bg-indigo-100" />
          <StatCard label="Pending Review" value={overview.pendingVerification} icon={<Search className="w-5 h-5" />} color="text-amber-600" iconBg="bg-amber-100" />
          <StatCard label="Onboarded" value={overview.completedLeads} icon={<CheckCircle className="w-5 h-5" />} color="text-emerald-600" iconBg="bg-emerald-100" />
          <StatCard label="SLA Breaches" value={overview.escalatedCount} icon={<AlertTriangle className="w-5 h-5" />} color="text-red-600" iconBg="bg-red-100" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funnel */}
        {funnel && (
          <div className="card p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-slate-400" />
                <h2 className="font-bold text-slate-900">Onboarding Funnel</h2>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">Live</span>
            </div>
            <div className="space-y-7">
              {funnelSteps.map((step, i) => {
                const maxCount = funnelSteps[0].count || 1;
                const widthPct = Math.max(10, (step.count / maxCount) * 100);
                return (
                  <div key={step.label} className="relative">
                    <div className="flex justify-between items-center mb-2 text-sm">
                      <span className="font-semibold text-slate-700">{step.label}</span>
                      <span className="font-bold text-slate-900 tabular-nums">{step.count}</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${step.color} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${widthPct}%` }} />
                    </div>
                    {i < funnelSteps.length - 1 && funnelSteps[i].count > 0 && (
                      <div className="text-[10px] text-slate-400 font-medium mt-1.5 text-right">
                        {Math.round((funnelSteps[i + 1].count / funnelSteps[i].count) * 100)}% conversion
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rejection Profile */}
        {rejectionStats && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-6">
              <XCircle className="w-5 h-5 text-slate-400" />
              <h2 className="font-bold text-slate-900">Rejection Profile</h2>
            </div>
            <div className="space-y-5">
              <RejectionItem label="Aadhaar Issues" count={rejectionStats.aadhaarRejected} total={stats?.totalLeads} color="bg-red-400" />
              <RejectionItem label="RC Issues" count={rejectionStats.rcRejected} total={stats?.totalLeads} color="bg-orange-400" />
              <RejectionItem label="Bank Issues" count={rejectionStats.bankRejected} total={stats?.totalLeads} color="bg-amber-400" />
              <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                <div className="text-3xl font-black text-slate-900">{rejectionStats.overallRejectionRate}%</div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">Global Rejection Rate</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* City Distribution */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <MapPin className="w-5 h-5 text-slate-400" />
            <h2 className="font-bold text-slate-900">City Distribution</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="pb-3 font-semibold text-xs uppercase tracking-wider">City</th>
                  <th className="pb-3 font-semibold text-xs uppercase tracking-wider text-center">Total</th>
                  <th className="pb-3 font-semibold text-xs uppercase tracking-wider text-center">Onboarded</th>
                  <th className="pb-3 font-semibold text-xs uppercase tracking-wider text-right">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {cityStats.slice(0, 5).map(c => (
                  <tr key={c.city} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 font-semibold text-slate-800">{c.city}</td>
                    <td className="py-3 text-center text-slate-500">{c.total}</td>
                    <td className="py-3 text-center font-semibold text-emerald-600">{c.onboarded}</td>
                    <td className="py-3 text-right">
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">{c.onboardingRate}%</span>
                    </td>
                  </tr>
                ))}
                {cityStats.length === 0 && (
                  <tr><td colSpan={4} className="py-12 text-center text-slate-400 text-sm">No city data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Logs */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Clock className="w-5 h-5 text-slate-400" />
            <h2 className="font-bold text-slate-900">Recent Activity</h2>
          </div>
          <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
            {auditLogs.slice(0, 20).map(log => (
              <div key={log.id} className="flex gap-3 p-2.5 rounded-lg hover:bg-slate-50/50 transition-colors">
                <div className="shrink-0 mt-0.5">
                  <Activity className={`w-4 h-4 ${
                    log.action.includes('REJECT') ? 'text-red-400' : 
                    log.action.includes('APPROVE') || log.action.includes('VERIFY') ? 'text-emerald-400' : 'text-indigo-400'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs">
                    <span className="font-semibold text-slate-700">{log.user?.name}</span>
                    <span className="text-slate-400 mx-1">·</span>
                    <span className={`font-semibold ${
                      log.action.includes('REJECT') ? 'text-red-600' : 
                      log.action.includes('APPROVE') || log.action.includes('VERIFY') ? 'text-emerald-600' : 'text-indigo-600'
                    }`}>{log.action.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                    {log.details ? log.details.slice(0, 50) : `${log.entity} ${log.entityId?.slice(0, 8) || ''}`}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 font-mono shrink-0">
                  {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            {auditLogs.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-sm">No activity logs recorded</div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: '/leads', icon: <ClipboardList className="w-5 h-5" />, title: 'Driver Queue', desc: 'Review pending applications', color: 'bg-indigo-600' },
          { href: '/upload', icon: <Upload className="w-5 h-5" />, title: 'Bulk Import', desc: 'Upload CSV database', color: 'bg-emerald-600' },
          { href: '/simulate', icon: <FlaskConical className="w-5 h-5" />, title: 'AI Sandbox', desc: 'Test driver interactions', color: 'bg-purple-600' },
        ].map(a => (
          <Link key={a.href} href={a.href} className="card p-5 group cursor-pointer">
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 ${a.color} rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300`}>
                {a.icon}
              </div>
              <div>
                <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{a.title}</div>
                <div className="text-xs text-slate-500">{a.desc}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, iconBg }: any) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 ${iconBg} rounded-2xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <div className={`text-2xl font-black ${color} tabular-nums`}>{value ?? 0}</div>
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}

function RejectionItem({ label, count, total, color }: any) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <span className="text-xs font-bold text-slate-900 tabular-nums">{count ?? 0}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
    </div>
  );
}
