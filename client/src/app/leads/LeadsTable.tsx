'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api, Lead } from '@/lib/api';
import { StageBadge, ScoreBadge } from '@/components/StageBadge';

const STAGES = [
  '', 'NEW', 'CONTACTED', 'DOCUMENTS_PENDING', 'DOCUMENTS_SUBMITTED',
  'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ONBOARDED',
];

export default function LeadsTable() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [city, setCity] = useState('');
  const [minScore, setMinScore] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getLeads({ 
        page, limit: 15, stage: stage || undefined, search: search || undefined, city: city || undefined, minScore: minScore !== '' ? minScore : undefined 
      });
      setLeads(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, stage, search, city, minScore]);

  useEffect(() => {
    const t = setTimeout(fetchLeads, 300);
    return () => clearTimeout(t);
  }, [fetchLeads]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search name, phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-48 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Filter by city..."
          value={city}
          onChange={(e) => { setCity(e.target.value); setPage(1); }}
          className="w-32 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="number"
          placeholder="Min score (0-100)"
          value={minScore}
          min={0}
          max={100}
          onChange={(e) => { setMinScore(e.target.value ? parseInt(e.target.value) : ''); setPage(1); }}
          className="w-36 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={stage}
          onChange={(e) => { setStage(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>{s || 'All Stages'}</option>
          ))}
        </select>
        <span className="self-center text-sm text-slate-500">{total} total</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">City</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Vehicle</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Stage</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Score</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Channel</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={8} className="text-center py-8 text-slate-400">Loading...</td></tr>
              )}
              {!loading && leads.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-slate-400">No leads found</td></tr>
              )}
              {!loading && leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{lead.name}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">{lead.phone}</td>
                  <td className="px-4 py-3 text-slate-600">{lead.city ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {lead.vehicleType?.replace(/_/g, ' ') ?? '—'}
                    {lead.vehicleCount ? ` (${lead.vehicleCount})` : ''}
                  </td>
                  <td className="px-4 py-3"><StageBadge stage={lead.currentStage} /></td>
                  <td className="px-4 py-3"><ScoreBadge score={lead.leadScore} /></td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-500">{lead.preferredChannel}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary text-xs"
            >
              ← Prev
            </button>
            <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary text-xs"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
