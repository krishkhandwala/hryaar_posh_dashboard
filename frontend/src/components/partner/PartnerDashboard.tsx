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
  X,
  UploadCloud
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

  // Assign HR User Modal
  const [selectedClientForUser, setSelectedClientForUser] = useState<any>(null);
  const [assignUserName, setAssignUserName] = useState('');
  const [assignUserEmail, setAssignUserEmail] = useState('');
  const [assignUserPassword, setAssignUserPassword] = useState('Client@1234');
  const [assignUserRole, setAssignUserRole] = useState('COMPANY_ADMIN');
  const [assignUserLoading, setAssignUserLoading] = useState(false);
  const [assignUserError, setAssignUserError] = useState<string | null>(null);

  // Partner Branding Form State
  const [partnerLogoUrl, setPartnerLogoUrl] = useState('');
  const [partnerPrimaryColor, setPartnerPrimaryColor] = useState('#2A62FF');
  const [partnerSidebarColor, setPartnerSidebarColor] = useState('#061122');
  const [partnerAccentColor, setPartnerAccentColor] = useState('#F59E0B');
  const [coBrandingMode, setCoBrandingMode] = useState('CO_BRANDED');
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingSuccess, setBrandingSuccess] = useState(false);
  const [partnerLogoUploading, setPartnerLogoUploading] = useState(false);

  // Per-Client Branding Modal State
  const [selectedClientForBranding, setSelectedClientForBranding] = useState<any>(null);
  const [clientBrandLogoUrl, setClientBrandLogoUrl] = useState('');
  const [clientBrandPrimary, setClientBrandPrimary] = useState('#2A62FF');
  const [clientBrandSidebar, setClientBrandSidebar] = useState('#061122');
  const [clientBrandAccent, setClientBrandAccent] = useState('#F59E0B');
  const [clientBrandMode, setClientBrandMode] = useState('CO_BRANDED');
  const [clientBrandWelcome, setClientBrandWelcome] = useState('');
  const [clientBrandSaving, setClientBrandSaving] = useState(false);
  const [clientLogoUploading, setClientLogoUploading] = useState(false);

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
      setPartnerSidebarColor(overviewRes.data.sidebar_color || '#061122');
      setPartnerAccentColor(overviewRes.data.accent_color || '#F59E0B');
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
        assigned_seat_quota: Number(newClientQuota),
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

  const handleAssignUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientForUser) return;
    setAssignUserLoading(true);
    setAssignUserError(null);
    try {
      await apiClient.post(`/partner/clients/${selectedClientForUser.id}/users`, {
        full_name: assignUserName,
        email: assignUserEmail,
        password: assignUserPassword,
        role: assignUserRole,
      });
      setSelectedClientForUser(null);
      setAssignUserName('');
      setAssignUserEmail('');
      fetchPartnerData();
    } catch (err: any) {
      setAssignUserError(err.response?.data?.detail || 'Failed to assign user');
    } finally {
      setAssignUserLoading(false);
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
        sidebar_color: partnerSidebarColor,
        accent_color: partnerAccentColor,
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

  const handlePartnerLogoUpload = async (file: File) => {
    setPartnerLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/partner/branding/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPartnerLogoUrl(res.data.logo_url);
      fetchPartnerData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to upload partner logo');
    } finally {
      setPartnerLogoUploading(false);
    }
  };

  const openClientBrandingModal = (client: any) => {
    setSelectedClientForBranding(client);
    setClientBrandLogoUrl(client.logo_url || '');
    setClientBrandPrimary(client.primary_color || '#2A62FF');
    setClientBrandSidebar(client.sidebar_color || '#061122');
    setClientBrandAccent(client.accent_color || '#F59E0B');
    setClientBrandMode(client.co_branding_mode || coBrandingMode || 'CO_BRANDED');
    setClientBrandWelcome(client.welcome_message || `Welcome to ${client.name} PoSH Compliance Portal`);
  };

  const handleSaveClientBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientForBranding) return;
    setClientBrandSaving(true);
    try {
      await apiClient.put(`/partner/clients/${selectedClientForBranding.id}/branding`, {
        logo_url: clientBrandLogoUrl,
        primary_color: clientBrandPrimary,
        sidebar_color: clientBrandSidebar,
        accent_color: clientBrandAccent,
        co_branding_mode: clientBrandMode,
        welcome_message: clientBrandWelcome,
      });
      setSelectedClientForBranding(null);
      fetchPartnerData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save client branding');
    } finally {
      setClientBrandSaving(false);
    }
  };

  const handleClientLogoUpload = async (file: File) => {
    if (!selectedClientForBranding) return;
    setClientLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post(
        `/partner/clients/${selectedClientForBranding.id}/branding/logo`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setClientBrandLogoUrl(res.data.logo_url);
      fetchPartnerData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to upload client logo');
    } finally {
      setClientLogoUploading(false);
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
            name={portfolio?.partner_name || 'Organisation Workspace'}
            slug={user?.company_slug || 'talentpro'}
            logoUrl={portfolio?.partner_logo_url || partnerLogoUrl}
            primaryColor={partnerPrimaryColor}
            size="md"
          />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                {portfolio?.partner_name || 'Partner Workspace'}
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200/60">
                Client Management
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Client Portfolio, Licence Allocation &amp; White-Label Controls
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
              <div className="text-[11px] font-medium text-teal-700">
                Organisation Administrator
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
              <span>Client Portfolio ({clients.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('hierarchy')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'hierarchy'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Licence Management</span>
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
              <span>Branding</span>
            </button>
          </div>

          <button
            onClick={() => setIsOnboardOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Client Organisation</span>
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
            <div className="text-xs text-slate-500 font-medium">Purchased enterprise seat capacity</div>
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

          {/* Card 4: HR Users Assigned */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Client Users Assigned
            </span>
            <div className="text-3xl font-extrabold text-slate-900 mono-numeric">
              {(portfolio?.total_users_assigned || 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Provisioned HR administrators across clients
            </div>
            <div className="text-xs font-semibold text-blue-600 flex items-center gap-1.5 pt-1">
              <Users2 className="w-3.5 h-3.5" />
              <span>Active Client Access</span>
            </div>
          </div>
        </div>

        {/* TAB 1: CLIENT PORTFOLIO & USER ASSIGNMENT */}
        {activeTab === 'clients' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Filter client organisations by name or industry..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="h-10 w-full pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              <div className="text-xs text-slate-600 font-medium flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Organisation &amp; Licence Assignment Hub &bull; Client employee analytics stay private to client HR.</span>
              </div>
            </div>

            {/* Clients Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClients.map((client) => {
                const quota = client.assigned_seat_quota || client.assigned_quota || 1000;
                const assignedUsers = client.assigned_users || [];

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

                      {/* Allocation Summary (Seat Quotas & Assigned HR Users Only) */}
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            Seat Licences
                          </span>
                          <span className="text-lg font-bold text-slate-900 mono-numeric">
                            {quota.toLocaleString()}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            Users Assigned
                          </span>
                          <span className="text-lg font-bold text-blue-600 mono-numeric">
                            {assignedUsers.length}
                          </span>
                        </div>
                      </div>

                      {/* Assigned Client Users List */}
                      <div className="mt-4 space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Assigned HR Administrators
                        </div>
                        {assignedUsers.length > 0 ? (
                          <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                            {assignedUsers.map((u: any) => (
                              <div
                                key={u.id}
                                className="flex items-center justify-between px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200/60 text-xs"
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="font-semibold text-slate-800 truncate">{u.full_name}</div>
                                  <div className="text-[10px] text-slate-500 truncate font-mono">{u.email}</div>
                                </div>
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60 shrink-0">
                                  {u.role === 'COMPANY_ADMIN' ? 'HR Admin' : u.role.replace('_', ' ')}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic py-2">No HR users assigned yet</div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClientForQuota(client);
                            setUpdatedQuota(quota);
                          }}
                          className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                        >
                          Adjust Seats
                        </button>
                        <button
                          type="button"
                          onClick={() => openClientBrandingModal(client)}
                          className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                          title="Configure Logo & Brand Theme"
                        >
                          <Palette className="w-3.5 h-3.5 text-blue-600" />
                          <span>Branding</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClientForUser(client);
                          setAssignUserError(null);
                        }}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Assign User</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: ORGANISATION BRANDING & CO-BRANDING MODES */}
        {activeTab === 'branding' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 max-w-3xl mx-auto space-y-6 shadow-xs">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Organisation Branding &amp; Co-Branding Modes
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                Control how your advisory identity appears across your assigned client organisations.
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

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CompanyLogo
                      name={portfolio?.partner_name || 'Partner'}
                      slug={user?.company_slug || ''}
                      logoUrl={partnerLogoUrl || portfolio?.partner_logo_url}
                      primaryColor={partnerPrimaryColor}
                      size="lg"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Partner Organisation Logo</div>
                      <div className="text-[11px] text-slate-500">
                        Upload PNG/SVG/WebP or paste a hosted logo URL. Synced to CO_BRANDED &amp; WHITE_LABEL client portals.
                      </div>
                    </div>
                  </div>
                  <label className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 cursor-pointer flex items-center gap-2 shrink-0 shadow-xs">
                    <UploadCloud className="w-4 h-4 text-blue-600" />
                    <span>{partnerLogoUploading ? 'Uploading...' : 'Upload Logo File'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePartnerLogoUpload(file);
                      }}
                    />
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Partner Logo URL (or uploaded path)
                  </label>
                  <input
                    type="text"
                    value={partnerLogoUrl}
                    onChange={(e) => setPartnerLogoUrl(e.target.value)}
                    placeholder="/logos/lexvantage.svg or https://example.com/logo.png"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Primary Brand Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={partnerPrimaryColor}
                        onChange={(e) => setPartnerPrimaryColor(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={partnerPrimaryColor}
                        onChange={(e) => setPartnerPrimaryColor(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Sidebar Surface Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={partnerSidebarColor}
                        onChange={(e) => setPartnerSidebarColor(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={partnerSidebarColor}
                        onChange={(e) => setPartnerSidebarColor(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Accent Highlight Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={partnerAccentColor}
                        onChange={(e) => setPartnerAccentColor(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={partnerAccentColor}
                        onChange={(e) => setPartnerAccentColor(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono"
                      />
                    </div>
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

        {/* TAB 3: LICENCE MANAGEMENT & ALLOCATION */}
        {activeTab === 'hierarchy' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Licence Pool &amp; Client Allocation
                </h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                  Track total purchased licence capacity, allocated seats across client organisations, and remaining capacity.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold">
                  Available Pool: <span className="font-bold text-slate-900">{(portfolio?.remaining_seats ?? 0).toLocaleString()}</span> seats
                </div>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Client Organisation</th>
                    <th className="py-3 px-4">Users Assigned</th>
                    <th className="py-3 px-4">Allocated Seats</th>
                    <th className="py-3 px-4">Pool Share</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clients.map((client) => {
                    const quota = client.assigned_seat_quota || client.assigned_quota || 1000;
                    const assignedUsers = client.total_users_assigned ?? client.assigned_users?.length ?? 0;
                    const poolTotal = portfolio?.partner_capacity || 1;
                    const poolSharePct = Math.min(100, Math.round((quota / poolTotal) * 100));
                    return (
                      <tr key={client.id} className="hover:bg-slate-50/80">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{client.name}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-700">{assignedUsers} HR / Admin</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{quota.toLocaleString()}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${poolSharePct}%` }} />
                            </div>
                            <span className="text-[11px] font-semibold text-slate-600">{poolSharePct}% of pool</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClientForQuota(client);
                              setUpdatedQuota(quota);
                            }}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold cursor-pointer"
                          >
                            Adjust Licences
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
                  min={10}
                  value={updatedQuota}
                  onChange={(e) => setUpdatedQuota(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono"
                />
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Assigned HR / Admin users: {selectedClientForQuota.total_users_assigned ?? selectedClientForQuota.assigned_users?.length ?? 0}
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

      {/* ASSIGN HR USER MODAL */}
      {selectedClientForUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900">Assign User — {selectedClientForUser.name}</h3>
                <p className="text-xs text-slate-500">Provision HR or Client Admin access for this organisation</p>
              </div>
              <button
                onClick={() => setSelectedClientForUser(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {assignUserError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {assignUserError}
              </div>
            )}

            <form onSubmit={handleAssignUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meera Krishnan"
                  value={assignUserName}
                  onChange={(e) => setAssignUserName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Corporate Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. hr.lead@company.com"
                  value={assignUserEmail}
                  onChange={(e) => setAssignUserEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={assignUserRole}
                  onChange={(e) => setAssignUserRole(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold"
                >
                  <option value="COMPANY_ADMIN">Company HR Admin (COMPANY_ADMIN)</option>
                  <option value="HR_MANAGER">HR Manager (HR_MANAGER)</option>
                  <option value="COMPLIANCE_OFFICER">Compliance Officer (COMPLIANCE_OFFICER)</option>
                  <option value="IC_MEMBER">Internal Committee Member (IC_MEMBER)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={assignUserPassword}
                  onChange={(e) => setAssignUserPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedClientForUser(null)}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignUserLoading}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {assignUserLoading ? 'Assigning...' : 'Assign User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLIENT BRANDING & THEME MODAL */}
      {selectedClientForBranding && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900">Client Branding — {selectedClientForBranding.name}</h3>
                <p className="text-xs text-slate-500">Customise logo, workspace colors, and white-label visibility</p>
              </div>
              <button
                onClick={() => setSelectedClientForBranding(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CompanyLogo
                  name={selectedClientForBranding.name}
                  slug={selectedClientForBranding.slug}
                  logoUrl={clientBrandLogoUrl}
                  primaryColor={clientBrandPrimary}
                  size="md"
                />
                <div className="text-xs">
                  <div className="font-bold text-slate-800">Client Brand Logo</div>
                  <div className="text-[11px] text-slate-500">PNG, JPG, SVG or WebP (max 5 MB)</div>
                </div>
              </div>
              <label className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 cursor-pointer flex items-center gap-1.5">
                <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                <span>{clientLogoUploading ? 'Uploading...' : 'Upload File'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleClientLogoUpload(file);
                  }}
                />
              </label>
            </div>

            <form onSubmit={handleSaveClientBranding} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Logo URL</label>
                <input
                  type="text"
                  value={clientBrandLogoUrl}
                  onChange={(e) => setClientBrandLogoUrl(e.target.value)}
                  placeholder="/logos/nimbus.svg or https://..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={clientBrandPrimary}
                      onChange={(e) => setClientBrandPrimary(e.target.value)}
                      className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={clientBrandPrimary}
                      onChange={(e) => setClientBrandPrimary(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sidebar Bg</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={clientBrandSidebar}
                      onChange={(e) => setClientBrandSidebar(e.target.value)}
                      className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={clientBrandSidebar}
                      onChange={(e) => setClientBrandSidebar(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={clientBrandAccent}
                      onChange={(e) => setClientBrandAccent(e.target.value)}
                      className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={clientBrandAccent}
                      onChange={(e) => setClientBrandAccent(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Co-Branding Mode</label>
                <select
                  value={clientBrandMode}
                  onChange={(e) => setClientBrandMode(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold"
                >
                  <option value="CO_BRANDED">Co-Branded (Client Logo + Managed by Partner)</option>
                  <option value="WHITE_LABEL">Partner White-Label (Partner Logo &amp; Brand)</option>
                  <option value="CLIENT_ONLY">Client-Only (Pure Client Branding)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Portal Welcome Message</label>
                <input
                  type="text"
                  value={clientBrandWelcome}
                  onChange={(e) => setClientBrandWelcome(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedClientForBranding(null)}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={clientBrandSaving}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {clientBrandSaving ? 'Saving...' : 'Save Client Branding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
