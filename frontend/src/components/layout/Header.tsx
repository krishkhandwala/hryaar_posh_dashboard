'use client';

import React from 'react';
import {
  Bell,
  Calendar,
  UploadCloud,
  ArrowLeft,
  ShieldAlert,
  Shield,
  Building
} from 'lucide-react';
import { CompanyLogo } from '@/components/brand/CompanyLogo';

interface HeaderProps {
  userName: string;
  userRole: string;
  companyName: string;
  logoUrl?: string | null;
  primaryColor?: string;
  partnerName?: string | null;
  partnerLogoUrl?: string | null;
  coBrandingMode?: string | null;
  onImportClick: () => void;
  isSuperAdminSupervision?: boolean;
  onReturnToSuperAdmin?: () => void;
  onNavigateToComplaints?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userName,
  userRole,
  companyName,
  logoUrl,
  primaryColor,
  partnerName,
  partnerLogoUrl,
  coBrandingMode = 'CO_BRANDED',
  onImportClick,
  isSuperAdminSupervision = false,
  onReturnToSuperAdmin,
  onNavigateToComplaints,
}) => {
  const isCoBranded = partnerName && coBrandingMode === 'CO_BRANDED';

  return (
    <header className="h-18 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-30 select-none shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-5">
        {/* Super Admin Supervision Exit */}
        {isSuperAdminSupervision && onReturnToSuperAdmin && (
          <button
            onClick={onReturnToSuperAdmin}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Hub</span>
          </button>
        )}

        <div className="flex items-center gap-3">
          <CompanyLogo
            name={companyName}
            logoUrl={logoUrl}
            primaryColor={primaryColor}
            size="md"
          />

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                {companyName}
              </h1>

              {/* Co-Branded Partner Pill */}
              {isCoBranded && (
                <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-800 text-xs font-semibold rounded-full border border-teal-200/70">
                  <CompanyLogo
                    name={partnerName || 'Partner'}
                    logoUrl={partnerLogoUrl}
                    size="xs"
                    showBorder={false}
                  />
                  <span>Managed by {partnerName}</span>
                </span>
              )}
            </div>

            <div className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Statutory PoSH Compliance & Audit System</span>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-medium">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>CY 2025–2026 Mandate</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* PoSH IC Hotline */}
        {onNavigateToComplaints && (
          <button
            onClick={onNavigateToComplaints}
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 text-xs font-semibold rounded-xl transition-all cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>IC Register</span>
          </button>
        )}

        {/* Import CSV Action */}
        <button
          onClick={onImportClick}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Import CSV</span>
        </button>

        {/* Notifications */}
        <button
          className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200/80 transition-colors cursor-pointer relative"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600" />
        </button>

        {/* User Account Tile */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
            {userName ? userName.charAt(0).toUpperCase() : 'H'}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[140px]">
              {userName}
            </div>
            <div className="text-[11px] font-medium text-slate-500 mt-0.5">
              {userRole === 'COMPANY_ADMIN' ? 'HR Administrator' : userRole.replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
