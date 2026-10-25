'use client';

import React from 'react';
import {
  Bell,
  Search,
  Building,
  Calendar,
  Sparkles,
  HelpCircle,
  Play,
  UploadCloud,
  ChevronDown,
  ShieldCheck
} from 'lucide-react';

interface HeaderProps {
  userName: string;
  userRole: string;
  companyName: string;
  companies: any[];
  selectedCompanyId: string;
  onCompanyChange: (id: string) => void;
  onImportClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userName,
  userRole,
  companyName,
  companies,
  selectedCompanyId,
  onCompanyChange,
  onImportClick,
}) => {
  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-7 flex items-center justify-between sticky top-0 z-30 shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-lg font-black text-[#0A192F] tracking-tight">
            Compliance Dashboard
          </h1>
          <div className="text-[10px] text-slate-500 font-semibold tracking-wide flex items-center gap-1.5 -mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Statutory Audit Live View</span>
          </div>
        </div>

        {/* Multi-Tenant Organization Switcher */}
        {userRole === 'PLATFORM_ADMIN' && companies.length > 0 && (
          <div className="flex items-center gap-2 bg-[#F4F8FD] border border-blue-200/60 rounded-xl px-3 py-1.5 text-xs shadow-sm">
            <Building className="w-3.5 h-3.5 text-[#2A62FF]" />
            <span className="font-semibold text-slate-600">Company:</span>
            <select
              value={selectedCompanyId}
              onChange={(e) => onCompanyChange(e.target.value)}
              className="bg-transparent font-bold text-[#0A192F] outline-none cursor-pointer"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>CY 2025-2026 Mandate</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Import CSV Trigger */}
        <button
          onClick={onImportClick}
          className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-[#2A62FF] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1E40AF] text-white text-xs font-bold rounded-xl shadow-[0_4px_12px_rgba(42,98,255,0.25)] hover:shadow-[0_6px_16px_rgba(42,98,255,0.35)] active:scale-95 transition-all"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Import LMS CSV</span>
        </button>

        {/* Video Tutorial */}
        <a
          href="#help"
          className="hidden sm:flex items-center gap-1.5 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Play className="w-3 h-3 text-[#2A62FF] fill-current" />
          <span>Guidance</span>
        </a>

        {/* Notifications */}
        <button className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl relative transition-colors border border-transparent hover:border-slate-200">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-[#2A62FF] rounded-full ring-2 ring-white" />
        </button>

        {/* Account Pill */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0A192F] to-[#1E3A8A] text-white flex items-center justify-center font-bold text-xs ring-2 ring-blue-500/20 shadow-sm">
            {userName ? userName.charAt(0) : 'U'}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-extrabold text-[#0A192F] leading-tight truncate max-w-[140px]">
              {userName}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold truncate max-w-[140px]">
              {companyName}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
