'use client';

import React from 'react';
import {
  Bell,
  Search,
  ChevronDown,
  Building,
  Calendar,
  Sparkles,
  HelpCircle,
  Play
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
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-[#0D2345] tracking-tight">
          Dashboard
        </h1>

        {/* Multi-Tenant Organization Switcher */}
        {userRole === 'PLATFORM_ADMIN' && companies.length > 0 && (
          <div className="flex items-center gap-2 bg-[#F4F8FD] border border-blue-200/60 rounded-lg px-2.5 py-1 text-xs">
            <Building className="w-3.5 h-3.5 text-[#315FD1]" />
            <span className="font-semibold text-slate-600">Company:</span>
            <select
              value={selectedCompanyId}
              onChange={(e) => onCompanyChange(e.target.value)}
              className="bg-transparent font-bold text-[#0D2345] outline-none cursor-pointer"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-slate-100/80 rounded-md text-xs text-slate-600">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>CY 2025-2026 Mandate</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Action Button */}
        <button
          onClick={onImportClick}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#315FD1] hover:bg-[#254cb2] text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
        >
          <span>Import CSV Data</span>
        </button>

        {/* Watch Tutorial / Guidance */}
        <a
          href="#help"
          className="hidden sm:flex items-center gap-1.5 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Play className="w-3 h-3 text-[#315FD1] fill-current" />
          <span>Watch Tutorial</span>
        </a>

        {/* Notifications */}
        <button className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full" />
        </button>

        {/* User Account Capsule */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs ring-2 ring-blue-500/20">
            {userName ? userName.charAt(0) : 'U'}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-[#0D2345] leading-tight truncate max-w-[140px]">
              {userName}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              {companyName}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
