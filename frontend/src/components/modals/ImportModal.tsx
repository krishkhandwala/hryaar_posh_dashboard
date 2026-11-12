'use client';

import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, X, FileSpreadsheet } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId?: string;
  companies?: Array<{ id: string; name: string; company_type?: string }>;
  onSuccess: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  companyId,
  companies = [],
  onSuccess,
}) => {
  const clientCompanies = companies.filter((c) => c.company_type !== 'PARTNER');
  const [targetCompanyId, setTargetCompanyId] = useState(
    companyId || clientCompanies[0]?.id || ''
  );
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTargetCompanyId(companyId || clientCompanies[0]?.id || '');
      setResult(null);
      setError(null);
      setFile(null);
    }
  }, [isOpen, companyId]);

  if (!isOpen) return null;

  const handleUpload = async () => {
    if (!file || !targetCompanyId) {
      setError('Please select both a target client organisation and a CSV file.');
      return;
    }
    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient.post(`/import/csv?company_id=${targetCompanyId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to process CSV file.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Platform Data Ingestion
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              Import Leap10x Training Data (CSV)
            </h3>
          </div>
        </div>

        {clientCompanies.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Target Client Organisation
            </label>
            <select
              value={targetCompanyId}
              onChange={(e) => setTargetCompanyId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-400"
            >
              {clientCompanies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Upload Dropzone */}
        <div className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl p-6 text-center transition-colors bg-slate-50/50">
          <UploadCloud className="w-7 h-7 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-800">
            {file ? file.name : 'Select a Leap10x CSV export file'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Columns: employee_code, name, email, department, progress, score
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
            className="mt-3 text-xs text-slate-600 cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:border-0 file:rounded-lg file:text-xs file:font-medium file:bg-slate-900 file:text-white hover:file:bg-slate-800"
          />
        </div>

        {uploading && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-700 animate-pulse" />
            <span>Validating schema and synchronising Leap10x records...</span>
          </div>
        )}

        {result && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Successfully processed {result.successful_rows ?? result.total_rows ?? result.total_records ?? result.processed_count ?? 0} employee records.
            </span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!file || !targetCompanyId || uploading}
            onClick={handleUpload}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-40"
          >
            {uploading ? 'Importing...' : 'Upload & Synchronise'}
          </button>
        </div>
      </div>
    </div>
  );
};
