import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { lanesApi, loadsApi, type LaneDto, type LoadDto } from '../services/api';

const STATUS_PALETTE: Record<string, { bg: string; text: string }> = {
  Pending:  { bg: '#FEF3C7', text: '#D97706' },
  Accepted: { bg: '#F0FDF4', text: '#16A34A' },
  Rejected: { bg: '#FEF2F2', text: '#DC2626' },
  Booked:   { bg: '#EFF6FF', text: '#2563EB' },
};

const cardStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
};

function money(n: number | null | undefined) {
  if (n == null) return '—';
  return `$${Number(n).toLocaleString()}`;
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function laneName(l: LaneDto) {
  return `${l.originCity}, ${l.originState} → ${l.destinationCity}, ${l.destinationState}`;
}

export default function LaneDrilldown() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const laneId = Number(id);

  const { data: lane, isLoading: laneLoading } = useQuery({
    queryKey: ['lanes', laneId],
    queryFn: () => lanesApi.getById(laneId),
    enabled: !Number.isNaN(laneId),
  });

  const { data: loadsData, isLoading: loadsLoading } = useQuery({
    queryKey: ['loads', { laneId }],
    queryFn: () => loadsApi.getAll({ laneId, pageSize: 100 }),
    enabled: !Number.isNaN(laneId),
  });

  const loads: LoadDto[] = loadsData?.items ?? [];
  const accepted = loads.filter((l) => l.status === 'Accepted' || l.status === 'Booked').length;
  const rejected = loads.filter((l) => l.status === 'Rejected').length;
  const pending = loads.filter((l) => l.status === 'Pending').length;
  const autoBooked = loads.filter((l) => l.isAutoBooked).length;

  if (laneLoading) {
    return <div className="p-6 text-sm" style={{ color: '#9CA3AF' }}>Loading…</div>;
  }

  if (!lane) {
    return (
      <div className="p-6 space-y-3">
        <div className="text-sm font-medium" style={{ color: '#DC2626' }}>Lane not found.</div>
        <button
          onClick={() => navigate('/tracker')}
          className="text-sm font-medium transition-colors"
          style={{ color: '#1D4ED8' }}
        >
          ← Back to Contract Tracker
        </button>
      </div>
    );
  }

  const kpis = [
    { label: 'Total Loads',      value: loads.length, color: '#1F2937' },
    { label: 'Accepted / Booked', value: accepted,    color: '#16A34A' },
    { label: 'Rejected',          value: rejected,    color: '#DC2626' },
    { label: 'Auto-booked',       value: autoBooked,  color: '#7C3AED' },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* Breadcrumb + Header */}
      <div>
        <button
          onClick={() => navigate('/tracker')}
          className="text-sm font-medium mb-2 block transition-colors"
          style={{ color: '#6B7280' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#1D4ED8')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#6B7280')}
        >
          ← Contract Tracker
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold" style={{ color: '#1F2937' }}>{laneName(lane)}</h1>
          {lane.clientName && (
            <span
              className="px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}
            >
              {lane.clientName}
            </span>
          )}
          <span className="text-sm" style={{ color: '#6B7280' }}>{lane.mode}</span>
          <span
            className="px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: lane.isActive ? '#F0FDF4' : '#FEF2F2',
              color: lane.isActive ? '#16A34A' : '#DC2626',
            }}
          >
            {lane.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl p-5" style={cardStyle}>
            <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>{k.label}</div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Loads table */}
      <div className="rounded-xl overflow-hidden" style={cardStyle}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#E5E7EB' }}>
          <h2 className="text-sm font-semibold" style={{ color: '#1F2937' }}>Loads on this Lane</h2>
          <span className="text-sm" style={{ color: '#6B7280' }}>{loads.length} total</span>
        </div>
        {loadsLoading ? (
          <div className="px-5 py-12 text-center text-sm" style={{ color: '#9CA3AF' }}>Loading…</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                {['Ref #', 'Pickup', 'Delivery', 'Target Rate', 'Booked Rate', 'Status', 'Source'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider ${i >= 3 && i <= 4 ? 'text-right' : i >= 5 ? 'text-center' : 'text-left'}`}
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
                  <td colSpan={7} className="px-5 py-12 text-center text-sm" style={{ color: '#9CA3AF' }}>
                    No loads for this lane yet
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
                    <td className="px-5 py-3.5 text-sm font-mono font-medium" style={{ color: '#1F2937' }}>{l.referenceNumber}</td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: '#6B7280' }}>{shortDate(l.pickupDate)}</td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: '#6B7280' }}>{shortDate(l.deliveryDate)}</td>
                    <td className="px-5 py-3.5 text-sm text-right font-mono" style={{ color: '#374151' }}>{money(l.targetRate)}</td>
                    <td className="px-5 py-3.5 text-sm text-right font-mono" style={{ color: '#16A34A' }}>{money(l.bookedRate)}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ backgroundColor: palette.bg, color: palette.text }}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {l.isAutoBooked ? (
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: '#F5F3FF', color: '#7C3AED' }}
                        >
                          Auto
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: '#9CA3AF' }}>Manual</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {pending > 0 && (
          <div
            className="px-5 py-3 border-t text-sm"
            style={{ borderColor: '#E5E7EB', backgroundColor: '#FFFBEB', color: '#D97706' }}
          >
            {pending} load{pending !== 1 ? 's' : ''} pending review
          </div>
        )}
      </div>
    </div>
  );
}
