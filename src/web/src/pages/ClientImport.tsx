import { useState, useRef } from 'react';
import { apiClient } from '../lib/apiClient';

interface ImportResult {
  clientsCreated: number;
  clientsMatched: number;
  lanesCreated: number;
  lanesDuplicated: number;
  errors: string[];
}

interface ApiResult<T> {
  data: T;
  success: boolean;
  error?: string;
}

const TEMPLATE_COLS = ['BillTo', 'ClientRef', 'OriginCity', 'OriginState', 'DestinationCity', 'DestinationState', 'CarrierRate'];
const TEMPLATE_EXAMPLE = [
  ['Performance Food Group', 'PFG', 'Chicago', 'IL', 'Dallas', 'TX', '2100.00'],
  ['Sysco Corporation', 'SYS', 'Memphis', 'TN', 'Atlanta', 'GA', '1800.00'],
];

export default function ClientImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setStatus('idle');
    setResult(null);
    setErrorMsg('');
  }

  async function handleDownloadTemplate() {
    try {
      const resp = await apiClient.get('/import/template', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([resp.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'client-lane-import-template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download template.');
    }
  }

  async function handleImport() {
    if (!file) return;
    setStatus('uploading');
    setResult(null);
    setErrorMsg('');

    const form = new FormData();
    form.append('file', file);

    try {
      const { data } = await apiClient.post<ApiResult<ImportResult>>(
        '/import/clients-lanes',
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      if (data.success) {
        setResult(data.data);
        setStatus('done');
      } else {
        setErrorMsg(data.error ?? 'Import failed.');
        setStatus('error');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Upload failed. Check the file format.';
      setErrorMsg(msg);
      setStatus('error');
    }
  }

  function handleReset() {
    setFile(null);
    setStatus('idle');
    setResult(null);
    setErrorMsg('');
    if (fileRef.current) fileRef.current.value = '';
  }

  const cardStyle = {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  };

  return (
    <div className="p-6 max-w-4xl">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: '#1F2937' }}>Client Import</h1>
        <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>
          Bulk-load new clients and lanes from a CSV file.
        </p>
      </div>

      {/* Step 1 — Download template */}
      <div className="mb-4 p-5" style={cardStyle}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
              <h2 className="text-sm font-semibold" style={{ color: '#1F2937' }}>Download the import template</h2>
            </div>
            <p className="text-sm ml-7" style={{ color: '#6B7280' }}>
              Fill in one row per lane. A client with multiple lanes gets one row each.
            </p>
          </div>
          <button
            onClick={handleDownloadTemplate}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: '#1D4ED8' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1E40AF')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
          >
            ↓ Download Template
          </button>
        </div>

        {/* Column reference table */}
        <div className="mt-4 ml-7 overflow-x-auto rounded-lg" style={{ border: '1px solid #E5E7EB' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                {TEMPLATE_COLS.map(col => (
                  <th key={col} className="px-3 py-2 text-left font-semibold" style={{ color: '#374151' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TEMPLATE_EXAMPLE.map((row, i) => (
                <tr key={i} style={{ borderBottom: i < TEMPLATE_EXAMPLE.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2 font-mono" style={{ color: '#6B7280' }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 ml-7 text-xs" style={{ color: '#9CA3AF' }}>
          <strong style={{ color: '#6B7280' }}>Notes:</strong>{' '}
          BillTo is the client company name. ClientRef is an optional short code (e.g. PFG). CarrierRate is the contracted carrier cost in USD. Duplicate lanes for the same client are skipped automatically.
        </div>
      </div>

      {/* Step 2 — Upload */}
      <div className="p-5" style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
          <h2 className="text-sm font-semibold" style={{ color: '#1F2937' }}>Upload your completed file</h2>
        </div>

        {status === 'done' && result ? (
          <div>
            {/* Success summary */}
            <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: '#F0FDF4', border: '1px solid #86EFAC' }}>
              <div className="text-sm font-semibold mb-2" style={{ color: '#15803D' }}>✓ Import complete</div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm" style={{ color: '#166534' }}>
                <span>Clients created:</span><span className="font-bold">{result.clientsCreated}</span>
                <span>Clients matched (existing):</span><span className="font-bold">{result.clientsMatched}</span>
                <span>Lanes created:</span><span className="font-bold">{result.lanesCreated}</span>
                <span>Lanes skipped (duplicate):</span><span className="font-bold">{result.lanesDuplicated}</span>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A' }}>
                <div className="text-sm font-semibold mb-2" style={{ color: '#B45309' }}>
                  ⚠ {result.errors.length} row{result.errors.length > 1 ? 's' : ''} skipped
                </div>
                <ul className="text-xs space-y-0.5" style={{ color: '#92400E' }}>
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{ backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#E5E7EB')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
            >
              Import another file
            </button>
          </div>
        ) : (
          <div>
            {/* Drop zone */}
            <label
              className="flex flex-col items-center justify-center gap-2 w-full rounded-lg cursor-pointer transition-colors"
              style={{
                border: '2px dashed #D1D5DB',
                backgroundColor: file ? '#F0FDF4' : '#F9FAFB',
                minHeight: '120px',
              }}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#1D4ED8'; }}
              onDragLeave={e => { e.currentTarget.style.borderColor = '#D1D5DB'; }}
              onDrop={e => {
                e.preventDefault();
                e.currentTarget.style.borderColor = '#D1D5DB';
                const f = e.dataTransfer.files?.[0];
                if (f) { setFile(f); setStatus('idle'); setResult(null); setErrorMsg(''); }
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
              {file ? (
                <>
                  <span className="text-2xl">📄</span>
                  <span className="text-sm font-medium" style={{ color: '#15803D' }}>{file.name}</span>
                  <span className="text-xs" style={{ color: '#6B7280' }}>{(file.size / 1024).toFixed(1)} KB · Click to change</span>
                </>
              ) : (
                <>
                  <span className="text-2xl">📂</span>
                  <span className="text-sm font-medium" style={{ color: '#374151' }}>Click to select or drag & drop a CSV file</span>
                  <span className="text-xs" style={{ color: '#9CA3AF' }}>Max 5 MB · .csv only</span>
                </>
              )}
            </label>

            {status === 'error' && (
              <div className="mt-3 rounded-lg px-4 py-3 text-sm" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' }}>
                ✗ {errorMsg}
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleImport}
                disabled={!file || status === 'uploading'}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#1D4ED8' }}
                onMouseEnter={e => { if (file && status !== 'uploading') (e.currentTarget.style.backgroundColor = '#1E40AF'); }}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
              >
                {status === 'uploading' ? (
                  <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" /> Importing…</>
                ) : (
                  '↑ Import File'
                )}
              </button>
              {file && status !== 'uploading' && (
                <button
                  onClick={handleReset}
                  className="text-sm font-medium"
                  style={{ color: '#6B7280' }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
