'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users2,
  CreditCard,
  Activity,
  Server,
  FileText,
  LogOut,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Lock,
  Unlock,
  ShieldCheck,
  UploadCloud,
  ChevronRight,
  Layers,
  Cpu,
  Database,
  Network,
  Zap,
  UserPlus,
  Palette,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { CompanyLogo } from '@/components/brand/CompanyLogo';
import { ImportModal } from '@/components/modals/ImportModal';
import { SecuritySessionsModal } from '@/components/layout/SecuritySessionsModal';
import { useRealtime } from '@/lib/realtime';

interface SuperAdminDashboardProps {
  user: any;
  onLogout: () => void;
  onInspectTenant: (companyId: string) => void;
}

const TAB_META: Record<string, { title: string; subtitle: string }> = {
  overview: {
    title: 'Overview',
    subtitle: 'Organisations, assigned administrators, seat inventory, and recent account activity.',
  },
  partners: {
    title: 'Partner Organisations',
    subtitle: 'Channel partners, wholesale seat pools, and their managed client portfolios.',
  },
  companies: {
    title: 'Organisations',
    subtitle: 'All registered partner and corporate client accounts across the platform.',
  },
  users: {
    title: 'Platform Users',
    subtitle: 'Provision and manage administrator access across partner and client accounts.',
  },
  subscriptions: {
    title: 'Commercial Plans',
    subtitle: 'Subscription tiers, seat thresholds, storage limits, and active plan distribution.',
  },
  health: {
    title: 'System Health',
    subtitle: 'Runtime telemetry across web ingress, application workers, and persistence stores.',
  },
  audit: {
    title: 'Audit Log',
    subtitle: 'Immutable trail of provisioning, authentication, branding, and status changes.',
  },
};

function StatusPill({ status }: { status: string }) {
  const active = status === 'ACTIVE';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
        active
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
          : 'bg-rose-50 text-rose-700 border-rose-200/80'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      <span>{active ? 'Active' : status}</span>
    </span>
  );
}

