'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users2,
  Award,
  TrendingUp,
  ShieldCheck,
  Plus,
  Search,
  ExternalLink,
  RefreshCw,
  LogOut,
  Palette,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Layers,
  ArrowRight,
  Shield,
  CreditCard,
  Eye,
  X
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { CompanyLogo } from '@/components/brand/CompanyLogo';

interface PartnerDashboardProps {
  user: any;
  onLogout: () => void;
  onInspectClient: (companyId: string) => void;
}

export const PartnerDashboard: React.FC<PartnerDashboardProps> = ({
  user,
  onLogout,
  onInspectClient,
}) => {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientSearch, setClientSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'clients' | 'branding' | 'hierarchy'>('clients');

  // Onboard Client Modal
  const [isOnboardOpen, setIsOnboardOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientIndustry, setNewClientIndustry] = useState('Enterprise Technology');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientAdminEmail, setNewClientAdminEmail] = useState('');
  const [newClientAdminPassword, setNewClientAdminPassword] = useState('Acme@1234');
  const [newClientQuota, setNewClientQuota] = useState<number>(500);
  const [newClientPrimaryColor, setNewClientPrimaryColor] = useState('#2A62FF');
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [onboardError, setOnboardError] = useState<string | null>(null);

  // Seat Allocation Modal
  const [selectedClientForQuota, setSelectedClientForQuota] = useState<any>(null);
  const [updatedQuota, setUpdatedQuota] = useState<number>(1000);
  const [quotaLoading, setQuotaLoading] = useState(false);

  // Partner Branding Form State
  const [partnerLogoUrl, setPartnerLogoUrl] = useState('');
  const [partnerPrimaryColor, setPartnerPrimaryColor] = useState('#2A62FF');
  const [coBrandingMode, setCoBrandingMode] = useState('CO_BRANDED');
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingSuccess, setBrandingSuccess] = useState(false);

  const fetchPartnerData = async () => {
    setLoading(true);
    try {
      const [overviewRes, clientsRes] = await Promise.all([
        apiClient.get('/partner/overview'),
        apiClient.get('/partner/clients'),
      ]);
      setPortfolio(overviewRes.data);
      setClients(clientsRes.data);

      setPartnerLogoUrl(overviewRes.data.partner_logo_url || '');
      setPartnerPrimaryColor(overviewRes.data.primary_color || '#2A62FF');
      setCoBrandingMode(overviewRes.data.co_branding_mode || 'CO_BRANDED');
    } catch (err) {
      console.error('Failed to load partner portfolio:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartnerData();
  }, []);

  const handleOnboardClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardLoading(true);
    setOnboardError(null);
    try {
      await apiClient.post('/partner/clients', {
        name: newClientName,
        industry: newClientIndustry,
        contact_email: newClientEmail || newClientAdminEmail,
        admin_email: newClientAdminEmail,
        admin_password: newClientAdminPassword,
        assigned_quota: Number(newClientQuota),
        primary_color: newClientPrimaryColor,
      });

      setIsOnboardOpen(false);
      setNewClientName('');
      setNewClientAdminEmail('');
      fetchPartnerData();
    } catch (err: any) {
      setOnboardError(err.response?.data?.detail || 'Failed to onboard client');
    } finally {
      setOnboardLoading(false);
    }
  };

  const handleAllocateSeats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientForQuota) return;
    setQuotaLoading(true);
    try {
      await apiClient.post(`/partner/clients/${selectedClientForQuota.id}/allocate-seats`, {
        seat_quota: Number(updatedQuota),
      });
      setSelectedClientForQuota(null);
      fetchPartnerData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update seats');
    } finally {
      setQuotaLoading(false);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setBrandingSaving(true);
    setBrandingSuccess(false);
    try {
      await apiClient.patch('/partner/branding', {
        logo_url: partnerLogoUrl,
        primary_color: partnerPrimaryColor,
        co_branding_mode: coBrandingMode,
      });
      setBrandingSuccess(true);
      fetchPartnerData();
      setTimeout(() => setBrandingSuccess(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save partner branding');
    } finally {
      setBrandingSaving(false);
    }
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.slug.toLowerCase().includes(clientSearch.toLowerCase()) ||
      (c.industry && c.industry.toLowerCase().includes(clientSearch.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="h-18 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-4">
          <CompanyLogo
            name={portfolio?.partner_name || 'Middleman Partner Console'}
            slug={user?.company_slug || 'talentpro'}
            logoUrl={portfolio?.partner_logo_url || partnerLogoUrl}
            primaryColor={partnerPrimaryColor}
            size="md"
          />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                {portfolio?.partner_name || 'Middleman Partner Console'}
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
                Level 1 Assigner
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Mutual Exclusivity Enforced &bull; Client Portfolio & Wholesale Quota Hub
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchPartnerData}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200/80 transition-colors cursor-pointer"
            title="Refresh Portfolio"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center shadow-xs">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'P'}
            </div>
            <div className="hidden sm:block text-left text-xs">
              <div className="font-bold text-slate-900 leading-tight truncate max-w-[150px]">
                {user?.full_name || 'Partner Lead'}
              </div>
              <div className="text-[11px] font-medium text-amber-600">
                Reseller Principal
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200/80 transition-colors ml-1 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="p-8 max-w-7xl w-full mx-auto space-y-7 flex-1">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/80 pb-4 gap-4">
          <div className="flex items-center bg-slate-200/60 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('clients')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'clients'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Assigned Clients ({clients.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('branding')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'branding'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Co-Branding Modes</span>
            </button>

            <button
              onClick={() => setActiveTab('hierarchy')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'hierarchy'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3-Tier Architecture Map</span>
            </button>
          </div>

          <button
            onClick={() => setIsOnboardOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard Client Enterprise</span>
          </button>
        </div>

        {/* 1. SEAT ALLOCATION & PORTFOLIO KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Wholesale Capacity */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Wholesale Capacity
            </span>
            <div className="text-3xl font-extrabold text-slate-900 mono-numeric">
              {(portfolio?.partner_capacity || 5000).toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 font-medium">Purchased pool from Platform Creator</div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="bg-blue-600 h-full w-full rounded-full" />
            </div>
          </div>

          {/* Card 2: Allocated Seats */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Assigned to Clients
            </span>
            <div className="text-3xl font-extrabold text-amber-600 mono-numeric">
              {(portfolio?.total_seats_allocated || 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Distributed across {portfolio?.total_clients || 0} organizations
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${
                    portfolio?.partner_capacity
                      ? Math.min(
                          100,
                          Math.round(
                            ((portfolio.total_seats_allocated || 0) / portfolio.partner_capacity) * 100
                          )
                        )
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Card 3: Remaining Inventory */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Unassigned Capacity
            </span>
            <div className="text-3xl font-extrabold text-emerald-600 mono-numeric">
              {(portfolio?.remaining_seats || 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 font-medium">Available for client expansions</div>
            <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5 pt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Inventory Ready</span>
            </div>
          </div>

          {/* Card 4: Active Learners */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Enrolled Learners
            </span>
            <div className="text-3xl font-extrabold text-slate-900 mono-numeric">
              {(portfolio?.total_learners_managed || 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              {portfolio?.avg_completion_rate_pct || 0}% Portfolio Completion
            </div>
            <div className="text-xs font-semibold text-blue-600 flex items-center gap-1.5 pt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Client HR Monitored</span>
            </div>
          </div>
        </div>

        {/* TAB 1: MUTUALLY EXCLUSIVE CLIENT PORTFOLIO */}
        {activeTab === 'clients' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Filter clients by name or industry..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="h-10 w-full pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              <div className="text-xs text-slate-600 font-medium flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Mutual Exclusivity Enforced: Other middlemen have zero visibility into your clients.</span>
              </div>
            </div>

            {/* Clients Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClients.map((client) => {
                const quota = client.assigned_quota || 1000;
                const totalEmps = client.total_employees || 0;
                const quotaUsagePct = Math.round((totalEmps / quota) * 100);

                return (
                  <div
                    key={client.id}
                    className="bg-white rounded-2xl border border-slate-200/80 hover:border-blue-400/60 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-5"
                  >
                    <div>
                      {/* Client Header */}
                      <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <CompanyLogo
                            name={client.name}
                            slug={client.slug}
                            logoUrl={client.logo_url}
                            primaryColor={client.primary_color}
                            size="md"
                          />
                          <div>
                            <h3 className="font-bold text-slate-900 leading-snug">
                              {client.name}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">{client.industry}</p>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          Active
                        </span>
                      </div>

                      {/* Compliance Stats */}
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            Completion
                          </span>
                          <span className="text-lg font-bold text-slate-900 mono-numeric">
                            {client.completion_rate_pct}%
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            Assessment Pass
                          </span>
                          <span className="text-lg font-bold text-blue-600 mono-numeric">
                            {client.assessment_success_pct}%
                          </span>
                        </div>
                      </div>

                      {/* Quota Progress */}
                      <div className="mt-4 space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                          <span>Assigned Quota:</span>
                          <span className="font-semibold text-slate-900">
                            {totalEmps} / {quota} Seats ({quotaUsagePct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, quotaUsagePct)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClientForQuota(client);
                          setUpdatedQuota(client.assigned_quota || 1000);
                        }}
                        className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                      >
                        Adjust Seats
                      </button>

                      <button
                        type="button"
                        onClick={() => onInspectClient(client.id)}
                        className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Open HR Portal</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: RESELLER BRANDING & CO-BRANDING MODES */}
        {activeTab === 'branding' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 max-w-3xl mx-auto space-y-6 shadow-xs">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Middleman Reseller Branding & Co-Branding Modes
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                Control how your reseller identity appears on the dashboards of your assigned client companies.
              </p>
            </div>

            <form onSubmit={handleSaveBranding} className="space-y-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Partner Brand Name
                </label>
                <input
                  type="text"
                  disabled
                  value={portfolio?.partner_name || ''}
                  className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Partner Logo URL
                  </label>
                  <input
                    type="url"
                    value={partnerLogoUrl}
                    onChange={(e) => setPartnerLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Partner Accent Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={partnerPrimaryColor}
                      onChange={(e) => setPartnerPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={partnerPrimaryColor}
                      onChange={(e) => setPartnerPrimaryColor(e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Co-Branding Modes */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Client Dashboard Co-Branding Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Mode 1 */}
                  <label
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      coBrandingMode === 'CO_BRANDED'
                        ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="coBranding"
                      value="CO_BRANDED"
                      checked={coBrandingMode === 'CO_BRANDED'}
                      onChange={(e) => setCoBrandingMode(e.target.value)}
                      className="sr-only"
                    />
                    <div className="font-bold text-sm text-slate-900">Co-Branded (Default)</div>
                    <div className="text-xs text-slate-500 mt-1 leading-snug">
                      Shows Client Logo + &ldquo;Managed by {portfolio?.partner_name || 'Partner'}&rdquo; badge.
                    </div>
                  </label>

                  {/* Mode 2 */}
                  <label
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      coBrandingMode === 'WHITE_LABEL'
                        ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="coBranding"
                      value="WHITE_LABEL"
                      checked={coBrandingMode === 'WHITE_LABEL'}
                      onChange={(e) => setCoBrandingMode(e.target.value)}
                      className="sr-only"
                    />
                    <div className="font-bold text-sm text-slate-900">Partner White-Label</div>
                    <div className="text-xs text-slate-500 mt-1 leading-snug">
                      Platform appears completely branded under your Partner advisory firm.
                    </div>
                  </label>

                  {/* Mode 3 */}
                  <label
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      coBrandingMode === 'CLIENT_ONLY'
                        ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="coBranding"
                      value="CLIENT_ONLY"
                      checked={coBrandingMode === 'CLIENT_ONLY'}
                      onChange={(e) => setCoBrandingMode(e.target.value)}
                      className="sr-only"
                    />
                    <div className="font-bold text-sm text-slate-900">Client-Only (Pure)</div>
                    <div className="text-xs text-slate-500 mt-1 leading-snug">
                      Partner is completely invisible; only Client enterprise branding is shown.
                    </div>
                  </label>
                </div>
              </div>

              {brandingSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Branding preferences and co-branding mode successfully updated!</span>
                </div>
              )}

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={brandingSaving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {brandingSaving ? 'Saving Changes...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: TIERED ARCHITECTURE MAP */}
        {activeTab === 'hierarchy' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 space-y-6 shadow-xs">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                The 3-Tier Multi-Tenant Architecture
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                Platform Creator, Middlemen Assigners, Client Enterprises, and HR Users.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              {/* Level 0 */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                  Level 0: Creator
                </span>
                <div className="font-bold text-slate-900 text-base">Platform Owner</div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Sells wholesale seat pools to Middlemen or directly to clients. Maintains platform databases.
                </p>
                <div className="text-xs font-bold text-blue-700 pt-2 border-t border-slate-200">
                  Role: SUPER_ADMIN
                </div>
              </div>

              {/* Level 1 */}
              <div className="p-5 bg-gradient-to-tr from-slate-900 to-[#0A192F] text-white rounded-2xl border border-slate-800 shadow-md space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Level 1: Middleman
                </span>
                <div className="font-bold text-white text-base">The Assigner (You)</div>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  Mutually exclusive reseller. Buys wholesale seats and assigns quotas to own clients.
                </p>
                <div className="text-xs font-bold text-amber-300 pt-2 border-t border-slate-800">
                  Role: PARTNER_ADMIN
                </div>
              </div>

              {/* Level 2 */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  Level 2: Client
                </span>
                <div className="font-bold text-slate-900 text-base">Corporate Enterprise</div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Organization where employees take training. Co-branded with your advisory firm.
                </p>
                <div className="text-xs font-bold text-emerald-700 pt-2 border-t border-slate-200">
                  Tenant: Isolated Unit
                </div>
              </div>

              {/* Level 3 */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600">
                  Level 3: Users
                </span>
                <div className="font-bold text-slate-900 text-base">HR Professionals</div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  All users are HR administrators tracking compliance, webinars, and audit rosters.
                </p>
                <div className="text-xs font-bold text-violet-700 pt-2 border-t border-slate-200">
                  Role: COMPANY_ADMIN
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Onboard Client Modal */}
      {isOnboardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">
                Onboard New Client Organization
              </h3>
              <button
                onClick={() => setIsOnboardOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOnboardClient} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g. Zenith Financial"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Industry
                  </label>
                  <input
                    type="text"
                    value={newClientIndustry}
                    onChange={(e) => setNewClientIndustry(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Seat Quota
                  </label>
                  <input
                    type="number"
                    required
                    min={10}
                    max={portfolio?.remaining_seats || 5000}
                    value={newClientQuota}
                    onChange={(e) => setNewClientQuota(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  HR Administrator Email
                </label>
                <input
                  type="email"
                  required
                  value={newClientAdminEmail}
                  onChange={(e) => setNewClientAdminEmail(e.target.value)}
                  placeholder="hr-lead@zenith.com"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Password
                </label>
                <input
                  type="text"
                  required
                  value={newClientAdminPassword}
                  onChange={(e) => setNewClientAdminPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono"
                />
              </div>

              {onboardError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800">
                  {onboardError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOnboardOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={onboardLoading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {onboardLoading ? 'Provisioning...' : 'Provision Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Seat Quota Modal */}
      {selectedClientForQuota && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                Adjust Seats: {selectedClientForQuota.name}
              </h3>
              <button
                onClick={() => setSelectedClientForQuota(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAllocateSeats} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Seat Allowance
                </label>
                <input
                  type="number"
                  min={selectedClientForQuota.total_employees || 10}
                  value={updatedQuota}
                  onChange={(e) => setUpdatedQuota(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono"
                />
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Enrolled learners: {selectedClientForQuota.total_employees || 0}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedClientForQuota(null)}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quotaLoading}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {quotaLoading ? 'Updating...' : 'Save Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
