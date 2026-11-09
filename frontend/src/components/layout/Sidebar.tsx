'use client';

import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Users2,
  Award,
  FileCheck2,
  BarChart3,
  Sliders,
  LogOut,
  ExternalLink,
  Scale,
  ShieldAlert,
  Palette,
  ArrowLeft,
  Webhook,
  Shield
} from 'lucide-react';
import { CompanyLogo } from '@/components/brand/CompanyLogo';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  userRole?: string;
  companyName?: string;
  logoUrl?: string | null;
  primaryColor?: string;
  sidebarColor?: string;
  partnerName?: string | null;
  coBrandingMode?: string | null;
  onLogout: () => void;
  isSuperAdminSupervision?: boolean;
  onReturnToSuperAdmin?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  userRole = 'COMPANY_ADMIN',
  companyName = 'Acme Corporation',
  logoUrl,
  primaryColor,
  sidebarColor,
  partnerName,
  coBrandingMode = 'CO_BRANDED',
  onLogout,
  isSuperAdminSupervision = false,
  onReturnToSuperAdmin,
}) => {
  const isCoBranded = partnerName && coBrandingMode === 'CO_BRANDED';

  const navSections = [
    {
      group: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard Pulse', icon: LayoutDashboard, badge: 'Live' },
        { id: 'organisation', label: 'Company Profile', icon: Building2 },
      ],
    },
    {
      group: 'Statutory Redressal',
      items: [
        { id: 'complaints', label: 'Complaints Register', icon: ShieldAlert, badge: 'Sec 11' },
        { id: 'ic-members', label: 'Internal Committee', icon: Scale, badge: 'Sec 4' },
      ],
    },
    {
      group: 'People & Compliance',
      items: [
        { id: 'employees', label: 'Employee Registry', icon: Users2 },
        { id: 'compliance', label: 'Statutory Filings', icon: FileCheck2 },
        { id: 'integrations', label: 'LMS Webhooks', icon: Webhook, badge: 'API' },
        { id: 'quiz', label: 'Mandatory Quiz', icon: Award, badge: 'Cert' },
      ],
    },
    {
      group: 'Policy & Governance',
      items: [
        { id: 'branding', label: 'Branding & Theme', icon: Palette },
        { id: 'settings', label: 'Compliance Rules', icon: Sliders },
        { id: 'audit', label: 'Audit Trail', icon: BarChart3 },
      ],
    },
  ];

  return (
    <aside className="w-[270px] h-screen bg-[#061122] text-slate-100 flex flex-col justify-between border-r border-slate-800 select-none shrink-0 relative overflow-hidden">
      <div className="relative z-10 flex flex-col h-full overflow-y-auto">
        {/* Brand Header */}
        <div className="px-6 py-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <CompanyLogo
              name={companyName}
              logoUrl={logoUrl}
              primaryColor={primaryColor}
              size="md"
            />
            <div className="truncate max-w-[165px]">
              <div className="font-bold text-slate-100 text-sm tracking-tight truncate">
                {companyName}
              </div>
              <span className="text-[11px] block font-medium text-slate-400 mt-0.5 truncate">
                {isCoBranded ? `Managed by ${partnerName}` : 'PoSH Operating System'}
              </span>
            </div>
          </div>
        </div>

        {/* Supervision Banner */}
        {isSuperAdminSupervision && (
          <div className="mx-4 mt-3 p-3 bg-blue-950/70 border border-blue-500/40 rounded-xl text-white text-xs flex items-center justify-between shadow-xs">
            <span className="text-[11px] font-semibold text-blue-300">
              Admin Inspection Mode
            </span>
            {onReturnToSuperAdmin && (
              <button
                onClick={onReturnToSuperAdmin}
                className="text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1 rounded-lg cursor-pointer flex items-center gap-1 shadow-xs transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Exit</span>
              </button>
            )}
          </div>
        )}

        {/* Navigation list */}
        <nav className="p-4 space-y-5 flex-1">
          {navSections.map((sec) => (
            <div key={sec.group}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
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
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-medium rounded-xl transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`w-4 h-4 transition-colors ${
                            isActive ? 'text-blue-400' : 'text-slate-400'
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-blue-500/30 text-blue-200 border border-blue-400/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Statutory IC Channel & Sign-out */}
        <div className="p-4 border-t border-slate-800/80 space-y-3 bg-[#061122]">
          <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 mb-1 text-slate-200 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Statutory IC Channel</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-2 font-normal">
              Confidential, encrypted statutory channel to Presiding Officer.
            </p>
            <button
              onClick={() => setCurrentTab('complaints')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
            >
              <span>File Inquiry</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* User Sign Out */}
          <div className="pt-2 flex items-center justify-between text-xs px-1 border-t border-slate-800">
            <div className="truncate max-w-[170px]">
              <div className="text-[10px] uppercase font-bold text-slate-500">
                Organization
              </div>
              <div className="text-slate-200 text-xs font-medium truncate">
                {companyName}
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
