import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parametersApi, simulateApi, type ParametersDto, type SimulateEvaluateRequest, type SimulateEvaluateResponse } from '../services/api';

function pct(n: number) { return `${n}%`; }

const REC_PALETTE: Record<string, { bg: string; text: string; border: string }> = {
  AutoAccept:   { bg: '#F0FDF4', text: '#16A34A', border: '#86EFAC' },
  ContractBook: { bg: '#EFF6FF', text: '#2563EB', border: '#93C5FD' },
  Review:       { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
};

const RULE_PALETTE: Record<string, { text: string }> = {
  pass: { text: '#16A34A' },
  fail: { text: '#DC2626' },
  warn: { text: '#D97706' },
};

const RULE_ICONS: Record<string, string> = { pass: '✓', fail: '✗', warn: '⚠' };

const cardStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
};

const inputClass = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #D1D5DB',
  color: '#1F2937',
  borderRadius: '6px',
  padding: '5px 8px',
  fontSize: '13px',
  outline: 'none',
  width: '100%',
} as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>
      {children}
    </div>
  );
}

function NumberField({ label, hint, value, isPercent, onChange }: {
  label: string; hint: string; value: number; isPercent?: boolean; onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          step={isPercent ? '0.5' : '1'}
          min={0}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ ...inputClass, width: '80px' }}
          onFocus={(e) => (e.target.style.borderColor = '#1D4ED8')}
          onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
        />
        {isPercent && <span className="text-xs" style={{ color: '#9CA3AF' }}>%</span>}
      </div>
      <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{hint}</p>
    </div>
  );
}

function BoolField({ label, hint, value, onChange }: {
  label: string; hint: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>{label}</label>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className="px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors"
        style={{
          backgroundColor: value ? '#F0FDF4' : '#F9FAFB',
          color: value ? '#16A34A' : '#6B7280',
          borderColor: value ? '#86EFAC' : '#E5E7EB',
        }}
      >
        {value ? 'Enabled' : 'Disabled'}
      </button>
      <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{hint}</p>
    </div>
  );
}

// ─── Default test input ───────────────────────────────────────────────────────

