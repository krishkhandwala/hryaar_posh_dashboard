'use client';

import React from 'react';
import { History, Shield, Terminal, Clock, CheckCircle } from 'lucide-react';

interface AuditTrailViewProps {
  logs: Array<{
    id: string;
    action: string;
    details: string;
    user_email: string;
    created_at: string;
  }>;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ logs }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#0A192F] tracking-tight">
                Statutory Audit Logs & Immutable Event Stream
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Cryptographic, timestamped log of all policy modifications, CSV imports, and user access.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
            Real-Time Stream
          </span>
        </div>

        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-xl border border-slate-200/70 bg-slate-50/50 hover:bg-white transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[10px] uppercase bg-blue-50 text-[#2A62FF] border border-blue-200/70 px-2 py-0.5 rounded">
                    {log.action}
                  </span>
                  <span className="font-semibold text-slate-700">{log.user_email || 'System Daemon'}</span>
                </div>
                <div className="text-slate-600 font-medium">{log.details}</div>
              </div>

              <div className="text-slate-400 font-mono text-[11px] shrink-0 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{new Date(log.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
