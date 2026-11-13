'use client';

import React, { useState } from 'react';
import {
  Bell,
  Calendar,
  UploadCloud,
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Radio,
  X,
  Trash2
} from 'lucide-react';
import { CompanyLogo } from '@/components/brand/CompanyLogo';
import { SecuritySessionsModal } from '@/components/layout/SecuritySessionsModal';
import { useRealtime } from '@/lib/realtime';

interface HeaderProps {
  userName: string;
  userRole: string;
  companyName: string;
  logoUrl?: string | null;
  primaryColor?: string;
  partnerName?: string | null;
  partnerLogoUrl?: string | null;
  coBrandingMode?: string | null;
  onImportClick?: () => void;
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
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const { isConnected, isConnecting, events, unreadCount, markAllRead, clearNotifications } = useRealtime();

  const isWhiteLabel = Boolean(partnerName && coBrandingMode === 'WHITE_LABEL');
  const isCoBranded = Boolean(partnerName && coBrandingMode === 'CO_BRANDED');
  const displayName = isWhiteLabel ? (partnerName || companyName) : companyName;
  const displayLogo = isWhiteLabel ? (partnerLogoUrl || logoUrl) : logoUrl;

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
            name={displayName}
            logoUrl={displayLogo}
            primaryColor={primaryColor}
            size="md"
          />

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                {displayName}
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

              {isWhiteLabel && (
                <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full border border-slate-200">
                  <span>{companyName}</span>
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

        {/* Real-Time SSE Status Pill */}
        <div
          className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            isConnected
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : isConnecting
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
          title={isConnected ? 'Real-Time Server-Sent Events sync connected' : 'Connecting to cluster event stream...'}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? 'bg-emerald-500 animate-pulse'
                : isConnecting
                ? 'bg-amber-500 animate-ping'
                : 'bg-slate-400'
            }`}
          />
          <span>{isConnected ? 'Live Sync Active' : isConnecting ? 'Connecting...' : 'Sync Offline'}</span>
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

        {/* Import CSV Action (Platform Admin Only) */}
        {onImportClick && (
          <button
            onClick={onImportClick}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import CSV</span>
          </button>
        )}

        {/* Security & Active Sessions */}
        <button
          type="button"
          onClick={() => setShowSecurityModal(true)}
          className="p-2.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-xl border border-slate-200/80 transition-colors cursor-pointer"
          title="Account Security & Active Sessions"
          aria-label="Account Security"
        >
          <ShieldCheck className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowNotifications((prev) => !prev);
              if (!showNotifications) markAllRead();
            }}
            className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200/80 transition-colors cursor-pointer relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : isConnected ? (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500" />
            ) : null}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 z-50 space-y-3 text-xs max-h-[480px] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">Cluster Notifications</span>
                  {events.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-[10px]">
                      {events.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {events.length > 0 && (
                    <button
                      type="button"
                      onClick={clearNotifications}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      title="Clear notifications"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto space-y-2 pr-1 flex-1">
                {events.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <Radio className="w-6 h-6 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-xs">No notifications yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Live events from the cluster will stream here.</p>
                  </div>
                ) : (
                  events.slice(0, 15).map((ev) => {
                    const isCert = ev.type === 'ASSESSMENT_PASSED' || ev.type === 'INVOICE_PAID';
                    const isAlert = ev.type.includes('COMPLAINT');
                    const isSync = ev.type.includes('CSV') || ev.type.includes('LMS');

                    return (
                      <div
                        key={ev.id || ev.event_id}
                        className={`p-3 rounded-xl border transition-all ${
                          isCert
                            ? 'bg-emerald-50/60 border-emerald-200/70 text-emerald-950'
                            : isAlert
                            ? 'bg-amber-50/60 border-amber-200/70 text-amber-950'
                            : isSync
                            ? 'bg-indigo-50/60 border-indigo-200/70 text-indigo-950'
                            : 'bg-slate-50 border-slate-200/70 text-slate-900'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="shrink-0 mt-0.5">
                            {isCert && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                            {isAlert && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                            {isSync && <RefreshCw className="w-4 h-4 text-indigo-600" />}
                            {!isCert && !isAlert && !isSync && <Radio className="w-4 h-4 text-blue-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-semibold text-xs truncate">{ev.title}</span>
                              <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{ev.message}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

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

      <SecuritySessionsModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
      />
    </header>
  );
};
