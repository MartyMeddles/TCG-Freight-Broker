import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loadsApi, type LoadDto } from '../services/api';
import { useLoadsHub, type LoadEvent } from '../hooks/useLoadsHub';

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const cardStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
};

export default function Decisions() {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['loads', 'Pending'],
    queryFn: () => loadsApi.getAll({ pageSize: 100, status: 'Pending' }),
  });

  const pending: LoadDto[] = data?.items ?? [];

  const mutation = useMutation({
    mutationFn: ({ ids, status }: { ids: number[]; status: string }) =>
      Promise.all(ids.map((id) => loadsApi.updateStatus(id, status))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loads'] });
      setSelected(new Set());
    },
  });

  function toggle(id: number) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  const handleLoadEvaluated = useCallback(
    (_event: LoadEvent) => { qc.invalidateQueries({ queryKey: ['loads'] }); },
    [qc],
  );
  useLoadsHub({ onLoadEvaluated: handleLoadEvaluated });

  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1F2937' }}>Decisions Queue</h1>
        <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>Review and act on loads awaiting manual decision</p>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Queue */}
        <div className="col-span-3 rounded-xl overflow-hidden" style={cardStyle}>
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: '#E5E7EB' }}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold" style={{ color: '#1F2937' }}>Pending Review</h2>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}
              >
                {pending.length}
              </span>
            </div>
            {selected.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: '#6B7280' }}>{selected.size} selected</span>
                <button
                  onClick={() => mutation.mutate({ ids: [...selected], status: 'Accepted' })}
                  disabled={mutation.isPending}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#F0FDF4', color: '#16A34A', border: '1px solid #86EFAC' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#DCFCE7')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F0FDF4')}
                >
                  ✓ Accept All
                </button>
                <button
                  onClick={() => mutation.mutate({ ids: [...selected], status: 'Rejected' })}
                  disabled={mutation.isPending}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEE2E2')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                >
                  ✗ Reject All
                </button>
              </div>
            )}
          </div>

          <div className="divide-y" style={{ borderColor: '#F3F4F6' }}>
            {isLoading && (
              <div className="px-5 py-12 text-center text-sm" style={{ color: '#9CA3AF' }}>Loading…</div>
            )}
            {!isLoading && pending.length === 0 && (
              <div className="px-5 py-12 text-center" style={{ color: '#9CA3AF' }}>
                <div className="text-2xl mb-2">✓</div>
                <div className="text-sm font-medium">Queue is clear</div>
                <div className="text-xs mt-1">No loads pending review</div>
              </div>
            )}
            {pending.map((l: LoadDto) => (
              <div
                key={l.id}
                className="flex items-center gap-3 px-5 py-4 transition-colors"
                style={{
                  backgroundColor: selected.has(l.id) ? '#EFF6FF' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!selected.has(l.id)) e.currentTarget.style.backgroundColor = '#F9FAFB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = selected.has(l.id) ? '#EFF6FF' : 'transparent';
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.has(l.id)}
                  onChange={() => toggle(l.id)}
                  className="rounded"
                  style={{ accentColor: '#1D4ED8' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold font-mono" style={{ color: '#1F2937' }}>{l.referenceNumber}</span>
                    <span className="text-sm" style={{ color: '#6B7280' }}>Lane #{l.laneId}</span>
                    {l.isAutoBooked && (
                      <span
                        className="px-1.5 py-0.5 rounded-full text-xs font-semibold"
                        style={{ backgroundColor: '#F5F3FF', color: '#7C3AED' }}
                      >
                        Auto
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs" style={{ color: '#9CA3AF' }}>
                    <span>Pickup <span className="font-mono" style={{ color: '#6B7280' }}>{shortDate(l.pickupDate)}</span></span>
                    <span>Delivery <span className="font-mono" style={{ color: '#6B7280' }}>{shortDate(l.deliveryDate)}</span></span>
                    <span>Target <span className="font-mono font-semibold" style={{ color: '#374151' }}>${Number(l.targetRate).toLocaleString()}</span></span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => mutation.mutate({ ids: [l.id], status: 'Accepted' })}
                    disabled={mutation.isPending}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
                    style={{ backgroundColor: '#F0FDF4', color: '#16A34A', border: '1px solid #86EFAC' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#DCFCE7')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F0FDF4')}
                  >
                    ✓ Accept
                  </button>
                  <button
                    onClick={() => mutation.mutate({ ids: [l.id], status: 'Rejected' })}
                    disabled={mutation.isPending}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
                    style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEE2E2')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                  >
                    ✗ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info panel */}
        <div className="col-span-2 space-y-4">
          <div className="rounded-xl p-5" style={cardStyle}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: '#1F2937' }}>How Decisions Work</h3>
            <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>
              The AI decision engine evaluates each load against configured thresholds — margin floors,
              contract minimums, GP targets, and DAT spot benchmarks — before flagging loads for
              manual review.
            </p>
            <div
              className="mt-4 pt-4 border-t space-y-2.5"
              style={{ borderColor: '#E5E7EB' }}
            >
              {[
                { label: 'Contract minimum behind', desc: 'Load is needed to meet weekly obligation' },
                { label: 'GP below floor', desc: 'Contract gross-profit under threshold' },
                { label: 'Client hold', desc: 'Auto-accept disabled for this client' },
                { label: 'Spot hold', desc: 'Too many unmet contract loads' },
              ].map((r) => (
                <div key={r.label} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: '#D97706' }} />
                  <div>
                    <div className="text-xs font-semibold" style={{ color: '#374151' }}>{r.label}</div>
                    <div className="text-xs" style={{ color: '#9CA3AF' }}>{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-5" style={cardStyle}>
            <h3 className="text-sm font-semibold mb-1" style={{ color: '#1F2937' }}>Keyboard Shortcut</h3>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              Select loads using checkboxes, then use the bulk action buttons to process multiple loads at once.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
