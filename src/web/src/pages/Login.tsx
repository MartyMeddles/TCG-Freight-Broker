import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), pin);
      navigate('/', { replace: true });
    } catch {
      setError('Invalid username or PIN. Please try again.');
    } finally {
      setLoading(false);
    }
  }

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
      </div>

      {/* Login card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold" style={{ color: '#1F2937' }}>Sign in</h1>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Enter your credentials to access the platform</p>
          </div>

          <div
            className="rounded-xl p-8"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: '#374151' }}
                  htmlFor="username"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm transition-colors focus:outline-none"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    color: '#1F2937',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#1D4ED8')}
                  onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                  placeholder="your.name"
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: '#374151' }}
                  htmlFor="pin"
                >
                  PIN
                </label>
                <input
                  id="pin"
                  type="password"
                  autoComplete="current-password"
                  inputMode="numeric"
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm transition-colors focus:outline-none"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    color: '#1F2937',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#1D4ED8')}
                  onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                  placeholder="••••••"
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
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
                style={{ backgroundColor: loading ? '#93C5FD' : '#1D4ED8' }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#1E40AF'; }}
                onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#1D4ED8'; }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
