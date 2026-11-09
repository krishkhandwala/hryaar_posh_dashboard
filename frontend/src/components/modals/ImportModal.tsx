'use client';

import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, X, FileSpreadsheet } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  onSuccess: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  companyId,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient.post(`/import/csv?company_id=${companyId}`, formData, {
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              Roster Ingestion
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Import Training Data (CSV / LMS)
            </h3>
          </div>
        </div>

        {/* Upload Dropzone */}
        <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-6 text-center transition-colors bg-slate-50/50">
          <UploadCloud className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800">
            {file ? file.name : 'Select or drag your CSV roster file here'}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Accepts: employee_code, email, training_progress, score, department
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
            className="mt-3 text-xs text-slate-600 cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:border-0 file:rounded-lg file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {uploading && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-semibold text-blue-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>Validating schema and importing records...</span>
          </div>
        )}

        {result && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Successfully updated {result.total_records || result.processed_count} employee records.</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            disabled={!file || uploading}
            onClick={handleUpload}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-40"
          >
            {uploading ? 'Processing...' : 'Upload & Synchronize'}
          </button>
        </div>
      </div>
    </div>
  );
};
