'use client';

import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  GraduationCap,
  Award,
  FileCheck2,
  BarChart3,
  RefreshCw,
  Settings,
  ShieldAlert,
  LogOut,
  ExternalLink
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  userRole?: string;
  companyName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  userRole = 'HR_ADMIN',
  companyName = 'Acme Corporation'
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'organisation', label: 'Organisation Overview', icon: Building2 },
    { id: 'employees', label: 'Employee Management', icon: Users },
    { id: 'training', label: 'Training & Assessment', icon: GraduationCap },
    { id: 'certificates', label: 'Certificates', icon: Award },
    { id: 'compliance', label: 'Documents & Compliance', icon: FileCheck2 },
    { id: 'reports', label: 'Reports & Insights', icon: BarChart3 },
    { id: 'integrations', label: 'Integrations & Imports', icon: RefreshCw },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-[245px] h-screen bg-[#0B1D3A] text-slate-300 flex flex-col justify-between border-r border-[#152A49] select-none flex-shrink-0">
      <div>
        {/* Brand Header */}
        <div className="px-6 py-5 border-b border-[#1A3158]/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#315FD1] to-[#60A5FA] flex items-center justify-center font-black text-white text-base shadow-md">
              H
            </div>
            <div>
              <span className="font-extrabold text-white text-lg tracking-tight">HRYAAR</span>
              <span className="text-[10px] block font-semibold text-blue-400 uppercase tracking-widest -mt-1">Digi-PoSH</span>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-[#1A3158] text-blue-300 px-2 py-0.5 rounded-full uppercase">
            v1.0
          </span>
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#315FD1] text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-[#152A49]/70'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Persistent PoSH Reporting Resource & Footer */}
      <div className="p-3 border-t border-[#1A3158]/60 space-y-3">
        <div className="p-3 bg-[#0D2345] rounded-lg border border-[#1E3A6B] relative overflow-hidden">
          <div className="flex items-center gap-2 mb-1.5 text-amber-400 font-semibold text-xs">
            <ShieldAlert className="w-4 h-4" />
            <span>PoSH IC Channel</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
            Confidential reporting directly to the Internal Committee.
          </p>
          <a
            href="mailto:posh-ic@acmecorp.com"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span>Contact IC Chair</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="pt-1 flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="truncate max-w-[150px]">{companyName}</span>
          <button
            onClick={() => {
              localStorage.removeItem('posh_token');
              window.location.reload();
            }}
            title="Log Out"
            className="p-1 rounded hover:bg-[#152A49] text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
