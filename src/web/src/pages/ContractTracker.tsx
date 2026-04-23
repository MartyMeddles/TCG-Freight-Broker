import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { lanesApi, type LaneDto } from '../services/api';

function laneName(l: LaneDto) {
  return `${l.originCity}, ${l.originState} → ${l.destinationCity}, ${l.destinationState}`;
}

const cardStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
};

export default function ContractTracker() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['lanes'],
    queryFn: () => lanesApi.getAll(),
  });

  const lanes: LaneDto[] = data?.items ?? [];
  const active = lanes.filter((l) => l.isActive);

  const kpis = [
    { label: 'Total Lanes',    value: lanes.length,                         color: '#1F2937' },
    { label: 'Active',         value: active.length,                        color: '#16A34A' },
    { label: 'Inactive',       value: lanes.length - active.length,         color: '#DC2626' },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1F2937' }}>Contract Tracker</h1>
        <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>Manage configured lanes and contract commitments</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl p-5 text-center" style={cardStyle}>
            <div className="text-3xl font-bold tabular-nums" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs font-medium mt-1" style={{ color: '#6B7280' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Lanes table */}
      <div className="rounded-xl overflow-hidden" style={cardStyle}>
        <div className="px-5 py-4 border-b" style={{ borderColor: '#E5E7EB' }}>
          <h2 className="text-sm font-semibold" style={{ color: '#1F2937' }}>Configured Lanes</h2>
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Click a lane to view load history and performance</p>
        </div>
        {isLoading ? (
          <div className="px-5 py-12 text-center text-sm" style={{ color: '#9CA3AF' }}>Loading…</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Lane</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Client</th>
                <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Mode</th>
                <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {lanes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-sm" style={{ color: '#9CA3AF' }}>No lanes configured</td>
                </tr>
              )}
              {lanes.map((l: LaneDto) => (
                <tr
                  key={l.id}
                  className="cursor-pointer transition-colors"
                  style={{ borderBottom: '1px solid #F3F4F6' }}
                  onClick={() => navigate(`/tracker/${l.id}`)}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td className="px-5 py-3.5 text-sm font-medium" style={{ color: '#1F2937' }}>{laneName(l)}</td>
                  <td className="px-5 py-3.5">
                    {l.clientName ? (
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}
                      >
                        {l.clientName}
                      </span>
                    ) : (
                      <span style={{ color: '#9CA3AF' }}>—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center text-sm" style={{ color: '#6B7280' }}>{l.mode}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: l.isActive ? '#F0FDF4' : '#FEF2F2',
                        color: l.isActive ? '#16A34A' : '#DC2626',
                      }}
                    >
                      {l.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
