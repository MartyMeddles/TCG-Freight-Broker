import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loadsApi, type LoadDto } from '../services/api';
import { useLoadsHub, type LoadEvent } from '../hooks/useLoadsHub';

const CONFIRM_SECS = 20;

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtMoney(n: number) {
  return '$' + Math.abs(Math.round(n)).toLocaleString();
}

const cardStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
};

interface SingleConfirm {
  kind: 'single';
  id: number;
  action: 'accept' | 'reject';
  secs: number;
}
interface BatchConfirm {
  kind: 'batch';
  action: 'accept' | 'reject';
  ids: number[];
}
type ConfirmState = SingleConfirm | BatchConfirm | null;

// SVG countdown ring (64×64)
function CountdownRing({ secs, total, isAccept }: { secs: number; total: number; isAccept: boolean }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const col = isAccept ? '#4ade80' : '#f87171';
  return (
    <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
      <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="32" cy="32" r={r} fill="none" stroke="#1e293b" strokeWidth="6" />
        <circle
          cx="32" cy="32" r={r} fill="none" stroke={col} strokeWidth="6"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - secs / total)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.9s linear' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 16, fontWeight: 900, color: col, fontFamily: 'monospace',
      }}>
        {secs}
      </div>
    </div>
  );
}

// Mini ring for inline row use
function MiniRing({ secs, total, isAccept }: { secs: number; total: number; isAccept: boolean }) {
  const r = 8;
  const circ = 2 * Math.PI * r;
  const col = isAccept ? '#4ade80' : '#f87171';
  return (
    <div style={{ position: 'relative', width: 22, height: 22, flexShrink: 0 }}>
      <svg width="22" height="22" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="11" cy="11" r={r} fill="none" stroke="#1e293b" strokeWidth="3" />
        <circle
          cx="11" cy="11" r={r} fill="none" stroke={col} strokeWidth="3"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - secs / total)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.9s linear' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 7, fontWeight: 800, color: col, fontFamily: 'monospace',
      }}>
        {secs}s
      </div>
    </div>
  );
}

