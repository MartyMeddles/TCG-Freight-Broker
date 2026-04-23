import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  integrationsApi, configApi,
  type IntegrationHealth, type DatSpotRate, type E2openPushResult, type ImapLoadMessage,
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
  const [datOrigin, setDatOrigin] = useState('Chicago, IL');
  const [datDest, setDatDest] = useState('Dallas, TX');
  const [datResult, setDatResult] = useState<DatSpotRate | null>(null);
  const [e2openResult, setE2openResult] = useState<E2openPushResult | null>(null);
  const [imapResult, setImapResult] = useState<ImapLoadMessage[] | null>(null);
  const [importJson, setImportJson] = useState('');
  const [importResult, setImportResult] = useState<string | null>(null);

  const { data: statuses, isLoading } = useQuery({
    queryKey: ['integrations', 'status'],
    queryFn: () => integrationsApi.getStatus(),
    refetchInterval: 60_000,
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
    </div>
  );
}
