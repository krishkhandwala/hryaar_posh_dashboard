'use client';

import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Users2,
  Award,
  FileCheck2,
  BarChart3,
  RefreshCw,
  Sliders,
  ShieldCheck,
  LogOut,
  ExternalLink,
  BookOpen
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  userRole?: string;
  companyName?: string;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  userRole = 'HR_ADMIN',
  companyName = 'Acme Corporation',
  onLogout
}) => {
  const navSections = [
    {
      group: 'Overview',
      items: [
        { id: 'dashboard', label: 'Executive Pulse', icon: LayoutDashboard, badge: 'Live' },
        { id: 'organisation', label: 'Tenant Profile', icon: Building2 },
      ]
    },
    {
      group: 'Governance & People',
      items: [
        { id: 'employees', label: 'Employee Registry', icon: Users2 },
        { id: 'compliance', label: 'Statutory Filings', icon: FileCheck2 },
      ]
    },
    {
      group: 'Settings & Policy',
      items: [
        { id: 'settings', label: 'Company Settings', icon: Sliders },
        { id: 'audit', label: 'Audit Trail', icon: BarChart3 },
      ]
    }
  ];

  return (
    <aside className="w-[260px] h-screen bg-[#061122] text-slate-300 flex flex-col justify-between border-r border-[#12233D] select-none flex-shrink-0 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-48 h-48 bg-[#2A62FF]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full overflow-y-auto">
        {/* Brand Header */}
        <div className="px-6 py-5 border-b border-[#12233D] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2A62FF] via-[#1D4ED8] to-[#0A2568] flex items-center justify-center font-black text-white text-base shadow-[0_0_20px_rgba(42,98,255,0.4)] border border-blue-400/30">
              H
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white text-[17px] tracking-tight">HRYAAR</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#2A62FF]/20 text-[#60A5FA] border border-blue-500/30">
                  DIGI
                </span>
              </div>
              <span className="text-[10px] block font-medium text-slate-400 tracking-wide">
                PoSH Operating System
              </span>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="p-3.5 space-y-5 flex-1">
          {navSections.map((sec) => (
            <div key={sec.group}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1.5">
                {sec.group}
              </div>
              <div className="space-y-1">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentTab(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group relative cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-[#2A62FF] to-[#1E40AF] text-white shadow-[0_4px_16px_rgba(42,98,255,0.35)]'
                          : 'text-slate-300 hover:text-white hover:bg-[#0E213D]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Persistent PoSH Internal Committee Channel Card */}
        <div className="p-3.5 border-t border-[#12233D] space-y-3">
          <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#0E213D] to-[#0A182E] border border-amber-500/30 relative overflow-hidden shadow-inner">
            <div className="flex items-center gap-2 mb-1.5 text-amber-400 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Statutory IC Channel</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug mb-2 font-normal">
              Direct, encrypted access to the Internal Committee Presiding Officer.
            </p>
            <a
              href="mailto:posh-ic@acmecorp.com"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              <span>File Inquiry / Grievance</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* User & Sign Out Pill */}
          <div className="pt-1 flex items-center justify-between text-xs px-2">
            <div className="truncate max-w-[150px]">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tenant Scope</div>
              <div className="font-bold text-white text-xs truncate">{companyName}</div>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-2 rounded-lg bg-[#0E213D] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all border border-slate-700/50 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
