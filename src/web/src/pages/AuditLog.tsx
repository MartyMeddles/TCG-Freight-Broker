import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi, type AuditLogDto } from '../services/api';

const cardStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
};

const ACTION_LABELS: Record<string, { label: string; bg: string; color: string; border: string }> = {
  LOAD_ACCEPT:  { label: 'Accept',       bg: '#F0FDF4', color: '#16A34A', border: '#86EFAC' },
  LOAD_REJECT:  { label: 'Reject',       bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  LOAD_STATUS:  { label: 'Status',       bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
};

function ActionBadge({ action }: { action: string }) {
  const s = ACTION_LABELS[action] ?? { label: action, bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' };
  return (
    <span className="px-2 py-0.5 rounded text-xs font-bold font-mono"
      style={{ backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

export default function AuditLog() {
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const PAGE_SIZE = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['auditlogs', page, filterAction, filterUser],
    queryFn: () => auditApi.getAll({
      page,
      pageSize: PAGE_SIZE,
      action: filterAction || undefined,
      username: filterUser || undefined,
    }),
  });

  const items: AuditLogDto[] = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1F2937' }}>Audit Log</h1>
        <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>All manual accept/reject decisions with user attribution</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
          className="text-sm rounded-lg px-3 py-2"
          style={{ border: '1px solid #D1D5DB', color: '#374151', backgroundColor: '#FFFFFF' }}
        >
          <option value="">All Actions</option>
          <option value="LOAD_ACCEPT">Accept</option>
          <option value="LOAD_REJECT">Reject</option>
          <option value="LOAD_STATUS">Status Change</option>
        </select>
        <input
          type="text"
          placeholder="Filter by user…"
          value={filterUser}
          onChange={(e) => { setFilterUser(e.target.value); setPage(1); }}
          className="text-sm rounded-lg px-3 py-2 w-48"
          style={{ border: '1px solid #D1D5DB', color: '#374151', backgroundColor: '#FFFFFF' }}
        />
        {(filterAction || filterUser) && (
          <button
            onClick={() => { setFilterAction(''); setFilterUser(''); setPage(1); }}
            className="text-xs px-3 py-2 rounded-lg"
            style={{ border: '1px solid #D1D5DB', color: '#6B7280', backgroundColor: '#F9FAFB' }}
          >
            Clear
          </button>
        )}
        {data && (
          <span className="text-xs ml-auto" style={{ color: '#9CA3AF' }}>
            {data.totalCount.toLocaleString()} total entries
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={cardStyle}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
              <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#6B7280' }}>Time</th>
              <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#6B7280' }}>Action</th>
              <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#6B7280' }}>User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#6B7280' }}>Load</th>
              <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#6B7280' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm" style={{ color: '#9CA3AF' }}>Loading…</td>
              </tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center" style={{ color: '#9CA3AF' }}>
                  <div className="text-2xl mb-2">📋</div>
                  <div className="text-sm font-medium">No audit entries yet</div>
                  <div className="text-xs mt-1">Actions will appear here when loads are accepted or rejected</div>
                </td>
              </tr>
            )}
            {items.map((a, i) => (
              <tr
                key={a.id}
                style={{ borderBottom: i < items.length - 1 ? '1px solid #F3F4F6' : undefined }}
              >
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap" style={{ color: '#6B7280' }}>
                  {fmtTime(a.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <ActionBadge action={a.action} />
                </td>
                <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: '#374151' }}>
                  {a.username}
                </td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: '#6B7280' }}>
                  {a.entityId ? `#${a.entityId}` : '—'}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: '#6B7280', maxWidth: 320 }}>
                  <span className="truncate block overflow-hidden" title={a.details ?? ''}>
                    {a.details ?? '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-40"
            style={{ border: '1px solid #D1D5DB', backgroundColor: '#FFFFFF', color: '#374151' }}
          >
            ← Prev
          </button>
          <span className="text-xs" style={{ color: '#6B7280' }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-40"
            style={{ border: '1px solid #D1D5DB', backgroundColor: '#FFFFFF', color: '#374151' }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