const DEFAULT_TEST: SimulateEvaluateRequest = {
  lane: 'Chicago → Dallas',
  carrierCost: 1800,
  customerRate: 2200,
  spotRate: 2000,
  contractRate: 2100,
  isContract: true,
  weeklyMinimum: 10,
  currentWeekBookings: 6,
  totalUnmetContractLoads: 5,
  daysRemaining: 3,
  clientCode: null,
  needsInsurance: false,
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Parameters() {
  const qc = useQueryClient();

  const { data: saved, isLoading: paramsLoading } = useQuery({
    queryKey: ['parameters'],
    queryFn: () => parametersApi.get(),
  });

  const [params, setParams] = useState<ParametersDto | null>(null);
  const effective = params ?? saved ?? null;

  const saveMutation = useMutation({
    mutationFn: (p: ParametersDto) => parametersApi.update(p),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['parameters'] });
      setParams(updated);
    },
  });

  function setField<K extends keyof ParametersDto>(key: K, value: ParametersDto[K]) {
    setParams((prev) => ({ ...(prev ?? saved!), [key]: value }));
  }

  const [test, setTest] = useState<SimulateEvaluateRequest>(DEFAULT_TEST);
  const [result, setResult] = useState<SimulateEvaluateResponse | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);

  const evalMutation = useMutation({
    mutationFn: () => simulateApi.evaluate(test),
    onSuccess: (r) => { setResult(r); setResultError(null); },
    onError: () => setResultError('Evaluation failed. Check API connection.'),
  });

  function setTestField<K extends keyof SimulateEvaluateRequest>(key: K, value: SimulateEvaluateRequest[K]) {
    setTest((prev) => ({ ...prev, [key]: value }));
  }

  if (paramsLoading || !effective) {
    return <div className="p-8 text-sm" style={{ color: '#9CA3AF' }}>Loading parameters…</div>;
  }

  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1F2937' }}>Parameters & Tester</h1>
        <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>Configure decision thresholds and simulate load evaluations</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* ── Left: Parameter Editor ─────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden" style={cardStyle}>
            <div
              className="px-5 py-4 border-b flex items-center justify-between"
              style={{ borderColor: '#E5E7EB' }}
            >
              <h2 className="text-sm font-semibold" style={{ color: '#1F2937' }}>Decision Engine Parameters</h2>
              {params && (
                <button
                  onClick={() => setParams(null)}
                  className="text-xs font-medium transition-colors"
                  style={{ color: '#6B7280' }}
                >
                  Discard changes
                </button>
              )}
            </div>

            <div className="p-5 space-y-6">
              <p className="text-sm" style={{ color: '#6B7280' }}>
                Thresholds applied by the AI when evaluating every load. Changes take effect immediately after saving.
              </p>

              {/* Contract rules */}
              <div>
                <SectionLabel>Contract Lane Rules</SectionLabel>
                <div className="grid grid-cols-2 gap-4">
                  <NumberField label="GP Floor" hint="Minimum contract gross-profit %" value={effective.ctrGPFloor} isPercent onChange={(v) => setField('ctrGPFloor', v)} />
                  <NumberField label="Margin Floor (obligation)" hint="Min margin when lane is behind" value={effective.ctrMarginFloor} isPercent onChange={(v) => setField('ctrMarginFloor', v)} />
                  <NumberField label="Margin Normal" hint="Min margin when obligation is met" value={effective.ctrMarginNormal} isPercent onChange={(v) => setField('ctrMarginNormal', v)} />
                  <BoolField label="Override Profit" hint="Book at negative profit when needed" value={effective.ctrOverrideProfit} onChange={(v) => setField('ctrOverrideProfit', v)} />
                  <BoolField label="Override Margin" hint="Book sub-floor margin when needed" value={effective.ctrOverrideMargin} onChange={(v) => setField('ctrOverrideMargin', v)} />
                </div>
              </div>

              {/* Spot rules */}
              <div className="pt-4 border-t" style={{ borderColor: '#F3F4F6' }}>
                <SectionLabel>Spot Load Rules</SectionLabel>
                <div className="grid grid-cols-2 gap-4">
                  <NumberField label="Spot Margin Floor" hint="Min margin % on spot loads" value={effective.spotMarginFloor} isPercent onChange={(v) => setField('spotMarginFloor', v)} />
                  <NumberField label="DAT Tolerance" hint="Max % above DAT benchmark allowed" value={effective.datTolerance} isPercent onChange={(v) => setField('datTolerance', v)} />
                  <NumberField label="Spot Block Threshold" hint="Unmet contracts that pause spot acceptance" value={effective.spotBlockThreshold} onChange={(v) => setField('spotBlockThreshold', v)} />
                </div>
              </div>

              {/* Urgency rules */}
              <div className="pt-4 border-t" style={{ borderColor: '#F3F4F6' }}>
                <SectionLabel>Urgency Escalation</SectionLabel>
                <div className="grid grid-cols-2 gap-4">
                  <NumberField label="Urgency Days" hint="Days remaining that trigger escalation" value={effective.urgencyDays} onChange={(v) => setField('urgencyDays', v)} />
                  <NumberField label="Urgency Loads" hint="Remaining loads for CRITICAL rule" value={effective.urgencyLoads} onChange={(v) => setField('urgencyLoads', v)} />
                </div>
              </div>
            </div>

            <div
              className="px-5 py-4 border-t flex items-center gap-3"
              style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}
            >
              <button
                onClick={() => effective && saveMutation.mutate(effective)}
                disabled={!params || saveMutation.isPending}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#1D4ED8' }}
                onMouseEnter={(e) => { if (params && !saveMutation.isPending) e.currentTarget.style.backgroundColor = '#1E40AF'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1D4ED8'; }}
              >
                {saveMutation.isPending ? 'Saving…' : 'Save Parameters'}
              </button>
              {saveMutation.isSuccess && (
                <span className="text-sm font-medium" style={{ color: '#16A34A' }}>Saved ✓</span>
              )}
              {saveMutation.isError && (
                <span className="text-sm" style={{ color: '#DC2626' }}>Save failed</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Manual Tester ───────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden" style={cardStyle}>
            <div className="px-5 py-4 border-b" style={{ borderColor: '#E5E7EB' }}>
              <h2 className="text-sm font-semibold" style={{ color: '#1F2937' }}>Manual Load Tester</h2>
              <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Enter hypothetical load details and step through the decision engine</p>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Lane */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Lane</label>
                  <input
                    type="text"
                    value={test.lane}
                    onChange={(e) => setTestField('lane', e.target.value)}
                    style={{ ...inputClass }}
                    onFocus={(e) => (e.target.style.borderColor = '#1D4ED8')}
                    onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                  />
                </div>

                {/* Financials */}
                {([
                  ['Carrier Cost', 'carrierCost', '$'],
                  ['Customer Rate', 'customerRate', '$'],
                  ['Spot Rate (DAT)', 'spotRate', '$'],
                  ['Contract Rate', 'contractRate', '$'],
                ] as [string, keyof SimulateEvaluateRequest, string][]).map(([label, field, prefix]) => (
                  <div key={field}>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>{label}</label>
                    <div className="flex items-center gap-1">
                      <span className="text-sm" style={{ color: '#9CA3AF' }}>{prefix}</span>
                      <input
                        type="number"
                        step="50"
                        value={test[field] as number}
                        onChange={(e) => setTestField(field, Number(e.target.value))}
                        style={{ ...inputClass }}
                        onFocus={(e) => (e.target.style.borderColor = '#1D4ED8')}
                        onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                      />
                    </div>
                  </div>
                ))}

                {/* Context fields */}
                {([
                  ['Weekly Minimum', 'weeklyMinimum'],
                  ['Current Week Bookings', 'currentWeekBookings'],
                  ['Unmet Contract Loads', 'totalUnmetContractLoads'],
                  ['Days Remaining in Week', 'daysRemaining'],
                ] as [string, keyof SimulateEvaluateRequest][]).map(([label, field]) => (
                  <div key={field}>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>{label}</label>
                    <input
                      type="number"
                      min="0"
                      value={(test[field] as number | null) ?? ''}
                      onChange={(e) => setTestField(field, e.target.value === '' ? null : Number(e.target.value))}
                      style={{ ...inputClass }}
                      onFocus={(e) => (e.target.style.borderColor = '#1D4ED8')}
                      onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                    />
                  </div>
                ))}

                {/* Toggle: Load Type */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Load Type</label>
                  <button
                    type="button"
                    onClick={() => setTestField('isContract', !test.isContract)}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors"
                    style={{
                      backgroundColor: test.isContract ? '#EFF6FF' : '#F9FAFB',
                      color: test.isContract ? '#1D4ED8' : '#6B7280',
                      borderColor: test.isContract ? '#93C5FD' : '#E5E7EB',
                    }}
                  >
                    {test.isContract ? 'Contract' : 'Spot'}
                  </button>
                </div>

                {/* Toggle: Insurance */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Needs Insurance</label>
                  <button
                    type="button"
                    onClick={() => setTestField('needsInsurance', !test.needsInsurance)}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors"
                    style={{
                      backgroundColor: test.needsInsurance ? '#FFFBEB' : '#F9FAFB',
                      color: test.needsInsurance ? '#D97706' : '#6B7280',
                      borderColor: test.needsInsurance ? '#FCD34D' : '#E5E7EB',
                    }}
                  >
                    {test.needsInsurance ? 'Required' : 'Not required'}
                  </button>
                </div>
              </div>

              <button
                onClick={() => evalMutation.mutate()}
                disabled={evalMutation.isPending}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#1D4ED8' }}
                onMouseEnter={(e) => { if (!evalMutation.isPending) e.currentTarget.style.backgroundColor = '#1E40AF'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1D4ED8'; }}
              >
                {evalMutation.isPending ? 'Evaluating…' : '▶ Run Evaluation'}
              </button>

              {resultError && (
                <div
                  className="rounded-lg px-3 py-2 text-sm"
                  style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}
                >
                  {resultError}
                </div>
              )}
            </div>
          </div>

          {/* Rule Trace */}
          {result && (() => {
            const recPalette = REC_PALETTE[result.recommendation] ?? REC_PALETTE.Review;
            return (
              <div className="rounded-xl overflow-hidden" style={cardStyle}>
                <div
                  className="px-5 py-4 border-b flex items-center justify-between"
                  style={{ borderColor: '#E5E7EB' }}
                >
                  <h3 className="text-sm font-semibold" style={{ color: '#1F2937' }}>Rule Trace</h3>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-semibold border"
                    style={{ backgroundColor: recPalette.bg, color: recPalette.text, borderColor: recPalette.border }}
                  >
                    {result.recommendation}
                  </span>
                </div>

                {/* Summary */}
                <div
                  className="px-5 py-3 border-b grid grid-cols-4 gap-3 text-center"
                  style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}
                >
                  {[
                    { label: 'Decision', value: result.pass ? 'Pass' : 'Fail', color: result.pass ? '#16A34A' : '#DC2626' },
                    { label: 'Score',    value: String(result.score),          color: '#1F2937' },
                    { label: 'Ctr GP',   value: pct(result.contractGP),        color: '#1F2937' },
                    { label: 'GP Floor', value: pct(result.gpFloor),           color: '#6B7280' },
                  ].map((s) => (
                    <div key={s.label}>
                      <div className="text-base font-bold tabular-nums" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Rules */}
                <div className="divide-y" style={{ borderColor: '#F3F4F6' }}>
                  {result.rules.map((r, i) => {
                    const rp = RULE_PALETTE[r.status] ?? { text: '#6B7280' };
                    return (
                      <div key={i} className="flex items-start gap-3 px-5 py-3">
                        <span className="text-sm font-bold w-4 shrink-0 mt-0.5" style={{ color: rp.text }}>
                          {RULE_ICONS[r.status] ?? '?'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold" style={{ color: rp.text }}>{r.ruleName}</div>
                          <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{r.description}</div>
                        </div>
                        <span
                          className="text-xs font-mono shrink-0"
                          style={{ color: r.weight > 0 ? '#16A34A' : r.weight < 0 ? '#DC2626' : '#9CA3AF' }}
                        >
                          {r.weight > 0 ? `+${r.weight}` : r.weight}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
