'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface UploadResult {
  success: boolean;
  total: number;
  created: number;
  skipped: number;
  errors: string[];
}

export default function UploadPage() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Only CSV files are accepted.');
      return;
    }
    setError('');
    setResult(null);
    setUploading(true);
    try {
      const res = await api.uploadCSV(file);
      setResult(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Upload CSV</h1>
        <p className="text-slate-500 mt-1">Bulk import leads from a CSV file</p>
      </div>

      {/* Format guide */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-900 mb-3">Required CSV Format</h2>
        <div className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs font-mono overflow-x-auto">
          name,phone,email,city,vehicle_type,vehicle_count,preferred_channel
          <br />Rajesh Kumar,9876543210,rajesh@mail.com,Delhi,THREE_WHEELER,2,WHATSAPP
          <br />Priya Sharma,8765432109,priya@mail.com,Mumbai,TWO_WHEELER,1,EMAIL
        </div>
        <div className="mt-3 text-sm text-slate-600 space-y-1">
          <div><strong>Required:</strong> name, phone</div>
          <div><strong>vehicle_type:</strong> TWO_WHEELER | THREE_WHEELER | FOUR_WHEELER | HEAVY_VEHICLE</div>
          <div><strong>preferred_channel:</strong> WHATSAPP | EMAIL | CALL | API</div>
        </div>
        <a
          href="/sample.csv"
          download
          className="inline-flex items-center gap-1 mt-3 text-sm text-blue-600 hover:underline"
        >
          ↓ Download sample CSV
        </a>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        {uploading ? (
          <div className="text-blue-600 font-medium">⚙️ Uploading and processing...</div>
        ) : (
          <>
            <div className="text-4xl mb-3">📁</div>
            <div className="font-medium text-slate-700">Drop CSV file here or click to browse</div>
            <div className="text-sm text-slate-400 mt-1">Max 10MB · .csv only</div>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 border-red-200 bg-red-50 text-red-700">
          ❌ {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-4">
            {result.success ? '✅ Upload Complete' : '⚠️ Upload Completed with Errors'}
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900">{result.total}</div>
              <div className="text-xs text-slate-500 mt-1">Total Rows</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{result.created}</div>
              <div className="text-xs text-slate-500 mt-1">Created/Updated</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{result.skipped}</div>
              <div className="text-xs text-slate-500 mt-1">Skipped</div>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-sm font-medium text-red-700 mb-2">Errors:</div>
              <ul className="space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-xs text-red-600">• {e}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-4">
            <Link href="/leads" className="btn-primary">
              View Leads →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