export default function Decisions() {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  // Store confirm in a ref so the interval callback always sees the latest value
  const confirmRef = useRef<ConfirmState>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qc = useQueryClient();

  // Keep ref in sync with state
  useEffect(() => { confirmRef.current = confirm; }, [confirm]);

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

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function startSingleConfirm(id: number, action: 'accept' | 'reject') {
    stopTimer();
    const initial: SingleConfirm = { kind: 'single', id, action, secs: CONFIRM_SECS };
    confirmRef.current = initial;
    setConfirm(initial);
    timerRef.current = setInterval(() => {
      const cur = confirmRef.current;
      if (cur?.kind !== 'single') { stopTimer(); return; }
      const next = cur.secs - 1;
      if (next <= 0) { stopTimer(); confirmRef.current = null; setConfirm(null); return; }
      const updated: SingleConfirm = { ...cur, secs: next };
      confirmRef.current = updated;
      setConfirm(updated);
    }, 1000);
  }

  function startBatchConfirm(action: 'accept' | 'reject') {
    const ids = [...selected];
    if (!ids.length) return;
    stopTimer();
    setConfirm({ kind: 'batch', action, ids });
  }

  function cancelConfirm() {
    stopTimer();
    confirmRef.current = null;
    setConfirm(null);
  }

  function executeConfirm() {
    const cur = confirm;
    if (!cur) return;
    const status = cur.action === 'accept' ? 'Accepted' : 'Rejected';
    const ids = cur.kind === 'single' ? [cur.id] : cur.ids;
    cancelConfirm();
    mutation.mutate({ ids, status });
  }

  // Cleanup on unmount
  useEffect(() => () => stopTimer(), []);

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

  // Confirm bar content
  const confirmLoad = confirm?.kind === 'single' ? pending.find((l) => l.id === confirm.id) : null;
  const isAccept = confirm?.action === 'accept';
  const accentCol = isAccept ? '#4ade80' : '#f87171';
  const barBg = isAccept ? '#052e16' : '#2d0a0a';
  const barBorder = isAccept ? '#166534' : '#7f1d1d';

  // GP estimate for batch bar
  const batchGP = confirm?.kind === 'batch'
    ? confirm.ids.reduce((sum, id) => {
        const l = pending.find((x) => x.id === id);
        return sum + (l ? l.targetRate - l.carrierCost : 0);
      }, 0)
    : 0;

  return (
    <>
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
                    onClick={() => startBatchConfirm('accept')}
                    disabled={mutation.isPending}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
                    style={{ backgroundColor: '#F0FDF4', color: '#16A34A', border: '1px solid #86EFAC' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#DCFCE7')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F0FDF4')}
                  >
                    ✓ Accept All
                  </button>
                  <button
                    onClick={() => startBatchConfirm('reject')}
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
              {pending.map((l: LoadDto) => {
                const isSinglePending = confirm?.kind === 'single' && confirm.id === l.id;
                const rowIsAccept = isSinglePending && confirm.action === 'accept';
                const rowAccentCol = rowIsAccept ? '#4ade80' : '#f87171';
                return (
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

                    {/* Per-row action area */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSinglePending ? (
                        // Inline confirm state: mini ring + OK + Cancel
                        <>
                          <MiniRing secs={confirm.secs} total={CONFIRM_SECS} isAccept={rowIsAccept} />
                          <button
                            onClick={executeConfirm}
                            className="px-2 py-1 rounded text-xs font-bold"
                            style={{
                              background: rowIsAccept ? '#166534' : '#7f1d1d',
                              color: rowAccentCol,
                              border: `1px solid ${rowAccentCol}`,
                              fontFamily: 'monospace',
                            }}
                          >
                            OK
                          </button>
                          <button
                            onClick={cancelConfirm}
                            className="px-2 py-1 rounded text-xs font-bold"
                            style={{ background: 'transparent', color: '#64748b', border: '1px solid #334155' }}
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        // Default accept/reject buttons
                        <>
                          <button
                            onClick={() => startSingleConfirm(l.id, 'accept')}
                            disabled={mutation.isPending}
                            className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
                            style={{ backgroundColor: '#F0FDF4', color: '#16A34A', border: '1px solid #86EFAC' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#DCFCE7')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F0FDF4')}
                          >
                            ✓ Accept
                          </button>
                          <button
                            onClick={() => startSingleConfirm(l.id, 'reject')}
                            disabled={mutation.isPending}
                            className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
                            style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEE2E2')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                          >
                            ✗ Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
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

      {/* ── Confirm bar (fixed bottom, portal to body) ── */}
      {confirm && createPortal(
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
          padding: '0 22px 16px', pointerEvents: 'none',
        }}>
          <div style={{ maxWidth: 900, margin: '0 auto', pointerEvents: 'all' }}>
            <div style={{
              background: barBg, border: `2px solid ${barBorder}`, borderRadius: 10,
              padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 18,
              boxShadow: '0 -4px 32px rgba(0,0,0,0.6)',
            }}>
              {/* Ring (single) or icon (batch) */}
              {confirm.kind === 'single' ? (
                <CountdownRing secs={confirm.secs} total={CONFIRM_SECS} isAccept={isAccept} />
              ) : (
                <div style={{ fontSize: 32, width: 48, textAlign: 'center', flexShrink: 0 }}>
                  {isAccept ? '✓' : '✗'}
                </div>
              )}

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 15, fontWeight: 800, color: accentCol,
                  letterSpacing: '.05em', marginBottom: 4,
                }}>
                  {confirm.kind === 'single'
                    ? (isAccept ? 'CONFIRM ACCEPT' : 'CONFIRM REJECT')
                    : `${isAccept ? 'CONFIRM ACCEPT' : 'CONFIRM REJECT'} ${confirm.ids.length} LOAD${confirm.ids.length !== 1 ? 'S' : ''}`}
                </div>
                <div style={{
                  fontSize: 12, color: '#94a3b8',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {confirm.kind === 'single' && confirmLoad
                    ? `${confirmLoad.referenceNumber} — ${confirmLoad.laneName}`
                    : confirm.kind === 'batch'
                      ? `Est. GP impact: ${fmtMoney(batchGP)} · This action cannot be undone`
                      : null}
                </div>
                {confirm.kind === 'single' && confirmLoad && (
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    {confirmLoad.clientName ?? 'No client'} · Target {fmtMoney(confirmLoad.targetRate)} · GP est. {fmtMoney(confirmLoad.targetRate - confirmLoad.carrierCost)}
                  </div>
                )}
              </div>

              {/* Confirm button */}
              <button
                onClick={executeConfirm}
                style={{
                  padding: '12px 28px', background: accentCol, color: '#000',
                  border: 'none', borderRadius: 7, fontSize: 14, fontWeight: 900,
                  fontFamily: 'monospace', cursor: 'pointer', letterSpacing: '.05em',
                }}
              >
                {isAccept ? '✓ ACCEPT' : '✗ REJECT'}
                {confirm.kind === 'batch' ? ` ALL` : ''}
              </button>

              {/* Cancel button */}
              <button
                onClick={cancelConfirm}
                style={{
                  padding: '12px 20px', background: 'transparent', color: '#64748b',
                  border: '1px solid #334155', borderRadius: 7, fontSize: 13,
                  fontWeight: 700, fontFamily: 'monospace', cursor: 'pointer',
                }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
}
