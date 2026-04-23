import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function ForcedPinChange() {
  const { user, changePin, logout } = useAuth();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (newPin.length < 4) {
      setError('New PIN must be at least 4 characters.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('New PINs do not match.');
      return;
    }
    if (currentPin === newPin) {
      setError('New PIN must differ from your current PIN.');
      return;
    }

    setLoading(true);
    try {
      await changePin(currentPin, newPin);
      // ProtectedRoute will re-render and allow access now that mustChangePin is false
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Failed to change PIN. Please check your current PIN and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: '#FFFFFF',
    border: '1px solid #D1D5DB',
    color: '#1F2937',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F3F4F6' }}>
      {/* Top bar */}
      <div className="h-14 shrink-0 flex items-center px-8" style={{ backgroundColor: '#053A62' }}>
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded flex items-center justify-center"
            style={{ backgroundColor: '#1D4ED8' }}
          >
            <span className="text-white text-[10px] font-black tracking-tight">TCG</span>
          </div>
          <span className="text-white text-sm font-bold">FreightBroker</span>
          <span className="ml-1 text-white/40 text-[11px]">Operations Platform</span>
        </div>
        <div className="ml-auto">
          <button
            onClick={logout}
            className="text-xs text-white/60 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Alert banner */}
          <div
            className="rounded-xl p-4 mb-6 flex items-start gap-3"
            style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}
          >
            <span className="text-lg leading-none mt-0.5">⚠</span>
            <div>
              <div className="text-sm font-semibold" style={{ color: '#92400E' }}>
                PIN change required
              </div>
              <p className="text-xs mt-0.5" style={{ color: '#92400E' }}>
                Hi {user?.displayName ?? user?.username}! Your account was set up with a temporary
                PIN. You must create a new PIN before you can continue.
              </p>
            </div>
          </div>

          <div
            className="rounded-xl p-8"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
          >
            <h1 className="text-xl font-bold mb-6" style={{ color: '#1F2937' }}>Set your new PIN</h1>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
                  Current PIN (temporary)
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  inputMode="numeric"
                  required
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  style={inputStyle}
                  placeholder="Enter temporary PIN"
                  onFocus={(e) => (e.target.style.borderColor = '#1D4ED8')}
                  onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
                  New PIN
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  inputMode="numeric"
                  required
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  style={inputStyle}
                  placeholder="Choose a new PIN (min 4 characters)"
                  onFocus={(e) => (e.target.style.borderColor = '#1D4ED8')}
                  onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
                  Confirm new PIN
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  inputMode="numeric"
                  required
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  style={inputStyle}
                  placeholder="Re-enter new PIN"
                  onFocus={(e) => (e.target.style.borderColor = '#1D4ED8')}
                  onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                />
              </div>

              {error && (
                <div
                  className="rounded-lg px-3 py-2.5 text-sm"
                  style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
                style={{ backgroundColor: '#1D4ED8', color: '#FFFFFF' }}
              >
                {loading ? 'Saving…' : 'Set new PIN & continue'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
