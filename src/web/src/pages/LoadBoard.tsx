import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loadsApi, type LoadDto } from '../services/api';
import { useLoadsHub, type LoadEvent } from '../hooks/useLoadsHub';

const STATUS_PALETTE: Record<string, { bg: string; text: string }> = {
  Pending:  { bg: '#FEF3C7', text: '#D97706' },
  Accepted: { bg: '#F0FDF4', text: '#16A34A' },
  Rejected: { bg: '#FEF2F2', text: '#DC2626' },
  Booked:   { bg: '#EFF6FF', text: '#2563EB' },
};

function money(n: number | null | undefined) {
  if (n == null) return '—';
  return `$${Number(n).toLocaleString()}`;
}

function gp(targetRate: number, carrierCost: number): string {
  if (!targetRate || !carrierCost) return '—';
  const profit = targetRate - carrierCost;
  const margin = (profit / targetRate) * 100;
  return `$${profit.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${margin.toFixed(1)}%)`;
}

function gpColor(targetRate: number, carrierCost: number): string {
  if (!targetRate || !carrierCost) return '#6B7280';
  const margin = (targetRate - carrierCost) / targetRate * 100;
  if (margin >= 15) return '#16A34A';
  if (margin >= 8) return '#D97706';
  return '#DC2626';
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function LoadBoard() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['loads', statusFilter],
    queryFn: () =>
      loadsApi.getAll({ pageSize: 100, status: statusFilter === 'all' ? undefined : statusFilter }),
  });

  const loads = data?.items ?? [];

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      loadsApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loads'] }),
  });

  const handleLoadEvaluated = useCallback(
    (_event: LoadEvent) => { qc.invalidateQueries({ queryKey: ['loads'] }); },
    [qc],
  );
  useLoadsHub({ onLoadEvaluated: handleLoadEvaluated });

  const tabs = [
    { key: 'all',      label: 'All' },
    { key: 'Pending',  label: 'Pending' },
    { key: 'Accepted', label: 'Accepted' },
    { key: 'Rejected', label: 'Rejected' },
    { key: 'Booked',   label: 'Booked' },
  ];

  const cardStyle = {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  };

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold" style={{ color: '#1F2937' }}>Load Board</h1>
        <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>Review and manage all freight loads</p>
      </div>

      <div className="rounded-xl overflow-hidden" style={cardStyle}>
        {/* Filter tabs */}
        <div className="flex items-center border-b px-4 pt-1" style={{ borderColor: '#E5E7EB' }}>
          {tabs.map((t) => {
            const active = statusFilter === t.key;
            const count = t.key === 'all'
              ? (data?.totalCount ?? 0)
              : loads.filter((l: LoadDto) => l.status === t.key).length;
            return (
              <button
                key={t.key}
                onClick={() => setStatusFilter(t.key)}
                className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors"
                style={{
                  borderBottomColor: active ? '#1D4ED8' : 'transparent',
                  color: active ? '#1D4ED8' : '#6B7280',
                }}
              >
                {t.label}
                <span
                  className="rounded-full px-1.5 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: active ? '#EFF6FF' : '#F3F4F6',
                    color: active ? '#1D4ED8' : '#9CA3AF',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm" style={{ color: '#9CA3AF' }}>Loading…</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                {['Ref #', 'Lane', 'Pickup', 'Delivery', 'Carrier Cost', 'Target Rate', 'Gross Profit', 'Source', 'Status', 'Actions'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${
                      i >= 4 && i <= 6 ? 'text-right' : i === 7 || i === 8 || i === 9 ? 'text-center' : 'text-left'
                    }`}
                    style={{ color: '#6B7280' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loads.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm" style={{ color: '#9CA3AF' }}>
                    No loads found
                  </td>
                </tr>
              )}
              {loads.map((l: LoadDto) => {
                const palette = STATUS_PALETTE[l.status] ?? { bg: '#F3F4F6', text: '#6B7280' };
                return (
                  <tr
                    key={l.id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid #F3F4F6' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td className="px-4 py-3 text-sm font-mono font-medium" style={{ color: '#1F2937' }}>{l.referenceNumber}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#374151' }}>Lane #{l.laneId}</td>
                    <td className="px-4 py-3 text-sm font-mono text-right" style={{ color: '#6B7280' }}>{shortDate(l.pickupDate)}</td>
                    <td className="px-4 py-3 text-sm font-mono text-right" style={{ color: '#6B7280' }}>{shortDate(l.deliveryDate)}</td>
                    <td className="px-4 py-3 text-sm font-mono text-right" style={{ color: '#6B7280' }}>{money(l.carrierCost)}</td>
                    <td className="px-4 py-3 text-sm font-mono text-right" style={{ color: '#1F2937' }}>{money(l.targetRate)}</td>
                    <td className="px-4 py-3 text-sm font-mono text-right font-semibold" style={{ color: gpColor(l.targetRate, l.carrierCost) }}>{gp(l.targetRate, l.carrierCost)}</td>
                    <td className="px-4 py-3 text-center">
                      {l.isAutoBooked ? (
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}
                        >
                          Auto
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: '#9CA3AF' }}>Manual</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ backgroundColor: palette.bg, color: palette.text }}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {l.status === 'Pending' && (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => mutation.mutate({ id: l.id, status: 'Accepted' })}
                            disabled={mutation.isPending}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
                            style={{ backgroundColor: '#F0FDF4', color: '#16A34A', border: '1px solid #86EFAC' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#DCFCE7')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F0FDF4')}
                          >
                            ✓ Accept
                          </button>
                          <button
                            onClick={() => mutation.mutate({ id: l.id, status: 'Rejected' })}
                            disabled={mutation.isPending}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
                            style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEE2E2')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                          >
                            ✗ Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
