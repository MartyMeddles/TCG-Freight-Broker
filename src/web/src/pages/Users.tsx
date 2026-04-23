import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, type UserDto, type CreateUserRequest } from '../services/api';

// ─── Styles ───────────────────────────────────────────────────────────────────

const card = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  borderRadius: '8px',
} as const;

const inputStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #D1D5DB',
  color: '#1F2937',
  borderRadius: '6px',
  padding: '6px 10px',
  fontSize: '13px',
  width: '100%',
  outline: 'none',
} as const;

const selectStyle = { ...inputStyle } as const;

const ROLES = ['Admin', 'Manager', 'Viewer'] as const;
type Role = (typeof ROLES)[number];

const ROLE_BADGE: Record<Role, { bg: string; text: string }> = {
  Admin:   { bg: '#EFF6FF', text: '#1D4ED8' },
  Manager: { bg: '#F0FDF4', text: '#16A34A' },
  Viewer:  { bg: '#F9FAFB', text: '#6B7280' },
};

// ─── Small helpers ────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const style = ROLE_BADGE[role as Role] ?? { bg: '#F9FAFB', text: '#6B7280' };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {role}
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
      style={{
        backgroundColor: isActive ? '#F0FDF4' : '#FEF2F2',
        color: isActive ? '#16A34A' : '#DC2626',
      }}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Add User modal ───────────────────────────────────────────────────────────

function AddUserModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<CreateUserRequest>({
    username: '', pin: '', displayName: '', role: 'Viewer',
  });
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => usersApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (e: Error) => setError(e.message || 'Failed to create user.'),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (form.pin.length < 4) { setError('PIN must be at least 4 characters.'); return; }
    if (form.pin !== confirmPin) { setError('PINs do not match.'); return; }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
      <div className="w-full max-w-md rounded-xl p-6" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        <h2 className="text-base font-bold mb-4" style={{ color: '#1F2937' }}>Add New User</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Username</label>
            <input style={inputStyle} value={form.username} autoComplete="off"
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Display Name</label>
            <input style={inputStyle} value={form.displayName}
              onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>PIN</label>
              <input type="password" style={inputStyle} value={form.pin} autoComplete="new-password"
                onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Confirm PIN</label>
              <input type="password" style={inputStyle} value={confirmPin} autoComplete="new-password"
                onChange={e => setConfirmPin(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Role</label>
            <select style={selectStyle} value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>

          {error && <p className="text-xs" style={{ color: '#DC2626' }}>{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg"
              style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="px-4 py-2 text-sm font-semibold rounded-lg"
              style={{ backgroundColor: '#1D4ED8', color: '#FFFFFF', opacity: mutation.isPending ? 0.6 : 1 }}>
              {mutation.isPending ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit User modal ──────────────────────────────────────────────────────────

function EditUserModal({ user, onClose }: { user: UserDto; onClose: () => void }) {
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [role, setRole] = useState(user.role);
  const [isActive, setIsActive] = useState(user.isActive);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [pinSuccess, setPinSuccess] = useState(false);

  const updateMutation = useMutation({
    mutationFn: () => usersApi.update(user.id, { displayName, role, isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (e: Error) => setError(e.message || 'Failed to update user.'),
  });

  const pinMutation = useMutation({
    mutationFn: () => usersApi.resetPin(user.id, newPin),
    onSuccess: () => {
      setPinSuccess(true);
      setNewPin('');
      setConfirmPin('');
    },
    onError: (e: Error) => setError(e.message || 'Failed to reset PIN.'),
  });

  function handleSave(e: FormEvent) {
    e.preventDefault();
    setError('');
    updateMutation.mutate();
  }

  function handleResetPin() {
    setError('');
    setPinSuccess(false);
    if (newPin.length < 4) { setError('PIN must be at least 4 characters.'); return; }
    if (newPin !== confirmPin) { setError('PINs do not match.'); return; }
    pinMutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
      <div className="w-full max-w-md rounded-xl p-6 space-y-4" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        <h2 className="text-base font-bold" style={{ color: '#1F2937' }}>Edit User — {user.username}</h2>

        {/* Profile fields */}
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Display Name</label>
            <input style={inputStyle} value={displayName}
              onChange={e => setDisplayName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Role</label>
              <select style={selectStyle} value={role} onChange={e => setRole(e.target.value)}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Status</label>
              <select style={selectStyle} value={isActive ? 'Active' : 'Inactive'}
                onChange={e => setIsActive(e.target.value === 'Active')}>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
          </div>

          {error && !pinSuccess && <p className="text-xs" style={{ color: '#DC2626' }}>{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg"
              style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>
              Cancel
            </button>
            <button type="submit" disabled={updateMutation.isPending}
              className="px-4 py-2 text-sm font-semibold rounded-lg"
              style={{ backgroundColor: '#1D4ED8', color: '#FFFFFF', opacity: updateMutation.isPending ? 0.6 : 1 }}>
              {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* PIN reset */}
        <div className="pt-3" style={{ borderTop: '1px solid #E5E7EB' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: '#6B7280' }}>RESET PIN</p>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>New PIN</label>
              <input type="password" style={inputStyle} value={newPin} autoComplete="new-password"
                onChange={e => setNewPin(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Confirm PIN</label>
              <input type="password" style={inputStyle} value={confirmPin} autoComplete="new-password"
                onChange={e => setConfirmPin(e.target.value)} />
            </div>
          </div>
          {pinSuccess && <p className="text-xs mb-1" style={{ color: '#16A34A' }}>PIN updated successfully.</p>}
          {error && pinSuccess === false && newPin && <p className="text-xs mb-1" style={{ color: '#DC2626' }}>{error}</p>}
          <button
            type="button"
            onClick={handleResetPin}
            disabled={pinMutation.isPending || !newPin}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg"
            style={{ backgroundColor: '#F59E0B', color: '#FFFFFF', opacity: (pinMutation.isPending || !newPin) ? 0.6 : 1 }}
          >
            {pinMutation.isPending ? 'Updating…' : 'Update PIN'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Users() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<UserDto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  function handleDelete(user: UserDto) {
    if (!window.confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
    deleteMutation.mutate(user.id);
  }

  const users = data?.items ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: '#1F2937' }}>User Management</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>
            Admin-only — manage platform accounts, roles, and PINs
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg"
          style={{ backgroundColor: '#1D4ED8', color: '#FFFFFF' }}
        >
          + Add User
        </button>
      </div>

      {/* Table */}
      <div style={card}>
        {isLoading ? (
          <div className="p-8 text-center text-sm" style={{ color: '#6B7280' }}>Loading…</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: '#6B7280' }}>No users found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                {['Username', 'Display Name', 'Role', 'Status', 'Created', 'Last Login', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: '#6B7280' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr
                  key={u.id}
                  style={{ borderBottom: i < users.length - 1 ? '1px solid #F3F4F6' : 'none' }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: '#1F2937' }}>{u.username}</td>
                  <td className="px-4 py-3" style={{ color: '#374151' }}>{u.displayName}</td>
                  <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                  <td className="px-4 py-3"><StatusBadge isActive={u.isActive} /></td>
                  <td className="px-4 py-3" style={{ color: '#6B7280' }}>{fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-3" style={{ color: '#6B7280' }}>{fmtDate(u.lastLoginAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditing(u)}
                        className="px-3 py-1 text-xs font-medium rounded"
                        style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="px-3 py-1 text-xs font-medium rounded"
                        style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} />}
      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
