import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loadsApi, type LoadDto } from '../services/api';
import { useLoadsHub, type LoadEvent } from '../hooks/useLoadsHub';

const STATUS_PALETTE: Record<string, { bg: string; text: string; border: string }> = {
  Pending:  { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' },
  Accepted: { bg: '#F0FDF4', text: '#15803D', border: '#86EFAC' },
  Rejected: { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
  Booked:   { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
};

const REC_PALETTE: Record<string, { bg: string; text: string; border: string }> = {
  'Auto-Accept':   { bg: '#F0FDF4', text: '#15803D', border: '#86EFAC' },
  'Contract-Book': { bg: '#EDE9FE', text: '#6D28D9', border: '#C4B5FD' },
  'Review':        { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' },
};

function money(n: number | null | undefined) {
  if (n == null) return '—';
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function profit(targetRate: number, carrierCost: number) {
  return targetRate - carrierCost;
}

function margin(targetRate: number, carrierCost: number) {
  if (!targetRate) return 0;
  return (profit(targetRate, carrierCost) / targetRate) * 100;
}

function gpColor(targetRate: number, carrierCost: number): string {
  const m = margin(targetRate, carrierCost);
  if (m >= 15) return '#15803D';
  if (m >= 8)  return '#B45309';
  return '#B91C1C';
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

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold" style={{ color: '#1F2937' }}>Load Board</h1>
        <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>Review and manage all freight loads</p>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
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
                style={{ borderBottomColor: active ? '#1D4ED8' : 'transparent', color: active ? '#1D4ED8' : '#6B7280' }}
              >
                {t.label}
                <span className="rounded-full px-1.5 py-0.5 text-xs font-semibold"
                  style={{ backgroundColor: active ? '#EFF6FF' : '#F3F4F6', color: active ? '#1D4ED8' : '#9CA3AF' }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm" style={{ color: '#9CA3AF' }}>Loading…</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="w-full" style={{ minWidth: '900px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  {[
                    { label: 'Ref #',    align: 'left'   },
                    { label: 'Client',   align: 'left'   },
                    { label: 'Lane',     align: 'left'   },
                    { label: 'Carrier',  align: 'right'  },
                    { label: 'Rate',     align: 'right'  },
                    { label: 'GP $',     align: 'right'  },
                    { label: 'GP %',     align: 'right'  },
                    { label: 'AI Rec',   align: 'center' },
                    { label: 'Status',   align: 'center' },
                    { label: 'Actions',  align: 'center' },
                  ].map(({ label, align }) => (
                    <th key={label} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-${align}`}
                      style={{ color: '#6B7280' }}>
                      {label}
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
                  const gp$ = profit(l.targetRate, l.carrierCost);
                  const gp_ = margin(l.targetRate, l.carrierCost);
                  const gpCol = gpColor(l.targetRate, l.carrierCost);
                  const statusPal = STATUS_PALETTE[l.status] ?? { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB' };
                  const recPal = l.aiRecommendation ? (REC_PALETTE[l.aiRecommendation] ?? { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB' }) : null;
                  return (
                    <tr key={l.id} className="transition-colors" style={{ borderBottom: '1px solid #F3F4F6' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>

                      {/* Ref # */}
                      <td className="px-4 py-3 text-sm font-mono font-semibold" style={{ color: '#1F2937' }}>
                        {l.referenceNumber}
                      </td>

                      {/* Client */}
                      <td className="px-4 py-3 text-sm">
                        {l.clientName ? (
                          <span className="px-2 py-0.5 rounded text-xs font-bold"
                            style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                            {l.clientName.split(' ').map(w => w[0]).slice(0, 3).join('')}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: '#9CA3AF' }}>—</span>
                        )}
                      </td>

                      {/* Lane */}
                      <td className="px-4 py-3 text-sm" style={{ color: '#374151', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.laneName}
                      </td>

                      {/* Carrier Cost */}
                      <td className="px-4 py-3 text-sm font-mono text-right" style={{ color: '#6B7280' }}>
                        {money(l.carrierCost)}
                      </td>

                      {/* Target Rate */}
                      <td className="px-4 py-3 text-sm font-mono text-right" style={{ color: '#1F2937' }}>
                        {money(l.targetRate)}
                      </td>

                      {/* GP $ */}
                      <td className="px-4 py-3 text-sm font-mono font-semibold text-right" style={{ color: gpCol }}>
                        {gp$ >= 0 ? money(gp$) : `-${money(Math.abs(gp$))}`}
                      </td>

                      {/* GP % */}
                      <td className="px-4 py-3 text-sm font-mono font-semibold text-right" style={{ color: gpCol }}>
                        {gp_.toFixed(1)}%
                      </td>

                      {/* AI Rec */}
                      <td className="px-4 py-3 text-center">
                        {recPal ? (
                          <span className="px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap"
                            style={{ backgroundColor: recPal.bg, color: recPal.text, border: `1px solid ${recPal.border}` }}>
                            {l.aiRecommendation}
                          </span>
                        ) : <span style={{ color: '#9CA3AF' }}>—</span>}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: statusPal.bg, color: statusPal.text, border: `1px solid ${statusPal.border}` }}>
                          {l.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        {l.status === 'Pending' && (
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => mutation.mutate({ id: l.id, status: 'Accepted' })}
                              disabled={mutation.isPending}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
                              style={{ backgroundColor: '#F0FDF4', color: '#15803D', border: '1px solid #86EFAC' }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#DCFCE7')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F0FDF4')}>
                              ✓ Accept
                            </button>
                            <button onClick={() => mutation.mutate({ id: l.id, status: 'Rejected' })}
                              disabled={mutation.isPending}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
                              style={{ backgroundColor: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEE2E2')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}>
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
          </div>
        )}
      </div>
    </div>
  );
}


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
