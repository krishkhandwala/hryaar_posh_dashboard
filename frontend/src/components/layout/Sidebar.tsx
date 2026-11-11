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
  workspace?: string;
  permissions?: string[];
  companyName?: string;
  logoUrl?: string | null;
  primaryColor?: string;
  sidebarColor?: string;
  partnerName?: string | null;
  partnerLogoUrl?: string | null;
  coBrandingMode?: string | null;
  onLogout: () => void;
  isSuperAdminSupervision?: boolean;
  onReturnToSuperAdmin?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  userRole = 'COMPANY_ADMIN',
  workspace,
  permissions = [],
  companyName = 'Enterprise Organisation',
  logoUrl,
  primaryColor,
  sidebarColor,
  partnerName,
  partnerLogoUrl,
  coBrandingMode = 'CO_BRANDED',
  onLogout,
  isSuperAdminSupervision = false,
  onReturnToSuperAdmin,
}) => {
  const isWhiteLabel = Boolean(partnerName && coBrandingMode === 'WHITE_LABEL');
  const isCoBranded = Boolean(partnerName && coBrandingMode === 'CO_BRANDED');
  const resolvedSidebarBg = sidebarColor || '#061122';
  const resolvedPrimaryColor = primaryColor || '#2A62FF';
  const displayBrandName = isWhiteLabel ? (partnerName || companyName) : companyName;
  const displayBrandLogo = isWhiteLabel ? (partnerLogoUrl || logoUrl) : logoUrl;
  const canViewGrievances = permissions.includes('ic.grievances.read') || userRole === 'IC_MEMBER';
  const isICWorkspace = workspace === 'IC_WORKSPACE' || userRole === 'IC_MEMBER';

  const navSections = isICWorkspace
    ? [
        {
          group: 'Confidential IC Redressal',
          items: [
            { id: 'complaints', label: 'Complaints Register', icon: ShieldAlert, badge: 'Sec 11' },
            { id: 'ic-members', label: 'Internal Committee', icon: Scale, badge: 'Sec 4' },
            { id: 'compliance', label: 'Compliance Centre', icon: FileCheck2 },
          ],
        },
      ]
    : [
        {
          group: 'HR Compliance Analytics',
          items: [
            { id: 'dashboard', label: 'Dashboard Pulse', icon: LayoutDashboard, badge: 'Live' },
            { id: 'employees', label: 'Employee Audit Roster', icon: Users2 },
          ],
        },
      ];

  return (
    <aside
      className="w-[270px] h-screen text-slate-100 flex flex-col justify-between border-r border-slate-800/80 select-none shrink-0 relative overflow-hidden"
      style={{ backgroundColor: resolvedSidebarBg }}
    >
      <div className="relative z-10 flex flex-col h-full overflow-y-auto">
        {/* Brand Header */}
        <div className="px-6 py-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <CompanyLogo
              name={displayBrandName}
              logoUrl={displayBrandLogo}
              primaryColor={resolvedPrimaryColor}
              size="md"
            />
            <div className="truncate max-w-[165px]">
              <div className="font-bold text-slate-100 text-sm tracking-tight truncate">
                {displayBrandName}
              </div>
              <span className="text-[11px] block font-medium text-slate-400 mt-0.5 truncate">
                {isWhiteLabel
                  ? `${companyName}`
                  : isCoBranded
                  ? `Managed by ${partnerName}`
                  : 'Compliance & Training Portal'}
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
                      style={
                        isActive
                          ? {
                              backgroundColor: `${resolvedPrimaryColor}24`,
                              borderColor: `${resolvedPrimaryColor}55`,
                              color: '#FFFFFF',
                            }
                          : undefined
                      }
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-medium rounded-xl transition-all cursor-pointer border ${
                        isActive
                          ? 'font-semibold'
                          : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className="w-4 h-4 transition-colors"
                          style={isActive ? { color: resolvedPrimaryColor } : undefined}
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
        <div
          className="p-4 border-t border-slate-800/80 space-y-3"
          style={{ backgroundColor: resolvedSidebarBg }}
        >
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