function OrgCategoryPill({ company }: { company: any }) {
  if (company.company_type === 'PARTNER') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/80">
        Partner
      </span>
    );
  }
  if (company.partner_name) {
    return (
      <div className="space-y-0.5">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/80">
          Partner Client
        </span>
        <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
          via {company.partner_name}
        </div>
      </div>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
      Direct Client
    </span>
  );
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  user,
  onLogout,
}) => {
  const [currentTab, setCurrentTab] = useState<
    'overview' | 'partners' | 'companies' | 'users' | 'subscriptions' | 'health' | 'audit'
  >('overview');
  const [analytics, setAnalytics] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [clusterTelemetry, setClusterTelemetry] = useState<any>(null);
  const [asyncJobProgress, setAsyncJobProgress] = useState<number | null>(null);
  const [asyncJobResult, setAsyncJobResult] = useState<string | null>(null);
  const [isTriggeringJob, setIsTriggeringJob] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filters
  const [companySearch, setCompanySearch] = useState('');
  const [companyStatusFilter, setCompanyStatusFilter] = useState('ALL');
  const [userSearch, setUserSearch] = useState('');

  // Modals
  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [selectedCompanyForLogo, setSelectedCompanyForLogo] = useState<any>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [selectedCompanyForBrand, setSelectedCompanyForBrand] = useState<any>(null);
  const [brandPrimary, setBrandPrimary] = useState('#2A62FF');
  const [brandSidebar, setBrandSidebar] = useState('#061122');
  const [brandAccent, setBrandAccent] = useState('#F59E0B');
  const [brandMode, setBrandMode] = useState('CO_BRANDED');
  const [brandWelcome, setBrandWelcome] = useState('');
  const [isImportCsvOpen, setIsImportCsvOpen] = useState(false);
  const [importTargetCompId, setImportTargetCompId] = useState('');
  const [billingSummary, setBillingSummary] = useState<any>(null);
  const [gatewayStatus, setGatewayStatus] = useState<any>(null);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const { subscribeToEvent } = useRealtime();

  useEffect(() => {
    const unsub = subscribeToEvent('*', () => {
      loadAllData();
    });
    return () => unsub();
  }, [subscribeToEvent]);

  // New Company Form State
  const [newCompName, setNewCompName] = useState('');
  const [newCompSlug, setNewCompSlug] = useState('');
  const [newCompIndustry, setNewCompIndustry] = useState('Enterprise Technology');
  const [newCompHQ, setNewCompHQ] = useState('Mumbai, India');
  const [newCompEmail, setNewCompEmail] = useState('');
  const [newCompAdminEmail, setNewCompAdminEmail] = useState('');
  const [newCompAdminPassword, setNewCompAdminPassword] = useState('Admin@1234');
  const [newCompPrimaryColor, setNewCompPrimaryColor] = useState('#2A62FF');
  const [newCompType, setNewCompType] = useState<'CLIENT' | 'PARTNER'>('CLIENT');
  const [newCompPartnerId, setNewCompPartnerId] = useState('');
  const [newCompQuota, setNewCompQuota] = useState<number>(1500);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // New User Form State
  const [newUsrEmail, setNewUsrEmail] = useState('');
  const [newUsrName, setNewUsrName] = useState('');
  const [newUsrPassword, setNewUsrPassword] = useState('User@1234');
  const [newUsrRole, setNewUsrRole] = useState('COMPANY_ADMIN');
  const [newUsrCompId, setNewUsrCompId] = useState('');

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, compsRes, usersRes, plansRes, , logsRes, telemetryRes, billingRes, gwRes] = await Promise.all([
        apiClient.get('/super-admin/analytics'),
        apiClient.get('/super-admin/companies'),
        apiClient.get('/super-admin/users'),
        apiClient.get('/super-admin/subscriptions'),
        apiClient.get('/super-admin/system-health'),
        apiClient.get('/super-admin/audit-logs'),
        apiClient.get('/cluster/telemetry'),
        apiClient.get('/billing/summary').catch(() => ({ data: null })),
        fetch('/api/gateway-status').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      setAnalytics(analyticsRes.data);
      setCompanies(compsRes.data);
      setUsersList(usersRes.data);
      setPlans(plansRes.data);
      setAuditLogs(logsRes.data);
      setClusterTelemetry(telemetryRes.data);
      setBillingSummary(billingRes.data);
      setGatewayStatus(gwRes);
    } catch (e) {
      console.error('Platform data fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const triggerClusterAsyncJob = async () => {
    try {
      setIsTriggeringJob(true);
      setAsyncJobResult(null);
      setAsyncJobProgress(10);
      const res = await apiClient.post('/cluster/jobs/trigger-async-batch', {
        batch_size: 250,
        company_id: companies[0]?.id || 'c-acme-corp-1250',
      });
      const jobId = res.data.job_id;

      const interval = setInterval(async () => {
        try {
          const pollRes = await apiClient.get(`/cluster/jobs/${jobId}`);
          setAsyncJobProgress(pollRes.data.progress_pct);
          if (pollRes.data.status === 'COMPLETED') {
            clearInterval(interval);
            setAsyncJobProgress(100);
            setAsyncJobResult(`Job ${jobId} completed: ${pollRes.data.result?.summary || 'Done'}`);
            setIsTriggeringJob(false);
            loadAllData();
          } else if (pollRes.data.status === 'FAILED') {
            clearInterval(interval);
            setAsyncJobResult(`Job failed: ${pollRes.data.error}`);
            setIsTriggeringJob(false);
          }
        } catch {
          clearInterval(interval);
          setIsTriggeringJob(false);
        }
      }, 250);
    } catch {
      setIsTriggeringJob(false);
      alert('Failed to trigger background job');
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalSubmitting(true);
    setModalError(null);
    try {
      await apiClient.post('/super-admin/companies', {
        name: newCompName,
        slug: newCompSlug || newCompName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        industry: newCompIndustry,
        headquarters: newCompHQ,
        contact_email: newCompEmail,
        admin_email: newCompAdminEmail,
        admin_password: newCompAdminPassword,
        primary_color: newCompPrimaryColor,
        company_type: newCompType,
        partner_id: newCompType === 'CLIENT' && newCompPartnerId ? newCompPartnerId : null,
        assigned_seat_quota: Number(newCompQuota),
      });
      setIsCreateCompanyOpen(false);
      setNewCompName('');
      setNewCompSlug('');
      setNewCompEmail('');
      setNewCompAdminEmail('');
      loadAllData();
    } catch (err: any) {
      setModalError(err.response?.data?.detail || 'Failed to create organisation.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleToggleCompanyStatus = async (compId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (!confirm(`Change this organisation's status to '${nextStatus}'?`)) return;
    try {
      await apiClient.patch(`/super-admin/companies/${compId}/status`, { status: nextStatus });
      loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update status.');
    }
  };

  const handleDeleteCompany = async (compId: string, name: string) => {
    if (!confirm(`Permanently delete '${name}' and all associated records?`)) return;
    try {
      await apiClient.delete(`/super-admin/companies/${compId}`);
      loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete organisation.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalSubmitting(true);
    setModalError(null);
    try {
      await apiClient.post('/super-admin/users', {
        email: newUsrEmail,
        full_name: newUsrName,
        password: newUsrPassword,
        role: newUsrRole,
        company_id: newUsrCompId || null,
      });
      setIsCreateUserOpen(false);
      setNewUsrEmail('');
      setNewUsrName('');
      loadAllData();
    } catch (err: any) {
      setModalError(err.response?.data?.detail || 'Failed to assign user.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset) return;
    setModalSubmitting(true);
    try {
      await apiClient.post(`/super-admin/users/${selectedUserForReset.id}/reset-password`, {
        new_password: newPassword,
      });
      setIsResetPasswordOpen(false);
      setSelectedUserForReset(null);
      setNewPassword('');
      alert('Password reset successfully.');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to reset password.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleUploadCompanyLogo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyForLogo || !logoFile) return;
    setModalSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', logoFile);
      await apiClient.post(`/super-admin/companies/${selectedCompanyForLogo.id}/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setIsLogoModalOpen(false);
      setSelectedCompanyForLogo(null);
      setLogoFile(null);
      loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to upload logo.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const openCompanyBrandModal = (comp: any) => {
    setSelectedCompanyForBrand(comp);
    setBrandPrimary(comp.primary_color || '#2A62FF');
    setBrandSidebar(comp.sidebar_color || '#061122');
    setBrandAccent(comp.accent_color || '#F59E0B');
    setBrandMode(comp.co_branding_mode || 'CO_BRANDED');
    setBrandWelcome(comp.welcome_message || `Welcome to ${comp.name} Compliance Portal`);
    setIsBrandModalOpen(true);
  };

  const handleSaveCompanyBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyForBrand) return;
    setModalSubmitting(true);
    try {
      await apiClient.put(`/super-admin/companies/${selectedCompanyForBrand.id}`, {
        primary_color: brandPrimary,
        sidebar_color: brandSidebar,
        accent_color: brandAccent,
        co_branding_mode: brandMode,
        welcome_message: brandWelcome,
      });
      setIsBrandModalOpen(false);
      setSelectedCompanyForBrand(null);
      loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save branding.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const openAssignUserModal = (company?: any) => {
    setModalError(null);
    setNewUsrCompId(company?.id || '');
    setNewUsrRole(company?.company_type === 'PARTNER' ? 'PARTNER_ADMIN' : 'COMPANY_ADMIN');
    setIsCreateUserOpen(true);
  };

  const filteredCompanies = companies.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(companySearch.toLowerCase()) ||
      c.slug.toLowerCase().includes(companySearch.toLowerCase());
    const matchesStatus = companyStatusFilter === 'ALL' || c.status === companyStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredUsers = usersList.filter((u) => {
    return (
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.company_name && u.company_name.toLowerCase().includes(userSearch.toLowerCase()))
    );
  });

  const partnerOrgs = companies.filter((c) => c.company_type === 'PARTNER');
  const clientOrgs = companies.filter((c) => c.company_type !== 'PARTNER');
  const totalAssignedUsers = companies.reduce((acc, c) => acc + (c.total_users || 0), 0);
  const totalLicencedSeats = companies.reduce((acc, c) => acc + (c.assigned_seat_quota || 0), 0);

  const planDistribution = analytics?.companies_by_plan
    ? Object.entries(analytics.companies_by_plan).map(([name, value]) => ({
        name,
        value: Number(value) || 0,
      }))
    : [];
  const totalPlanCount = planDistribution.reduce((a, p) => a + p.value, 0) || 1;

  const meta = TAB_META[currentTab] || TAB_META.overview;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row font-sans">
      {/* Clean Sidebar Navigation */}
      <aside className="w-full md:w-60 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0">
        <div>
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
            <CompanyLogo name="HRYAAR" slug="hryaar" size="sm" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 tracking-tight truncate">
                HRYAAR
              </div>
              <div className="text-[11px] text-slate-500 truncate">Platform Administration</div>
            </div>
          </div>

          <nav className="p-3 space-y-0.5">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'partners', label: 'Partners', icon: Layers, count: partnerOrgs.length },
              { id: 'companies', label: 'Organisations', icon: Building2, count: companies.length },
              { id: 'users', label: 'Users', icon: Users2, count: usersList.length },
              { id: 'subscriptions', label: 'Plans', icon: CreditCard },
              { id: 'health', label: 'System Health', icon: Server },
              { id: 'audit', label: 'Audit Log', icon: FileText },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id as any)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white font-medium'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </span>
                  {item.count !== undefined && (
                    <span
                      className={`text-[11px] tabular-nums px-1.5 py-0.5 rounded-md ${
                        isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Account Footer */}
        <div className="p-3 border-t border-slate-200 space-y-2">
          <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="text-xs font-semibold text-slate-900 truncate">
              {user?.full_name || 'Platform Admin'}
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {user?.email || 'tech@hryaar.com'}
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-base font-semibold text-slate-900 tracking-tight">{meta.title}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{meta.subtitle}</p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowSecurityModal(true)}
              className="p-2 text-slate-500 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Account Security & Active Sessions"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>

            <button
              onClick={loadAllData}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => {
                setImportTargetCompId(clientOrgs[0]?.id || '');
                setIsImportCsvOpen(true);
              }}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium rounded-lg transition-colors cursor-pointer hidden sm:flex items-center gap-1.5"
              title="Import Leap10x CSV training roster into a client organisation"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              <span>Import CSV</span>
            </button>

            <button
              onClick={() => openAssignUserModal()}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium rounded-lg transition-colors cursor-pointer hidden sm:flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5 text-slate-500" />
              <span>Assign user</span>
            </button>

            <button
              onClick={() => {
                setModalError(null);
                setNewCompType('CLIENT');
                setIsCreateCompanyOpen(true);
              }}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New organisation</span>
            </button>
          </div>
        </header>

        <div className="p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* TAB 1: OVERVIEW */}
          {currentTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-xl bg-white border border-slate-200">
                  <div className="text-xs font-medium text-slate-500">Organisations</div>
                  <div className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
                    {analytics?.total_companies ?? companies.length}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {analytics?.active_companies ?? companies.filter((c) => c.status === 'ACTIVE').length} active accounts
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white border border-slate-200">
                  <div className="text-xs font-medium text-slate-500">Assigned Users</div>
                  <div className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
                    {totalAssignedUsers.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Partner &amp; HR administrators</div>
                </div>

                <div className="p-5 rounded-xl bg-white border border-slate-200">
                  <div className="text-xs font-medium text-slate-500">Partner Accounts</div>
                  <div className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
                    {partnerOrgs.length}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Managing {clientOrgs.filter((c) => c.partner_id).length} client accounts
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white border border-slate-200">
                  <div className="text-xs font-medium text-slate-500">Licenced Seats</div>
                  <div className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
                    {totalLicencedSeats.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Across {companies.length} organisations
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Plan Breakdown */}
                <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900">Plan Distribution</h2>
                    <button
                      onClick={() => setCurrentTab('subscriptions')}
                      className="text-xs text-slate-500 hover:text-slate-900 font-medium cursor-pointer"
                    >
                      Manage
                    </button>
                  </div>

                  <div className="space-y-3">
                    {planDistribution.length > 0 ? (
                      planDistribution.map((plan) => {
                        const pct = Math.round((plan.value / totalPlanCount) * 100);
                        return (
                          <div key={plan.name} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-slate-700">{plan.name}</span>
                              <span className="tabular-nums text-slate-500">
                                {plan.value} ({pct}%)
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-slate-800 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-xs text-slate-400 py-6 text-center">
                        No plan data available
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-2 p-5 rounded-xl bg-white border border-slate-200 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-slate-900">Recent Events</h2>
                    <button
                      onClick={() => setCurrentTab('audit')}
                      className="text-xs text-slate-500 hover:text-slate-900 font-medium cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>View audit log</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 overflow-y-auto max-h-56">
                    {analytics?.recent_activity?.slice(0, 6).map((log: any) => (
                      <div
                        key={log.id}
                        className="py-2.5 flex items-center justify-between gap-4 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800 truncate">{log.action}</div>
                          <div className="text-[11px] text-slate-500 truncate">{log.details}</div>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 tabular-nums whitespace-nowrap">
                          {new Date(log.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Organisations Roster */}
              <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">Organisations</h2>
                  <button
                    onClick={() => setCurrentTab('companies')}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>View all ({companies.length})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-5">Organisation</th>
                        <th className="py-2.5 px-4">Type</th>
                        <th className="py-2.5 px-4">Users Assigned</th>
                        <th className="py-2.5 px-4">Seat Quota</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {companies.slice(0, 6).map((comp) => (
                        <tr key={comp.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-3">
                              <CompanyLogo
                                name={comp.name}
                                slug={comp.slug}
                                logoUrl={comp.logo_url}
                                primaryColor={comp.primary_color}
                                size="sm"
                              />
                              <div>
                                <div className="font-medium text-slate-900">{comp.name}</div>
                                <div className="text-[11px] text-slate-500">
                                  {comp.industry || 'Enterprise'} &bull; {comp.headquarters || 'India'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <OrgCategoryPill company={comp} />
                          </td>
                          <td className="py-3 px-4 tabular-nums font-medium text-slate-700">
                            {comp.total_users || 0} users
                          </td>
                          <td className="py-3 px-4 tabular-nums text-slate-700">
                            {(comp.assigned_seat_quota || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <StatusPill status={comp.status} />
                          </td>
                          <td className="py-3 px-5 text-right">
                            <button
                              onClick={() => openAssignUserModal(comp)}
                              className="px-2.5 py-1 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              <UserPlus className="w-3 h-3" />
                              <span>Assign user</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: PARTNERS */}
          {currentTab === 'partners' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-600">
                  Manage partner organisations, seat pool allocations, and branding inheritance.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setNewCompType('PARTNER');
                    setIsCreateCompanyOpen(true);
                  }}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add partner</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {partnerOrgs.map((partner) => {
                  const assignedClients = companies.filter((c) => c.partner_id === partner.id);
                  const totalAllocatedSeats = assignedClients.reduce(
                    (acc, c) => acc + (c.assigned_seat_quota || 0),
                    0
                  );
                  const capacity = partner.assigned_seat_quota || 5000;
                  const remaining = Math.max(0, capacity - totalAllocatedSeats);
                  const usagePct = capacity > 0 ? Math.min(100, Math.round((totalAllocatedSeats / capacity) * 100)) : 0;

                  return (
                    <div
                      key={partner.id}
                      className="bg-white rounded-xl p-5 border border-slate-200 flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <CompanyLogo
                              name={partner.name}
                              slug={partner.slug}
                              logoUrl={partner.logo_url}
                              primaryColor={partner.primary_color}
                              size="md"
                            />
                            <div>
                              <h3 className="font-semibold text-sm text-slate-900">{partner.name}</h3>
                              <div className="text-xs text-slate-500">
                                {partner.industry || 'HR Advisory'} &bull; {partner.total_users || 0} admins
                              </div>
                            </div>
                          </div>
                          <StatusPill status={partner.status} />
                        </div>

                        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/70 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium">Seat Pool Utilisation</span>
                            <span className="font-mono font-medium text-slate-800 tabular-nums">
                              {totalAllocatedSeats.toLocaleString()} / {capacity.toLocaleString()} ({usagePct}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-slate-800 h-full rounded-full"
                              style={{ width: `${usagePct}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                            <span>{remaining.toLocaleString()} seats unassigned</span>
                            <span>{assignedClients.length} client organisations</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-[11px] font-medium text-slate-500">
                            Assigned Clients
                          </div>
                          {assignedClients.length > 0 ? (
                            <div className="space-y-1.5">
                              {assignedClients.map((cl) => (
                                <div
                                  key={cl.id}
                                  className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <CompanyLogo
                                      name={cl.name}
                                      slug={cl.slug}
                                      logoUrl={cl.logo_url}
                                      primaryColor={cl.primary_color}
                                      size="xs"
                                    />
                                    <span className="font-medium text-slate-800 truncate">{cl.name}</span>
                                  </div>
                                  <span className="text-[11px] font-mono text-slate-500 tabular-nums shrink-0">
                                    {cl.total_users || 0} users &bull; {(cl.assigned_seat_quota || 0).toLocaleString()} seats
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 py-2">No assigned clients</div>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500">
                          Mode: {partner.co_branding_mode || 'CO_BRANDED'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openCompanyBrandModal(partner)}
                            className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium cursor-pointer inline-flex items-center gap-1"
                          >
                            <Palette className="w-3.5 h-3.5 text-slate-500" />
                            <span>Branding</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCompanyForLogo(partner);
                              setIsLogoModalOpen(true);
                            }}
                            className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-md cursor-pointer"
                            title="Upload Logo"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openAssignUserModal(partner)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium cursor-pointer inline-flex items-center gap-1"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Assign user</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: ORGANISATIONS */}
          {currentTab === 'companies' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search organisations..."
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <select
                    value={companyStatusFilter}
                    onChange={(e) => setCompanyStatusFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="ALL">All statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>

                  <button
                    onClick={() => {
                      setModalError(null);
                      setNewCompType('CLIENT');
                      setIsCreateCompanyOpen(true);
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add organisation</span>
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-5">Organisation</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">Users</th>
                        <th className="py-3 px-4">Seats</th>
                        <th className="py-3 px-4">Plan</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCompanies.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-3">
                              <CompanyLogo
                                name={c.name}
                                slug={c.slug}
                                logoUrl={c.logo_url}
                                primaryColor={c.primary_color}
                                size="sm"
                              />
                              <div>
                                <div className="font-medium text-slate-900">{c.name}</div>
                                <div className="text-[11px] font-mono text-slate-400">{c.slug}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <OrgCategoryPill company={c} />
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <div>{c.contact_email || `${c.slug}@company.com`}</div>
                            <div className="text-[11px] text-slate-400">{c.headquarters}</div>
                          </td>
                          <td className="py-3 px-4 tabular-nums font-medium text-slate-800">
                            {c.total_users || 0}
                          </td>
                          <td className="py-3 px-4 tabular-nums text-slate-600">
                            {(c.assigned_seat_quota || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {c.subscription_plan_name || 'Enterprise'}
                          </td>
                          <td className="py-3 px-4">
                            <StatusPill status={c.status} />
                          </td>
                          <td className="py-3 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openAssignUserModal(c)}
                                className="px-2.5 py-1 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-md text-[11px] font-medium cursor-pointer inline-flex items-center gap-1"
                              >
                                <UserPlus className="w-3 h-3" />
                                <span>Assign</span>
                              </button>
                              {c.company_type !== 'PARTNER' && (
                                <button
                                  onClick={() => {
                                    setImportTargetCompId(c.id);
                                    setIsImportCsvOpen(true);
                                  }}
                                  className="p-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-md cursor-pointer"
                                  title="Import Leap10x CSV Roster"
                                >
                                  <FileSpreadsheet className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => openCompanyBrandModal(c)}
                                className="p-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-md cursor-pointer"
                                title="Edit Theme & Branding"
                              >
                                <Palette className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedCompanyForLogo(c);
                                  setIsLogoModalOpen(true);
                                }}
                                className="p-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-md cursor-pointer"
                                title="Upload Brand Logo"
                              >
                                <UploadCloud className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleCompanyStatus(c.id, c.status)}
                                className={`px-2 py-1 rounded-md text-[11px] font-medium border cursor-pointer ${
                                  c.status === 'ACTIVE'
                                    ? 'border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                                    : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                }`}
                              >
                                {c.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleDeleteCompany(c.id, c.name)}
                                className="p-1.5 border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-400 rounded-md cursor-pointer"
                                title="Delete Organisation"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: USERS */}
          {currentTab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search users by name, email, or organisation..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>

                <button
                  onClick={() => openAssignUserModal()}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Provision user</span>
                </button>
              </div>

              <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-5">User</th>
                        <th className="py-3 px-4">Organisation</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Designation</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-5">
                            <div className="font-medium text-slate-900">{u.full_name}</div>
                            <div className="text-[11px] font-mono text-slate-500">{u.email}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium">
                            {u.company_name || 'Platform Administration'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500">{u.designation}</td>
                          <td className="py-3 px-4">
                            <StatusPill status={u.status} />
                          </td>
                          <td className="py-3 px-5 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={async () => {
                                try {
                                  await apiClient.post(`/super-admin/users/${u.id}/unlock`);
                                  alert(`Login lockout cleared for ${u.email}.`);
                                } catch (err: any) {
                                  alert(err.response?.data?.detail || 'Failed to unlock user.');
                                }
                              }}
                              className="px-2.5 py-1 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 rounded-md text-xs font-medium cursor-pointer inline-flex items-center gap-1"
                              title="Clear brute-force login lockout"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Unlock</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUserForReset(u);
                                setIsResetPasswordOpen(true);
                              }}
                              className="px-2.5 py-1 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium cursor-pointer inline-flex items-center gap-1"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Reset password</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SUBSCRIPTIONS & PAYMENTS */}
          {currentTab === 'subscriptions' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl bg-white border border-slate-200">
                  <div className="text-xs font-medium text-slate-500">Collected Revenue (INR)</div>
                  <div className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
                    ₹{(billingSummary?.total_collected_inr || 0).toLocaleString()}
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-white border border-slate-200">
                  <div className="text-xs font-medium text-slate-500">Collected Revenue (USD)</div>
                  <div className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
                    ${(billingSummary?.total_collected_usd || 0).toLocaleString()}
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-white border border-slate-200">
                  <div className="text-xs font-medium text-slate-500">Paid Invoices</div>
                  <div className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
                    {billingSummary?.paid_invoices_count || 0}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {plans.map((p) => (
                  <div
                    key={p.id}
                    className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                        {p.name}
                      </div>
                      <h3 className="text-base font-semibold text-slate-900 mt-0.5">{p.display_name}</h3>
                      <div className="mt-3 text-2xl font-semibold text-slate-900 tabular-nums">
                        ${p.price_monthly}
                        <span className="text-xs font-normal text-slate-500"> / mo</span>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Seat limit</span>
                          <span className="font-medium text-slate-900 tabular-nums">
                            {p.max_employees > 0 ? p.max_employees.toLocaleString() : 'Unlimited'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Storage cap</span>
                          <span className="font-medium text-slate-900 tabular-nums">{p.storage_limit_mb} MB</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Organisations</span>
                          <span className="font-medium text-slate-900 tabular-nums">
                            {companies.filter((c) => c.subscription_plan_id === p.id).length}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <StatusPill status="ACTIVE" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Payment Transactions &amp; Invoices</h3>
                  <span className="text-xs text-slate-500">Razorpay / Stripe / Sandbox Ledger</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-5">Invoice</th>
                        <th className="py-2.5 px-4">Organisation</th>
                        <th className="py-2.5 px-4">Description</th>
                        <th className="py-2.5 px-4">Gateway</th>
                        <th className="py-2.5 px-4">Amount</th>
                        <th className="py-2.5 px-5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {billingSummary?.transactions?.length > 0 ? (
                        billingSummary.transactions.map((tx: any) => (
                          <tr key={tx.id} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-5 font-mono text-[11px] font-medium text-slate-900">
                              {tx.invoice_number || tx.order_id}
                            </td>
                            <td className="py-2.5 px-4 font-medium text-slate-800">{tx.company_name}</td>
                            <td className="py-2.5 px-4 text-slate-600">{tx.description}</td>
                            <td className="py-2.5 px-4 text-slate-600">{tx.provider}</td>
                            <td className="py-2.5 px-4 font-mono font-medium text-slate-900 tabular-nums">
                              {tx.currency} {tx.amount.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-5">
                              <StatusPill status={tx.status === 'PAID' ? 'ACTIVE' : tx.status} />
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            No payment transactions recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SYSTEM HEALTH */}
          {currentTab === 'health' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                      <Network className="w-4 h-4 text-slate-500" />
                      <span>Web Ingress</span>
                    </span>
                    <StatusPill status="ACTIVE" />
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Gateway</span>
                      <span className="font-medium text-slate-800">
                        {clusterTelemetry?.tier_1_presentation?.name || 'Next.js Reverse Proxy'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Rate Limit</span>
                      <span className="font-medium text-slate-800">30 req/min/IP + 5x Lockout</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Security Headers</span>
                      <span className="font-medium text-emerald-700">OWASP Hardened</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                      <Cpu className="w-4 h-4 text-slate-500" />
                      <span>Application Runtime</span>
                    </span>
                    <StatusPill status="ACTIVE" />
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Cache Backend</span>
                      <span className="font-mono font-medium text-slate-800">
                        {clusterTelemetry?.tier_2_application?.distributed_cache?.backend || 'IN_MEMORY'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Cache Hit Ratio</span>
                      <span className="font-medium text-slate-800 tabular-nums">
                        {clusterTelemetry?.tier_2_application?.distributed_cache?.hit_ratio_pct || 0}%
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Memory (RSS)</span>
                      <span className="font-medium text-slate-800 tabular-nums">
                        {clusterTelemetry?.tier_2_application?.memory_usage_mb || 128} MB
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                      <Database className="w-4 h-4 text-slate-500" />
                      <span>Data &amp; Storage</span>
                    </span>
                    <StatusPill status="ACTIVE" />
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Database Engine</span>
                      <span className="font-medium text-slate-800">
                        {clusterTelemetry?.tier_3_data_storage?.database_pool?.engine || 'SQLite / Postgres Pool'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Pool Size</span>
                      <span className="font-medium text-slate-800 tabular-nums">
                        {clusterTelemetry?.tier_3_data_storage?.database_pool?.pool_size || 20} connections
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Storage Used</span>
                      <span className="font-medium text-slate-800 tabular-nums">
                        {clusterTelemetry?.tier_3_data_storage?.object_storage?.used_storage_mb || 0} MB
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Load Balancer Upstreams</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Algorithm: <span className="font-mono">{gatewayStatus?.algorithm || 'least_conn'}</span>
                      </p>
                    </div>
                    <StatusPill status="ACTIVE" />
                  </div>
                  <div className="space-y-2 text-xs">
                    {gatewayStatus?.upstreams?.length > 0 ? (
                      gatewayStatus.upstreams.map((u: any) => (
                        <div key={u.url} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                          <div>
                            <div className="font-mono font-semibold text-slate-800">{u.url}</div>
                            <div className="text-[11px] text-slate-500">
                              Active: {u.active_connections} &bull; Handled: {u.total_handled}
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.healthy ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {u.healthy ? 'HEALTHY' : 'FAILOVER COOLDOWN'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-400 py-3">Gateway routing via direct/reverse-proxy upstream.</div>
                    )}
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Active Cluster Worker Nodes</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Discovered via shared {clusterTelemetry?.tier_2_application?.distributed_cache?.backend || 'L2'} heartbeat
                      </p>
                    </div>
                    <span className="text-xs font-semibold tabular-nums px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {clusterTelemetry?.active_nodes_count || 1} node(s)
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    {(clusterTelemetry?.active_cluster_nodes || []).map((n: any) => (
                      <div key={n.node_id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                        <div>
                          <div className="font-mono font-semibold text-slate-900">{n.node_id}</div>
                          <div className="text-[11px] text-slate-500">
                            PID {n.pid || '-'} &bull; Requests: {n.requests_handled ?? '-'}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ONLINE
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Background Worker Check</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Run a non-blocking asynchronous test batch across the worker pool.
                    </p>
                  </div>
                  <button
                    onClick={triggerClusterAsyncJob}
                    disabled={isTriggeringJob}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{isTriggeringJob ? 'Running...' : 'Run test job'}</span>
                  </button>
                </div>

                {isTriggeringJob && asyncJobProgress !== null && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs text-slate-600 tabular-nums">
                      <span>Executing job</span>
                      <span>{asyncJobProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-900 transition-all duration-200"
                        style={{ width: `${asyncJobProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {asyncJobResult && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                    <span>{asyncJobResult}</span>
                    <button onClick={() => setAsyncJobResult(null)} className="text-emerald-700 font-semibold cursor-pointer">
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: AUDIT LOG */}
          {currentTab === 'audit' && (
            <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Recent Audit Entries</h2>
                <button
                  onClick={loadAllData}
                  className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 rounded-md flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-5">Timestamp</th>
                      <th className="py-2.5 px-4">Event</th>
                      <th className="py-2.5 px-4">Actor</th>
                      <th className="py-2.5 px-5">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] font-medium text-slate-800">
                          {log.action}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">{log.user_email || 'System'}</td>
                        <td className="py-2.5 px-5 text-slate-500 max-w-md truncate">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal 1: New Organisation */}
      {isCreateCompanyOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">New Organisation</h3>
              <button
                onClick={() => setIsCreateCompanyOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateCompany} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Organisation Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Veridian Tech"
                    value={newCompName}
                    onChange={(e) => {
                      setNewCompName(e.target.value);
                      if (!newCompSlug) {
                        setNewCompSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Slug</label>
                  <input
                    type="text"
                    required
                    placeholder="veridian-tech"
                    value={newCompSlug}
                    onChange={(e) => setNewCompSlug(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-slate-400 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Industry</label>
                  <input
                    type="text"
                    value={newCompIndustry}
                    onChange={(e) => setNewCompIndustry(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Headquarters</label>
                  <input
                    type="text"
                    value={newCompHQ}
                    onChange={(e) => setNewCompHQ(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Administrator Email</label>
                <input
                  type="email"
                  required
                  placeholder="admin@company.com"
                  value={newCompAdminEmail}
                  onChange={(e) => setNewCompAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Initial Password</label>
                  <input
                    type="password"
                    required
                    value={newCompAdminPassword}
                    onChange={(e) => setNewCompAdminPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Brand Color</label>
                  <div className="flex items-center gap-2 p-1 bg-slate-50 border border-slate-200 rounded-lg">
                    <input
                      type="color"
                      value={newCompPrimaryColor}
                      onChange={(e) => setNewCompPrimaryColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={newCompPrimaryColor}
                      onChange={(e) => setNewCompPrimaryColor(e.target.value)}
                      className="w-full text-xs font-mono bg-transparent outline-none text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Account Type</label>
                  <select
                    value={newCompType}
                    onChange={(e) => setNewCompType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 outline-none"
                  >
                    <option value="CLIENT">Corporate Client</option>
                    <option value="PARTNER">Partner Organisation</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    {newCompType === 'PARTNER' ? 'Seat Pool Capacity' : 'Seat Quota'}
                  </label>
                  <input
                    type="number"
                    min={10}
                    value={newCompQuota}
                    onChange={(e) => setNewCompQuota(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800 outline-none"
                  />
                </div>
              </div>

              {newCompType === 'CLIENT' && (
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Managing Partner</label>
                  <select
                    value={newCompPartnerId}
                    onChange={(e) => setNewCompPartnerId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none"
                  >
                    <option value="">Direct Client (No Partner)</option>
                    {partnerOrgs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateCompanyOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {modalSubmitting ? 'Creating...' : 'Create organisation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Provision User */}
      {isCreateUserOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Assign Platform User</h3>
              <button
                onClick={() => setIsCreateUserOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUsrName}
                  onChange={(e) => setNewUsrName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newUsrEmail}
                  onChange={(e) => setNewUsrEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  value={newUsrPassword}
                  onChange={(e) => setNewUsrPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Organisation</label>
                <select
                  value={newUsrCompId}
                  onChange={(e) => setNewUsrCompId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none"
                >
                  <option value="">Platform Console (No Tenant)</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={newUsrRole}
                  onChange={(e) => setNewUsrRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none"
                >
                  <option value="COMPANY_ADMIN">Company HR Admin (COMPANY_ADMIN)</option>
                  <option value="HR_MANAGER">HR Manager (HR_MANAGER)</option>
                  <option value="PARTNER_ADMIN">Partner Admin (PARTNER_ADMIN)</option>
                  <option value="IC_MEMBER">Internal Committee Member (IC_MEMBER)</option>
                  <option value="SUPER_ADMIN">Platform Super Admin (SUPER_ADMIN)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateUserOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {modalSubmitting ? 'Assigning...' : 'Assign user'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Reset Password */}
      {isResetPasswordOpen && selectedUserForReset && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Reset Password</h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">{selectedUserForReset.email}</p>

            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-900"
                  placeholder="Min 6 characters"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-700 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-medium cursor-pointer"
                >
                  Save password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Upload Logo */}
      {isLogoModalOpen && selectedCompanyForLogo && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Upload Brand Logo</h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">{selectedCompanyForLogo.name}</p>

            <form onSubmit={handleUploadCompanyLogo} className="space-y-4 text-xs">
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                required
                onChange={(e) => e.target.files && setLogoFile(e.target.files[0])}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-700 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:bg-slate-900 file:text-white file:text-xs file:font-medium"
              />

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLogoModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-700 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-medium cursor-pointer"
                >
                  {modalSubmitting ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Customise Organisation Branding */}
      {isBrandModalOpen && selectedCompanyForBrand && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Organisation Branding</h3>
                <p className="text-xs text-slate-500">{selectedCompanyForBrand.name}</p>
              </div>
              <button
                onClick={() => setIsBrandModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCompanyBranding} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Primary</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={brandPrimary}
                      onChange={(e) => setBrandPrimary(e.target.value)}
                      className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={brandPrimary}
                      onChange={(e) => setBrandPrimary(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-slate-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Sidebar</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={brandSidebar}
                      onChange={(e) => setBrandSidebar(e.target.value)}
                      className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={brandSidebar}
                      onChange={(e) => setBrandSidebar(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-slate-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Accent</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={brandAccent}
                      onChange={(e) => setBrandAccent(e.target.value)}
                      className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={brandAccent}
                      onChange={(e) => setBrandAccent(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Co-Branding Mode</label>
                <select
                  value={brandMode}
                  onChange={(e) => setBrandMode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none"
                >
                  <option value="CO_BRANDED">Co-Branded (Client Logo + Managed by Partner)</option>
                  <option value="WHITE_LABEL">White-Label (Partner Branding Only)</option>
                  <option value="CLIENT_ONLY">Client-Only (Pure Client Branding)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Welcome Message</label>
                <input
                  type="text"
                  value={brandWelcome}
                  onChange={(e) => setBrandWelcome(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBrandModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-700 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-medium cursor-pointer"
                >
                  {modalSubmitting ? 'Saving...' : 'Save branding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 6: Leap10x CSV Roster Import (Platform Admin Only) */}
      <ImportModal
        isOpen={isImportCsvOpen}
        onClose={() => setIsImportCsvOpen(false)}
        companyId={importTargetCompId}
        companies={companies}
        onSuccess={loadAllData}
      />

      <SecuritySessionsModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        userEmail={user?.email}
      />
    </div>
  );
};
