'use client';

import React from 'react';
import { FileCheck2, Download, ExternalLink, ShieldCheck, FileText, Calendar, HardDrive } from 'lucide-react';
import confetti from 'canvas-confetti';

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
}

export const ComplianceDocsView: React.FC<ComplianceDocsViewProps> = ({
  documents,
  companyName,
}) => {
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
              className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-purple-300 transition-all flex flex-col justify-between group shadow-sm"
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
                  className="w-full py-2 bg-white hover:bg-purple-600 hover:text-white border border-slate-200 hover:border-transparent text-slate-700 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
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
