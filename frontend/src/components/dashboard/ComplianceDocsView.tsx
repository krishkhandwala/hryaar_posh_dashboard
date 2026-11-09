'use client';

import React, { useState } from 'react';
import { 
  FileCheck2, 
  Download, 
  ExternalLink, 
  ShieldCheck, 
  FileText, 
  Calendar, 
  HardDrive,
  FileBadge,
  Sparkles,
  Scale,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { apiClient } from '@/lib/api';

interface ComplianceDocsViewProps {
  documents: Array<{
    id: string;
    title: string;
    doc_type: string;
    file_size_kb: number;
    version: string;
    uploaded_at: string;
  }>;
  companyName: string;
  onOpenQuiz?: () => void;
}

export const ComplianceDocsView: React.FC<ComplianceDocsViewProps> = ({
  documents,
  companyName,
  onOpenQuiz,
}) => {
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const downloadAnnualStatutoryPDF = async () => {
    try {
      setDownloadingPdf(true);
      const res = await apiClient.get('/company/reports/annual-statutory-pdf', {
        responseType: 'blob',
      });
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `POSH_Section21_Annual_Statutory_Report_${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_2026.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      alert('Failed to generate Section 21 PDF report. Please verify backend connectivity.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const downloadDocument = (docTitle: string) => {
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
    const content = `HRYAAR DIGI-POSH OFFICIAL COMPLIANCE DOCUMENT\nOrganization: ${companyName}\nDocument: ${docTitle}\nStatutory Mandate: Sexual Harassment of Women at Workplace Act, 2013\nStatus: Active & Verified by Internal Committee\nTimestamp: ${new Date().toISOString()}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* SECTION 21 ANNUAL STATUTORY PDF REPORT HERO BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-7 border border-indigo-900/60 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full">
                POSH Act Section 21 Mandate
              </span>
              <span className="text-slate-400">&bull;</span>
              <span className="text-xs font-bold text-slate-300">Statutory Return to District Officer</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Official Annual Statutory Compliance Report (PDF)
            </h2>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              Auto-generate and download the verified Section 21 report ready for filing with the District Magistrate / District Officer. Integrates the Internal Committee gazette constitution, complaints redressal table, 90-day SLA compliance, and employee sensitization percentages.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {onOpenQuiz && (
              <button
                onClick={onOpenQuiz}
                className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Award className="w-4 h-4 text-amber-300" />
                <span>Take PoSH Assessment</span>
              </button>
            )}

            <button
              onClick={downloadAnnualStatutoryPDF}
              disabled={downloadingPdf}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-black text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <FileBadge className="w-4 h-4 text-slate-950" />
              <span>{downloadingPdf ? 'Compiling PDF...' : 'Download Official Section 21 PDF'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* POLICY DOCUMENTS REPOSITORY */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#0A192F] tracking-tight">
                Statutory Documents & Filings Repository
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Official PoSH policies, Internal Committee orders, and District Officer annual returns.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200/60 px-3 py-1 rounded-full">
            {documents.length} Active Records
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-purple-300 transition-all flex flex-col justify-between group shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-extrabold uppercase bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                    {doc.doc_type}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    v{doc.version}
                  </span>
                </div>
                <h3 className="font-extrabold text-xs text-[#0A192F] group-hover:text-purple-600 transition-colors line-clamp-2 mb-2 leading-relaxed">
                  {doc.title}
                </h3>
              </div>

              <div className="pt-3 border-t border-slate-200/60 mt-3">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-3">
                  <span className="flex items-center gap-1">
                    <HardDrive className="w-3 h-3 text-slate-400" />
                    <span>{doc.file_size_kb} KB</span>
                  </span>
                  <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                </div>
                <button
                  onClick={() => downloadDocument(doc.title)}
                  className="w-full py-2 bg-white hover:bg-purple-600 hover:text-white border border-slate-200 hover:border-transparent text-slate-700 font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Document</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
