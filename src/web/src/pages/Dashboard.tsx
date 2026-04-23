import { useQuery } from '@tanstack/react-query';
import { loadsApi, lanesApi, type LoadStats } from '../services/api';

const STATUS_PALETTE: Record<string, { bg: string; text: string }> = {
  Pending:  { bg: '#FEF3C7', text: '#D97706' },
  Accepted: { bg: '#F0FDF4', text: '#16A34A' },
  Rejected: { bg: '#FEF2F2', text: '#DC2626' },
  Booked:   { bg: '#EFF6FF', text: '#2563EB' },
};

interface StatCardProps {
  label: string;
  value: string | number;
  valueColor?: string;
  sub?: string;
}

function StatCard({ label, value, valueColor = '#1F2937', sub }: StatCardProps) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
    >
      <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>{label}</div>
      <div className="text-2xl font-bold tabular-nums" style={{ color: valueColor }}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{sub}</div>}
    </div>
  );
}

function money(n: number) {
  return `$${Number(n).toLocaleString()}`;
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<LoadStats>({
    queryKey: ['loads', 'stats'],
    queryFn: () => loadsApi.getStats(),
    refetchInterval: 15_000,
  });

  const { data: lanesData } = useQuery({
    queryKey: ['lanes'],
    queryFn: () => lanesApi.getAll({ isActive: true }),
    refetchInterval: 30_000,
  });

  const { data: recentData } = useQuery({
    queryKey: ['loads', 'recent'],
    queryFn: () => loadsApi.getAll({ pageSize: 8 }),
    refetchInterval: 15_000,
  });

  const lanes = lanesData?.items ?? [];
  const recentLoads = recentData?.items ?? [];
  const acceptedPct = stats && stats.total > 0
    ? Math.round(((stats.accepted + stats.booked) / stats.total) * 100)
    : 0;

  const kpis = statsLoading
    ? null
    : [
        { label: 'Total Loads',       value: stats?.total ?? 0,         valueColor: '#1F2937' },
        { label: 'Pending Review',    value: stats?.pending ?? 0,       valueColor: '#D97706' },
        { label: 'Accepted',          value: stats?.accepted ?? 0,      valueColor: '#16A34A' },
        { label: 'Booked',            value: stats?.booked ?? 0,        valueColor: '#2563EB' },
        { label: 'Rejected',          value: stats?.rejected ?? 0,      valueColor: '#DC2626' },
        { label: 'Auto-booked Today', value: stats?.autoBookedToday ?? 0, valueColor: '#7C3AED', sub: 'since midnight UTC' },
      ];

  const cardStyle = {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1F2937' }}>Operations Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>Live load activity and lane performance overview</p>
      </div>

      {/* KPI Cards */}
      {statsLoading ? (
        <div className="text-sm" style={{ color: '#9CA3AF' }}>Loading…</div>
      ) : (
        <div className="grid grid-cols-3 gap-4 lg:grid-cols-6">
          {kpis!.map((k) => (
            <StatCard key={k.label} label={k.label} value={k.value} valueColor={k.valueColor} sub={k.sub} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Recent Loads */}
        <div className="rounded-xl overflow-hidden" style={cardStyle}>
          <div
            className="px-5 py-4 border-b"
            style={{ borderColor: '#E5E7EB' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: '#1F2937' }}>Recent Load Activity</h2>
          </div>
          <div className="divide-y" style={{ borderColor: '#F3F4F6' }}>
            {recentLoads.length === 0 && (
              <div className="px-5 py-8 text-sm text-center" style={{ color: '#9CA3AF' }}>No loads yet</div>
            )}
            {recentLoads.map((l) => {
              const palette = STATUS_PALETTE[l.status] ?? { bg: '#F3F4F6', text: '#6B7280' };
              const suffix = l.isAutoBooked ? ' · Auto' : '';
              return (
                <div key={l.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-xs font-mono w-16 shrink-0" style={{ color: '#9CA3AF' }}>{shortDate(l.pickupDate)}</span>
                  <span className="flex-1 text-sm font-medium truncate" style={{ color: '#1F2937' }}>
                    {l.referenceNumber}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-semibold shrink-0"
                    style={{ backgroundColor: palette.bg, color: palette.text }}
                  >
                    {l.status}{suffix}
                  </span>
                  <span className="text-sm font-mono shrink-0" style={{ color: '#6B7280' }}>{money(l.targetRate)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Lanes */}
        <div className="rounded-xl overflow-hidden" style={cardStyle}>
          <div
            className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: '#E5E7EB' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: '#1F2937' }}>Active Lanes</h2>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}
            >
              {lanes.length} configured
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: '#F3F4F6' }}>
            {lanes.length === 0 && (
              <div className="px-5 py-8 text-sm text-center" style={{ color: '#9CA3AF' }}>No active lanes configured</div>
            )}
            {lanes.slice(0, 6).map((l) => (
              <div key={l.id} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm" style={{ color: '#1F2937' }}>
                  {l.originCity}, {l.originState} → {l.destinationCity}, {l.destinationState}
                </span>
                {l.clientName && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}
                  >
                    {l.clientName}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Accept rate bar */}
          {stats && stats.total > 0 && (
            <div className="px-5 py-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <div className="flex justify-between text-xs mb-1.5">
                <span style={{ color: '#6B7280' }}>Accept rate (all-time)</span>
                <span className="font-semibold" style={{ color: '#1F2937' }}>{acceptedPct}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${acceptedPct}%`,
                    backgroundColor: acceptedPct >= 70 ? '#16A34A' : acceptedPct >= 50 ? '#D97706' : '#DC2626',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
