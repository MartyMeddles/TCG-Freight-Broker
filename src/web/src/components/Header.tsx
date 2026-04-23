import { KPIS, WEEK } from '../data/mock';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  autoMode: boolean;
  onAutoToggle: () => void;
}

export default function Header({ autoMode, onAutoToggle }: Props) {
  const { user, logout } = useAuth();
  const fill = parseInt(KPIS[0].value);
  const fillColor = fill >= 80 ? '#16A34A' : fill >= 60 ? '#D97706' : '#DC2626';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <header style={{ backgroundColor: '#053A62' }} className="flex items-center justify-between px-6 py-0 h-14 shrink-0">
      {/* Left: Logo + week context */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <div
            style={{ backgroundColor: '#1D4ED8' }}
            className="w-7 h-7 rounded flex items-center justify-center shrink-0"
          >
            <span className="text-white text-[10px] font-black tracking-tight">TCG</span>
          </div>
          <div>
            <span className="text-white text-sm font-bold leading-none">FreightBroker</span>
            <span className="ml-2 text-[10px] text-white/50 font-normal">Operations Platform</span>
          </div>
        </div>

        <div style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} className="h-8 w-px mx-1" />

        <div className="text-xs text-white/60">
          Week <span className="text-white/90 font-medium">{WEEK.num}</span>
          <span className="mx-1.5 text-white/30">·</span>
          {WEEK.start} – {WEEK.end}
          <span className="mx-1.5 text-white/30">·</span>
          <span className="text-white/90 font-medium">{WEEK.daysRemaining}d</span>
          <span className="text-white/50"> remaining</span>
        </div>
      </div>

      {/* Right: Fill score + Auto toggle + Date + User */}
      <div className="flex items-center gap-4">
        {/* Fill rate */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50">Fill Rate</span>
          <span className="text-sm font-bold tabular-nums" style={{ color: fillColor }}>{KPIS[0].value}</span>
          <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: KPIS[0].value, backgroundColor: fillColor }} />
          </div>
        </div>

        <div style={{ backgroundColor: 'rgba(255,255,255,0.12)' }} className="w-px h-5" />

        {/* Auto mode toggle */}
        <button
          onClick={onAutoToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
            autoMode
              ? 'border-green-400/40 text-green-300'
              : 'border-white/20 text-white/50'
          }`}
          style={{ backgroundColor: autoMode ? 'rgba(22,163,74,0.18)' : 'rgba(255,255,255,0.07)' }}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${autoMode ? 'bg-green-400 animate-pulse' : 'bg-white/30'}`} />
          {autoMode ? 'AUTO ON' : 'AUTO OFF'}
        </button>

        <div className="text-xs text-white/40 tabular-nums">{today}</div>

        {/* User chip */}
        {user && (
          <div className="flex items-center gap-2.5">
            <div
              style={{ backgroundColor: '#1D4ED8' }}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 uppercase"
            >
              {user.displayName.charAt(0)}
            </div>
            <span className="text-xs text-white/80 font-medium max-w-24 truncate">{user.displayName}</span>
            <button
              onClick={logout}
              className="text-[11px] text-white/40 hover:text-white/80 transition-colors font-medium"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

