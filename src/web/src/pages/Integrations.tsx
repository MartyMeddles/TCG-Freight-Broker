import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  integrationsApi, configApi, integrationConfigsApi,
  type IntegrationHealth, type DatSpotRate, type E2openPushResult, type ImapLoadMessage,
  type IntegrationConfigDto,
} from '../services/api';

const cardStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
};

function StatusBadge({ healthy }: { healthy: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{
        backgroundColor: healthy ? '#F0FDF4' : '#FEF2F2',
        color: healthy ? '#16A34A' : '#DC2626',
      }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: healthy ? '#16A34A' : '#DC2626' }}
      />
      {healthy ? 'Healthy' : 'Error'}
    </span>
  );
}

function StubBadge() {
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
    >
      STUB
    </span>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>
      {children}
    </div>
  );
}

function ProbeButton({
  label, onClick, loading,
}: { label: string; onClick: () => void; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
      style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}
    >
      {loading ? 'Testing…' : label}
    </button>
  );
}

export default function Integrations() {
  const qc = useQueryClient();
  const [datOrigin, setDatOrigin] = useState('Chicago, IL');
  const [datDest, setDatDest] = useState('Dallas, TX');
  const [datResult, setDatResult] = useState<DatSpotRate | null>(null);
  const [e2openResult, setE2openResult] = useState<E2openPushResult | null>(null);
  const [imapResult, setImapResult] = useState<ImapLoadMessage[] | null>(null);
  const [importJson, setImportJson] = useState('');
  const [importResult, setImportResult] = useState<string | null>(null);

  // Custom integrations state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('REST');
  const [newUrl, setNewUrl] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: statuses, isLoading } = useQuery({
    queryKey: ['integrations', 'status'],
    queryFn: () => integrationsApi.getStatus(),
    refetchInterval: 60_000,
  });

  const { data: customIntegrations, isLoading: customLoading } = useQuery({
    queryKey: ['integration-configs'],
    queryFn: () => integrationConfigsApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: () => integrationConfigsApi.create({ name: newName, type: newType, baseUrl: newUrl, apiKey: newKey || undefined, notes: newNotes || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integration-configs'] });
      setShowAddForm(false);
      setNewName(''); setNewType('REST'); setNewUrl(''); setNewKey(''); setNewNotes('');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => integrationConfigsApi.toggle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integration-configs'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => integrationConfigsApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['integration-configs'] }); setDeleteConfirm(null); },
  });

  const datProbe = useMutation({
    mutationFn: () => integrationsApi.probeDat(datOrigin, datDest),
    onSuccess: setDatResult,
  });

  const e2openProbe = useMutation({
    mutationFn: () => integrationsApi.probeE2open(),
    onSuccess: setE2openResult,
  });

  const imapProbe = useMutation({
    mutationFn: () => integrationsApi.probeImap(),
    onSuccess: setImapResult,
  });

  const configImport = useMutation({
    mutationFn: () => {
      const parsed = JSON.parse(importJson);
      return configApi.import(parsed);
    },
    onSuccess: (r) =>
      setImportResult(
        `Imported: ${r.clientsUpserted} clients, ${r.lanesUpserted} lanes${r.parametersApplied ? ', parameters applied' : ''}.`
      ),
    onError: (e) => setImportResult(`Error: ${(e as Error).message}`),
  });

  const inputStyle: React.CSSProperties = {
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    padding: '5px 8px',
    fontSize: '13px',
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
    outline: 'none',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1F2937' }}>Integrations</h1>
        <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>
          Status and diagnostics for external system connections (DAT, e2open, IMAP)
        </p>
      </div>

      {/* Status cards */}
      <div>
        <SectionLabel>Integration Health</SectionLabel>
        {isLoading ? (
          <div className="text-sm" style={{ color: '#9CA3AF' }}>Loading…</div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {(statuses ?? []).map((s: IntegrationHealth) => (
              <div key={s.name} className="rounded-xl p-5 space-y-2" style={cardStyle}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm" style={{ color: '#1F2937' }}>{s.name}</span>
                    {s.isStub && <StubBadge />}
                  </div>
                  <StatusBadge healthy={s.isHealthy} />
                </div>
                <p className="text-xs" style={{ color: '#6B7280' }}>{s.statusMessage}</p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  Checked {new Date(s.checkedAt).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Probe tools */}
      <div className="grid grid-cols-2 gap-6">
        {/* DAT probe */}
        <div className="rounded-xl p-5 space-y-3" style={cardStyle}>
          <SectionLabel>DAT Rate Probe</SectionLabel>
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Origin</label>
              <input
                style={{ ...inputStyle, width: '100%' }}
                value={datOrigin}
                onChange={(e) => setDatOrigin(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Destination</label>
              <input
                style={{ ...inputStyle, width: '100%' }}
                value={datDest}
                onChange={(e) => setDatDest(e.target.value)}
              />
            </div>
          </div>
          <ProbeButton label="Get Rate" onClick={() => datProbe.mutate()} loading={datProbe.isPending} />
          {datResult && (
            <div
              className="rounded-lg p-3 text-xs space-y-1 font-mono"
              style={{ backgroundColor: '#F9FAFB', color: '#1F2937' }}
            >
              <div><span style={{ color: '#6B7280' }}>Rate:</span> <strong>${datResult.spotRate.toLocaleString()}</strong></div>
              <div><span style={{ color: '#6B7280' }}>Source:</span> {datResult.source}</div>
              <div><span style={{ color: '#6B7280' }}>At:</span> {new Date(datResult.retrievedAt).toLocaleTimeString()}</div>
            </div>
          )}
        </div>

        {/* e2open probe */}
        <div className="rounded-xl p-5 space-y-3" style={cardStyle}>
          <SectionLabel>e2open Push Probe</SectionLabel>
          <p className="text-xs" style={{ color: '#6B7280' }}>
            Sends a synthetic test load (PROBE-0000) to e2open to verify the tendering flow.
          </p>
          <ProbeButton label="Test Push" onClick={() => e2openProbe.mutate()} loading={e2openProbe.isPending} />
          {e2openResult && (
            <div
              className="rounded-lg p-3 text-xs space-y-1 font-mono"
              style={{ backgroundColor: '#F9FAFB', color: '#1F2937' }}
            >
              <div>
                <span style={{ color: '#6B7280' }}>Result:</span>{' '}
                <strong style={{ color: e2openResult.success ? '#16A34A' : '#DC2626' }}>
                  {e2openResult.success ? 'Success' : 'Failed'}
                </strong>
              </div>
              {e2openResult.externalId && (
                <div><span style={{ color: '#6B7280' }}>Order ID:</span> {e2openResult.externalId}</div>
              )}
              <div><span style={{ color: '#6B7280' }}>Message:</span> {e2openResult.message}</div>
            </div>
          )}
        </div>

        {/* IMAP probe */}
        <div className="rounded-xl p-5 space-y-3" style={cardStyle}>
          <SectionLabel>IMAP Load Fetch Probe</SectionLabel>
          <p className="text-xs" style={{ color: '#6B7280' }}>
            Polls the mailbox for pending load-notification emails. Stub returns 0–2 synthetic messages.
          </p>
          <ProbeButton label="Fetch Messages" onClick={() => imapProbe.mutate()} loading={imapProbe.isPending} />
          {imapResult !== null && (
            imapResult.length === 0 ? (
              <p className="text-xs" style={{ color: '#9CA3AF' }}>No pending messages.</p>
            ) : (
              <div className="space-y-2">
                {imapResult.map((m) => (
                  <div
                    key={m.messageId}
                    className="rounded-lg p-3 text-xs"
                    style={{ backgroundColor: '#F9FAFB', color: '#1F2937' }}
                  >
                    <div className="font-medium truncate">{m.subject}</div>
                    <div style={{ color: '#6B7280' }}>{m.origin} → {m.destination}</div>
                    {m.targetRate && (
                      <div style={{ color: '#6B7280' }}>Rate: ${m.targetRate.toLocaleString()}</div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Config export / import */}
        <div className="rounded-xl p-5 space-y-3" style={cardStyle}>
          <SectionLabel>Config Export / Import</SectionLabel>
          <div className="flex items-center gap-3">
            <a
              href={configApi.exportUrl()}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
              style={{ backgroundColor: '#F0FDF4', color: '#16A34A', textDecoration: 'none' }}
            >
              Export Config ↓
            </a>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>
              Import — paste config JSON below
            </label>
            <textarea
              rows={5}
              style={{
                ...inputStyle,
                width: '100%',
                resize: 'vertical',
                fontFamily: 'monospace',
                fontSize: '11px',
              }}
              placeholder={'{\n  "Parameters": {...},\n  "Clients": [...],\n  "Lanes": [...]\n}'}
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
            />
          </div>
          <button
            onClick={() => configImport.mutate()}
            disabled={!importJson.trim() || configImport.isPending}
            className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}
          >
            {configImport.isPending ? 'Importing…' : 'Import Config'}
          </button>
          {importResult && (
            <p
              className="text-xs"
              style={{ color: importResult.startsWith('Error') ? '#DC2626' : '#16A34A' }}
            >
              {importResult}
            </p>
          )}
        </div>
      </div>

      {/* ── Custom / Additional Integrations ─────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Additional Integrations</SectionLabel>
          <button
            onClick={() => setShowAddForm(f => !f)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
            style={{ backgroundColor: '#1D4ED8' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1E40AF')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
          >
            {showAddForm ? '✕ Cancel' : '+ Add Integration'}
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="rounded-xl p-5 mb-4 space-y-4" style={{ ...cardStyle, border: '1px solid #BFDBFE', backgroundColor: '#F8FAFF' }}>
            <div className="text-sm font-semibold" style={{ color: '#1D4ED8' }}>New Integration</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Name *</label>
                <input style={{ ...inputStyle, width: '100%' }} placeholder="e.g. Samsara TMS" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Type *</label>
                <select style={{ ...inputStyle, width: '100%' }} value={newType} onChange={e => setNewType(e.target.value)}>
                  {['REST', 'Webhook', 'SFTP', 'EDI', 'Email', 'Other'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Base URL / Endpoint</label>
                <input style={{ ...inputStyle, width: '100%' }} placeholder="https://api.example.com" value={newUrl} onChange={e => setNewUrl(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>API Key / Token</label>
                <input type="password" style={{ ...inputStyle, width: '100%' }} placeholder="sk-..." value={newKey} onChange={e => setNewKey(e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Notes</label>
                <input style={{ ...inputStyle, width: '100%' }} placeholder="Optional description or contact info" value={newNotes} onChange={e => setNewNotes(e.target.value)} />
              </div>
            </div>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!newName.trim() || !newType || createMutation.isPending}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: '#1D4ED8' }}
            >
              {createMutation.isPending ? 'Saving…' : 'Save Integration'}
            </button>
          </div>
        )}

        {/* Registered integrations table */}
        {customLoading ? (
          <div className="text-sm" style={{ color: '#9CA3AF' }}>Loading…</div>
        ) : !customIntegrations?.length ? (
          <div className="rounded-xl p-8 text-center" style={cardStyle}>
            <div className="text-sm" style={{ color: '#9CA3AF' }}>No custom integrations registered yet. Click <strong>+ Add Integration</strong> to connect a new API or service.</div>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={cardStyle}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  {['Name', 'Type', 'Base URL', 'API Key', 'Notes', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(customIntegrations as IntegrationConfigDto[]).map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: '#1F2937' }}>{c.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>{c.type}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs max-w-48 truncate" style={{ color: '#6B7280' }}>{c.baseUrl || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: '#9CA3AF' }}>{c.apiKeyMasked ?? '—'}</td>
                    <td className="px-4 py-3 text-xs max-w-48 truncate" style={{ color: '#6B7280' }}>{c.notes ?? '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleMutation.mutate(c.id)}
                        className="px-2.5 py-1 rounded-full text-xs font-semibold transition-colors"
                        style={{
                          backgroundColor: c.isActive ? '#F0FDF4' : '#F3F4F6',
                          color: c.isActive ? '#15803D' : '#6B7280',
                        }}
                      >
                        {c.isActive ? '● Active' : '○ Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {deleteConfirm === c.id ? (
                        <span className="flex items-center gap-1 justify-end">
                          <button onClick={() => deleteMutation.mutate(c.id)} className="text-xs font-semibold" style={{ color: '#DC2626' }}>Confirm</button>
                          <span style={{ color: '#D1D5DB' }}>·</span>
                          <button onClick={() => setDeleteConfirm(null)} className="text-xs" style={{ color: '#6B7280' }}>Cancel</button>
                        </span>
                      ) : (
                        <button onClick={() => setDeleteConfirm(c.id)} className="text-xs" style={{ color: '#9CA3AF' }}>Remove</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
