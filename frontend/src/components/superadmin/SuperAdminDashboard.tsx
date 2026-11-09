'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users2,
  CreditCard,
  Activity,
  ShieldCheck,
  Server,
  FileText,
  Sliders,
  LogOut,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Edit2,
  Trash2,
  Lock,
  UploadCloud,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Layers,
  Sparkles,
  Cpu,
  Database,
  Network,
  HardDrive,
  Zap
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { CompanyLogo } from '@/components/brand/CompanyLogo';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface SuperAdminDashboardProps {
  user: any;
  onLogout: () => void;
  onInspectTenant: (companyId: string) => void;
}

const COLORS = ['#2A62FF', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  user,
  onLogout,
  onInspectTenant,
}) => {
  const [currentTab, setCurrentTab] = useState<'overview' | 'partners' | 'companies' | 'users' | 'subscriptions' | 'health' | 'audit'>('overview');
  const [analytics, setAnalytics] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [clusterTelemetry, setClusterTelemetry] = useState<any>(null);
  const [asyncJobProgress, setAsyncJobProgress] = useState<number | null>(null);
  const [asyncJobResult, setAsyncJobResult] = useState<string | null>(null);
  const [isTriggeringJob, setIsTriggeringJob] = useState(false);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [companySearch, setCompanySearch] = useState('');
  const [companyStatusFilter, setCompanyStatusFilter] = useState('ALL');
  const [userSearch, setUserSearch] = useState('');

  // Modals
  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
  const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [selectedCompanyForLogo, setSelectedCompanyForLogo] = useState<any>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

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
      const [analyticsRes, compsRes, usersRes, plansRes, healthRes, logsRes, telemetryRes] = await Promise.all([
        apiClient.get('/super-admin/analytics'),
        apiClient.get('/super-admin/companies'),
        apiClient.get('/super-admin/users'),
        apiClient.get('/super-admin/subscriptions'),
        apiClient.get('/super-admin/system-health'),
        apiClient.get('/super-admin/audit-logs'),
        apiClient.get('/cluster/telemetry'),
      ]);

      setAnalytics(analyticsRes.data);
      setCompanies(compsRes.data);
      setUsersList(usersRes.data);
      setPlans(plansRes.data);
      setHealth(healthRes.data);
      setAuditLogs(logsRes.data);
      setClusterTelemetry(telemetryRes.data);
    } catch (e) {
      console.error('Super Admin fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

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
            setAsyncJobResult(`Task ${jobId} finished: ${pollRes.data.result?.summary || 'Batch complete'}`);
            setIsTriggeringJob(false);
            loadAllData();
          } else if (pollRes.data.status === 'FAILED') {
            clearInterval(interval);
            setAsyncJobResult(`Job Failed: ${pollRes.data.error}`);
            setIsTriggeringJob(false);
          }
        } catch (err) {
          clearInterval(interval);
          setIsTriggeringJob(false);
        }
      }, 250);
    } catch (e) {
      setIsTriggeringJob(false);
      alert('Failed to trigger cluster job');
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

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
        partner_id: newCompType === 'CLIENT' ? (newCompPartnerId || null) : null,
        assigned_seat_quota: Number(newCompQuota),
      });
      setIsCreateCompanyOpen(false);
      setNewCompName('');
      setNewCompSlug('');
      setNewCompEmail('');
      setNewCompAdminEmail('');
      loadAllData();
    } catch (err: any) {
      setModalError(err.response?.data?.detail || 'Failed to create company.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleToggleCompanyStatus = async (compId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (!confirm(`Are you sure you want to change this company's status to '${nextStatus}'?`)) return;
    try {
      await apiClient.patch(`/super-admin/companies/${compId}/status`, { status: nextStatus });
      loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update company status.');
    }
  };

  const handleDeleteCompany = async (compId: string, name: string) => {
    if (!confirm(`CRITICAL: Permanently delete tenant organization '${name}' and all associated records?`)) return;
    try {
      await apiClient.delete(`/super-admin/companies/${compId}`);
      loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete company.');
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
      setModalError(err.response?.data?.detail || 'Failed to create user.');
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
      alert('Password successfully reset.');
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
      alert(err.response?.data?.detail || 'Failed to upload company logo.');
    } finally {
      setModalSubmitting(false);
    }
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

  const pieData = analytics?.companies_by_plan
    ? Object.keys(analytics.companies_by_plan).map((key) => ({
        name: key,
        value: analytics.companies_by_plan[key],
      }))
    : [];

  return (
    <div className="min-h-screen bg-[#070F1E] text-slate-100 flex flex-col md:flex-row font-sans select-none">
      {/* Super Admin Enterprise Dark Navy Sidebar */}
      <aside className="w-full md:w-64 bg-[#061122] border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
        <div>
          {/* Platform Branding */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CompanyLogo
                name="HRYAAR"
                slug="hryaar"
                size="md"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-base tracking-tight">HRYAAR</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Tech Master
                  </span>
                </div>
                <span className="text-xs block text-slate-400 font-medium mt-0.5">
                  Master Tech Architecture & Tenancy Core
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1">
            {[
              { id: 'overview', label: 'Platform Pulse', icon: Activity },
              { id: 'partners', label: 'Resellers & Middlemen', icon: Layers, count: companies.filter(c => c.company_type === 'PARTNER').length },
              { id: 'companies', label: 'Tenant Organizations', icon: Building2, count: companies.length },
              { id: 'users', label: 'Platform Users', icon: Users2, count: usersList.length },
              { id: 'subscriptions', label: 'Commercial Plans', icon: CreditCard },
              { id: 'health', label: 'System Health & Metrics', icon: Server },
              { id: 'audit', label: 'Audit Trail & Compliance', icon: FileText },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id as any)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-medium rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* HRYAAR Tech Master Identity Pill */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-300">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>HRYAAR Tech Master</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Sovereign
              </span>
            </div>
            <div className="text-xs font-semibold text-white truncate">
              {user?.full_name || 'HRYAAR Lead Tech Architect'}
            </div>
            <div className="text-[11px] text-slate-400 truncate mt-0.5">
              {user?.email || 'tech@hryaar.com'}
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full h-10 px-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-800"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#070F1E]">
        {/* Top Header Bar */}
        <header className="h-18 bg-[#061122] border-b border-slate-800 px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white tracking-tight">
              HRYAAR Master Tech Console
            </h1>
            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span>Level 0 Central Engineering Core</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAllData}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Refresh Platform Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            </button>

            <button
              onClick={() => setIsCreateCompanyOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Register Organization</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-8 space-y-6 max-w-7xl w-full mx-auto pb-16">
          {/* TAB 1: OVERVIEW & PULSE */}
          {currentTab === 'overview' && (
            <>
              {/* Executive Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-[#0D1C36] border border-[#182C4D] shadow-sm">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                    Registered Companies
                  </div>
                  <div className="text-3xl font-black text-white mono-numeric">
                    {analytics?.total_companies || 0}
                  </div>
                  <div className="text-[11px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>{analytics?.active_companies || 0} Active Organizations</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0D1C36] border border-[#182C4D] shadow-sm">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                    Total Enterprise Employees
                  </div>
                  <div className="text-3xl font-black text-white mono-numeric">
                    {analytics?.total_employees?.toLocaleString() || 0}
                  </div>
                  <div className="text-[11px] text-blue-400 font-semibold mt-1">
                    Avg Sensitization: {analytics?.avg_training_completion_pct}%
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0D1C36] border border-[#182C4D] shadow-sm">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                    Total Platform Users
                  </div>
                  <div className="text-3xl font-black text-white mono-numeric">
                    {analytics?.total_users || 0}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium mt-1">
                    {analytics?.active_users || 0} Active Admins & Staff
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0D1C36] border border-[#182C4D] shadow-sm">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                    Statutory PoSH Cases
                  </div>
                  <div className="text-3xl font-black text-amber-400 mono-numeric">
                    {analytics?.total_complaints || 0}
                  </div>
                  <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                    {analytics?.resolved_complaints || 0} Resolved under 90 days
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Subscription Tier Distribution */}
                <div className="p-6 rounded-2xl bg-[#0D1C36] border border-[#182C4D] shadow-sm">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-400" />
                    <span>Commercial Tier Distribution</span>
                  </h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={75}
                          label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Recent Platform Activity Stream */}
                <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0D1C36] border border-[#182C4D] shadow-sm flex flex-col justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span>Recent Multi-Tenant System Events</span>
                  </h3>
                  <div className="space-y-3 overflow-y-auto max-h-56 pr-2">
                    {analytics?.recent_activity?.slice(0, 7).map((log: any) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-xl bg-[#0A162B] border border-[#152642] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-2 h-2 rounded-full bg-blue-400" />
                          <div>
                            <div className="font-bold text-slate-200">{log.action}</div>
                            <div className="text-[11px] text-slate-400">{log.details}</div>
                          </div>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Tenant Table Preview */}
              <div className="p-6 rounded-2xl bg-[#0D1C36] border border-[#182C4D] shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <span>Registered Companies Roster</span>
                  </h3>
                  <button
                    onClick={() => setCurrentTab('companies')}
                    className="text-xs text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View all organizations</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0A162B] text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Company</th>
                        <th className="py-3 px-4">Industry & HQ</th>
                        <th className="py-3 px-4">Active Staff</th>
                        <th className="py-3 px-4">Subscription Plan</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Super Admin Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#152642] font-medium">
                      {companies.slice(0, 5).map((comp) => (
                        <tr key={comp.id} className="hover:bg-[#11213D] transition-colors">
                          <td className="py-3 px-4 flex items-center gap-3">
                            <CompanyLogo
                              name={comp.name}
                              slug={comp.slug}
                              logoUrl={comp.logo_url}
                              primaryColor={comp.primary_color}
                              size="sm"
                            />
                            <div>
                              <div className="font-bold text-white">{comp.name}</div>
                              <div className="text-[10px] font-mono text-slate-400">{comp.slug}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            <div>{comp.industry || 'Enterprise'}</div>
                            <div className="text-[10px] text-slate-500">{comp.headquarters}</div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-white">
                            {comp.total_employees?.toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              {comp.subscription_plan_name || 'Enterprise'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                comp.status === 'ACTIVE'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {comp.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => onInspectTenant(comp.id)}
                              className="px-3 py-1 bg-white/10 hover:bg-[#2A62FF] text-white rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <span>Inspect Portal</span>
                              <ExternalLink className="w-3 h-3" />
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

          {/* TAB: MIDDLEMEN & RESELLERS HIERARCHY */}
          {currentTab === 'partners' && (
            <div className="space-y-6">
              {/* Architecture Context Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-950/60 to-slate-900 border border-teal-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40">
                      Tier 1 Middlemen Ecosystem
                    </span>
                    <span className="text-slate-400 text-xs">&bull;</span>
                    <span className="text-xs text-slate-300 font-semibold">Strict Mutual Exclusivity Enforced</span>
                  </div>
                  <h3 className="text-lg font-black text-white">
                    Middlemen Partners & Wholesale Seat Assigners
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    As the HRYAAR Tech Lead & Master Creator (Level 0), you manage the multi-tenant architecture and sell wholesale seat pools to mutually exclusive Middleman firms. Middlemen act as pure assigners who distribute seats to their corporate clients. Middleman A cannot view or manage Middleman B&apos;s clients.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setNewCompType('PARTNER');
                    setIsCreateCompanyOpen(true);
                  }}
                  className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register New Middleman Partner</span>
                </button>
              </div>

              {/* Middlemen Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {companies
                  .filter((c) => c.company_type === 'PARTNER')
                  .map((partner) => {
                    const assignedClients = companies.filter((c) => c.partner_id === partner.id);
                    const totalAllocatedSeats = assignedClients.reduce(
                      (acc, c) => acc + (c.assigned_seat_quota || 0),
                      0
                    );
                    const totalLearners = assignedClients.reduce(
                      (acc, c) => acc + (c.total_employees || 0),
                      0
                    );
                    const capacity = partner.assigned_seat_quota || 5000;
                    const remaining = Math.max(0, capacity - totalAllocatedSeats);
                    const usagePct = Math.round((totalAllocatedSeats / capacity) * 100);

                    return (
                      <div
                        key={partner.id}
                        className="bg-[#0D1C36] rounded-2xl p-6 border border-[#182C4D] space-y-4 shadow-sm flex flex-col justify-between"
                      >
                        <div className="space-y-4">
                          {/* Partner Card Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white text-base shadow-sm shrink-0"
                                style={{ backgroundColor: partner.primary_color || '#0F766E' }}
                              >
                                {partner.name.charAt(0)}
                              </div>
                              <div>
                                <h4 className="font-extrabold text-base text-white">{partner.name}</h4>
                                <div className="text-[11px] text-teal-400 font-medium">
                                  {partner.industry || 'HR Advisory & Statutory Legal'} &bull; {partner.slug}
                                </div>
                              </div>
                            </div>

                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                              Middleman Assigner
                            </span>
                          </div>

                          {/* Seat Capacity Bar */}
                          <div className="p-4 bg-[#0A162B] rounded-xl border border-[#152642] space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400 font-bold uppercase text-[10px]">
                                Wholesale Quota Allocation
                              </span>
                              <span className="font-mono font-bold text-teal-400">
                                {totalAllocatedSeats.toLocaleString()} / {capacity.toLocaleString()} Seats Assigned ({usagePct}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-teal-500 h-full rounded-full transition-all"
                                style={{ width: `${Math.min(100, usagePct)}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                              <span>Inventory Available: {remaining.toLocaleString()} seats</span>
                              <span>{totalLearners.toLocaleString()} learners enrolled</span>
                            </div>
                          </div>

                          {/* Assigned Exclusive Clients */}
                          <div className="space-y-2">
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                              Assigned Mutually Exclusive Clients ({assignedClients.length})
                            </div>
                            {assignedClients.length > 0 ? (
                              <div className="space-y-1.5">
                                {assignedClients.map((cl) => (
                                  <div
                                    key={cl.id}
                                    className="p-2.5 rounded-xl bg-[#081224] border border-[#162947] flex items-center justify-between text-xs"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="w-2.5 h-2.5 rounded-full"
                                        style={{ backgroundColor: cl.primary_color || '#2A62FF' }}
                                      />
                                      <span className="font-bold text-white">{cl.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 font-mono text-slate-400 text-[11px]">
                                      <span>{cl.total_employees || 0} Learners</span>
                                      <span className="text-slate-600">&bull;</span>
                                      <span className="text-teal-400 font-bold">{cl.assigned_seat_quota || 1000} Seat Cap</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-slate-500 italic p-2">
                                No clients currently onboarded under this middleman.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Partner Actions */}
                        <div className="pt-3 border-t border-[#152642] flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-500">
                            Branding: {partner.co_branding_mode || 'CO_BRANDED'}
                          </span>
                          <button
                            type="button"
                            onClick={() => onInspectTenant(partner.id)}
                            className="px-3.5 py-1.5 bg-white/10 hover:bg-[#2A62FF] text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <span>Inspect Partner Workspace</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB 2: COMPANY MANAGEMENT */}
          {currentTab === 'companies' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#0D1C36] border border-[#182C4D]">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search company by name or slug..."
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#0A162B] border border-[#182C4D] rounded-xl text-xs font-semibold text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <select
                    value={companyStatusFilter}
                    onChange={(e) => setCompanyStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-[#0A162B] border border-[#182C4D] rounded-xl text-xs font-bold text-white outline-none cursor-pointer"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active Organizations</option>
                    <option value="SUSPENDED">Suspended Organizations</option>
                  </select>

                  <button
                    onClick={() => setIsCreateCompanyOpen(true)}
                    className="px-4 py-2 bg-[#2A62FF] hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Company</span>
                  </button>
                </div>
              </div>

              {/* Companies Full Table */}
              <div className="rounded-2xl bg-[#0D1C36] border border-[#182C4D] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0A162B] text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4">Organization</th>
                        <th className="py-3.5 px-4">Tier / Reseller</th>
                        <th className="py-3.5 px-4">Contact & Domain</th>
                        <th className="py-3.5 px-4">Employees</th>
                        <th className="py-3.5 px-4">Admins</th>
                        <th className="py-3.5 px-4">Plan Tier</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Platform Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#152642] font-medium">
                      {filteredCompanies.map((c) => (
                        <tr key={c.id} className="hover:bg-[#11213D] transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <CompanyLogo
                                name={c.name}
                                slug={c.slug}
                                logoUrl={c.logo_url}
                                primaryColor={c.primary_color}
                                size="md"
                              />
                              <div>
                                <div className="font-bold text-white text-sm">{c.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">ID: {c.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {c.company_type === 'PARTNER' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30">
                                Level 1: Middleman
                              </span>
                            ) : c.partner_name ? (
                              <div className="space-y-0.5">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  Level 2: Client
                                </span>
                                <div className="text-[10px] text-teal-400 font-medium">
                                  by {c.partner_name}
                                </div>
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">
                                Direct Client
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">
                            <div>{c.contact_email || `${c.slug}@company.com`}</div>
                            <div className="text-[10px] text-slate-500">{c.headquarters}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-white">
                            {c.total_employees?.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            {c.total_users} users
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30">
                              {c.subscription_plan_name || 'Enterprise'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                c.status === 'ACTIVE'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Inspect Dashboard */}
                              <button
                                onClick={() => onInspectTenant(c.id)}
                                className="px-2.5 py-1 bg-white/10 hover:bg-[#2A62FF] text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                title="Inspect this company's dashboard"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Inspect</span>
                              </button>

                              {/* Upload Logo Modal Trigger */}
                              <button
                                onClick={() => {
                                  setSelectedCompanyForLogo(c);
                                  setIsLogoModalOpen(true);
                                }}
                                className="p-1.5 bg-[#152642] hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                                title="Upload Brand Logo"
                              >
                                <UploadCloud className="w-3.5 h-3.5" />
                              </button>

                              {/* Toggle Suspension */}
                              <button
                                onClick={() => handleToggleCompanyStatus(c.id, c.status)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                                  c.status === 'ACTIVE'
                                    ? 'bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white'
                                    : 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-300 hover:text-white'
                                }`}
                              >
                                {c.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                              </button>

                              {/* Delete Organization */}
                              <button
                                onClick={() => handleDeleteCompany(c.id, c.name)}
                                className="p-1.5 bg-[#152642] hover:bg-rose-600 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                                title="Delete Company"
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

          {/* TAB 3: PLATFORM USER MANAGEMENT */}
          {currentTab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#0D1C36] border border-[#182C4D]">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search users by name, email, or company..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#0A162B] border border-[#182C4D] rounded-xl text-xs font-semibold text-white outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={() => setIsCreateUserOpen(true)}
                  className="px-4 py-2 bg-[#2A62FF] hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Provision Platform User</span>
                </button>
              </div>

              {/* Users Table */}
              <div className="rounded-2xl bg-[#0D1C36] border border-[#182C4D] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0A162B] text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4">User</th>
                        <th className="py-3.5 px-4">Tenant Company</th>
                        <th className="py-3.5 px-4">Role</th>
                        <th className="py-3.5 px-4">Designation</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#152642] font-medium">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-[#11213D] transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white">{u.full_name}</div>
                            <div className="text-[10px] font-mono text-slate-400">{u.email}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 font-semibold">
                            {u.company_name || 'HRYAAR Global Platform'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400">{u.designation}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                u.status === 'ACTIVE'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedUserForReset(u);
                                setIsResetPasswordOpen(true);
                              }}
                              className="px-2.5 py-1 bg-white/10 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Reset Password</span>
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

          {/* TAB 4: SUBSCRIPTION & COMMERCIAL PLANS */}
          {currentTab === 'subscriptions' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-[#0D1C36] border border-[#182C4D]">
                <h3 className="text-sm font-black uppercase tracking-wider text-white mb-2 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                  <span>SaaS Commercial Tier Architecture</span>
                </h3>
                <p className="text-xs text-slate-400 max-w-2xl">
                  Configure subscription plans, pricing tiers, employee quota thresholds, and feature flags. Each tenant organization is assigned to one tier.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                {plans.map((p) => (
                  <div
                    key={p.id}
                    className="p-6 rounded-2xl bg-[#0D1C36] border border-[#182C4D] flex flex-col justify-between hover:border-blue-500/50 transition-all shadow-sm"
                  >
                    <div>
                      <div className="text-[10px] font-extrabold uppercase text-blue-400 tracking-wider mb-1">
                        {p.name}
                      </div>
                      <h4 className="text-base font-black text-white">{p.display_name}</h4>
                      <div className="mt-3 text-2xl font-black text-white mono-numeric">
                        ${p.price_monthly}
                        <span className="text-xs font-normal text-slate-400">/mo</span>
                      </div>

                      <div className="mt-4 pt-4 border-t border-[#152642] space-y-2 text-xs text-slate-300">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Employee Limit:</span>
                          <span className="font-bold text-white font-mono">
                            {p.max_employees > 0 ? `${p.max_employees.toLocaleString()} users` : 'Unlimited'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Storage Cap:</span>
                          <span className="font-bold text-white font-mono">{p.storage_limit_mb} MB</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Active Companies:</span>
                          <span className="font-bold text-emerald-400 font-mono">
                            {companies.filter((c) => c.subscription_plan_id === p.id).length}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#152642]">
                      <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Active Commercial Tier
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: 3-TIER DISTRIBUTED ARCHITECTURE & CLUSTER TELEMETRY */}
          {currentTab === 'health' && (
            <div className="space-y-6">
              {/* Architecture Header Banner */}
              <div className="p-6 rounded-2xl bg-[#0D1C36] border border-[#182C4D] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                      Distributed High-Concurrency Topology
                    </span>
                    <span className="text-slate-500">&bull;</span>
                    <span className="text-xs font-mono font-bold text-slate-300">
                      Node: {clusterTelemetry?.cluster_node_id || 'api-worker-alpha-1'}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white">
                    3-Tier Distributed Architecture & Cluster Telemetry
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real-time telemetry across Tier 1 Presentation Ingress, Tier 2 Application Logic Cluster, and Tier 3 Distributed Data Stores.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={loadAllData}
                    className="px-3.5 py-2 bg-[#152642] hover:bg-slate-700 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh Telemetry</span>
                  </button>
                </div>
              </div>

              {/* 3-Tier Distributed Topology Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* TIER 1: PRESENTATION & INGRESS */}
                <div className="p-6 rounded-2xl bg-[#0D1C36] border border-blue-500/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Network className="w-5 h-5 text-blue-400" />
                        <span className="text-xs font-black uppercase tracking-wider text-blue-400">
                          Tier 1: Presentation
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        EDGE LIVE
                      </span>
                    </div>

                    <h4 className="text-sm font-extrabold text-white mb-2">
                      {clusterTelemetry?.tier_1_presentation?.name || 'Next.js 16 + Nginx Gateway'}
                    </h4>

                    <div className="space-y-2 text-xs text-slate-300">
                      <div className="p-2.5 rounded-lg bg-black/25 flex items-center justify-between">
                        <span className="text-slate-400">Reverse Proxy Gateway:</span>
                        <span className="font-bold text-emerald-400">Nginx Load Balancer</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/25 flex items-center justify-between">
                        <span className="text-slate-400">State Model:</span>
                        <span className="font-bold text-blue-300">Stateless (Edge CDN Ready)</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/25 flex items-center justify-between">
                        <span className="text-slate-400">Rate Limiter:</span>
                        <span className="font-bold text-slate-200">25 req/min per IP</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/25 flex items-center justify-between">
                        <span className="text-slate-400">Security Headers:</span>
                        <span className="font-bold text-emerald-400">OWASP Enforced</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#182C4D] text-[11px] text-slate-400">
                    Session TTL: <b>24 Hours</b> &bull; Zero client state in memory
                  </div>
                </div>

                {/* TIER 2: APPLICATION & LOGIC CLUSTER */}
                <div className="p-6 rounded-2xl bg-[#0D1C36] border border-purple-500/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-purple-400" />
                        <span className="text-xs font-black uppercase tracking-wider text-purple-400">
                          Tier 2: Application
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        CLUSTERED
                      </span>
                    </div>

                    <h4 className="text-sm font-extrabold text-white mb-2">
                      {clusterTelemetry?.tier_2_application?.name || 'FastAPI Stateless ASGI Cluster'}
                    </h4>

                    <div className="space-y-2 text-xs text-slate-300">
                      <div className="p-2.5 rounded-lg bg-black/25 flex items-center justify-between">
                        <span className="text-slate-400">Distributed Cache:</span>
                        <span className="font-mono font-bold text-amber-300">
                          {clusterTelemetry?.tier_2_application?.distributed_cache?.backend || 'IN_MEMORY'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/25 flex items-center justify-between">
                        <span className="text-slate-400">Cache Hit Ratio:</span>
                        <span className="font-bold text-emerald-400">
                          {clusterTelemetry?.tier_2_application?.distributed_cache?.hit_ratio_pct || 0}%
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/25 flex items-center justify-between">
                        <span className="text-slate-400">Process Memory (RSS):</span>
                        <span className="font-bold text-purple-300">
                          {clusterTelemetry?.tier_2_application?.memory_usage_mb || 128} MB
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/25 flex items-center justify-between">
                        <span className="text-slate-400">Worker Queue Depth:</span>
                        <span className="font-bold text-slate-200">
                          {clusterTelemetry?.tier_2_application?.task_queue?.active_queue_depth || 0} Jobs
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#182C4D] text-[11px] text-slate-400">
                    Concurrency: <b>{clusterTelemetry?.tier_2_application?.workers_concurrency || 8} Workers</b> &bull; Thread Pool Active
                  </div>
                </div>

                {/* TIER 3: DATA & PERSISTENCE */}
                <div className="p-6 rounded-2xl bg-[#0D1C36] border border-emerald-500/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-emerald-400" />
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                          Tier 3: Persistence
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        POOLED
                      </span>
                    </div>

                    <h4 className="text-sm font-extrabold text-white mb-2">
                      {clusterTelemetry?.tier_3_data_storage?.name || 'Relational Pool & Distributed Storage'}
                    </h4>

                    <div className="space-y-2 text-xs text-slate-300">
                      <div className="p-2.5 rounded-lg bg-black/25 flex items-center justify-between">
                        <span className="text-slate-400">Database Engine:</span>
                        <span className="font-bold text-emerald-300">
                          {clusterTelemetry?.tier_3_data_storage?.database_pool?.engine || 'Pooled Engine'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/25 flex items-center justify-between">
                        <span className="text-slate-400">Connection Pool:</span>
                        <span className="font-bold text-slate-200">
                          Size {clusterTelemetry?.tier_3_data_storage?.database_pool?.pool_size || 20} (Overflow: {clusterTelemetry?.tier_3_data_storage?.database_pool?.max_overflow || 30})
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/25 flex items-center justify-between">
                        <span className="text-slate-400">Storage Provider:</span>
                        <span className="font-bold text-blue-300">
                          {clusterTelemetry?.tier_3_data_storage?.object_storage?.provider || 'LOCAL'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/25 flex items-center justify-between">
                        <span className="text-slate-400">Storage Consumption:</span>
                        <span className="font-bold text-amber-300">
                          {clusterTelemetry?.tier_3_data_storage?.object_storage?.used_storage_mb || 0} MB
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#182C4D] text-[11px] text-slate-400">
                    Tenants: <b>{clusterTelemetry?.tier_3_data_storage?.entity_counts?.companies || 3}</b> &bull; Records: <b>{clusterTelemetry?.tier_3_data_storage?.entity_counts?.employees || 2300} Employees</b>
                  </div>
                </div>
              </div>

              {/* ASYNCHRONOUS BACKGROUND WORKER DEMONSTRATION */}
              <div className="p-6 rounded-2xl bg-[#0D1C36] border border-[#182C4D]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>Distributed Asynchronous Task Engine</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Test non-blocking execution of heavy multi-tenant batch workloads across worker threads.
                    </p>
                  </div>

                  <button
                    onClick={triggerClusterAsyncJob}
                    disabled={isTriggeringJob}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Zap className={`w-3.5 h-3.5 ${isTriggeringJob ? 'animate-bounce' : ''}`} />
                    <span>{isTriggeringJob ? 'Worker Processing...' : 'Dispatch Batch Workload'}</span>
                  </button>
                </div>

                {isTriggeringJob && asyncJobProgress !== null && (
                  <div className="space-y-2 mt-4 p-4 rounded-xl bg-black/30 border border-slate-800">
                    <div className="flex justify-between text-xs font-bold text-slate-300">
                      <span>Worker Pool Execution in Progress...</span>
                      <span>{asyncJobProgress}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-200"
                        style={{ width: `${asyncJobProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {asyncJobResult && (
                  <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-between">
                    <span>{asyncJobResult}</span>
                    <button onClick={() => setAsyncJobResult(null)} className="text-emerald-400 hover:text-white">&times;</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: AUDIT TRAIL */}
          {currentTab === 'audit' && (
            <div className="space-y-4">
              <div className="p-6 rounded-2xl bg-[#0D1C36] border border-[#182C4D] flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    Platform Master Audit Log Stream
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Cryptographically tracked immutable events: tenant provisioning, logins, and status transitions.
                  </p>
                </div>
                <button
                  onClick={loadAllData}
                  className="px-3 py-1.5 bg-[#152642] hover:bg-slate-700 text-xs font-bold text-white rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Trail</span>
                </button>
              </div>

              <div className="rounded-2xl bg-[#0D1C36] border border-[#182C4D] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0A162B] text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Action Event</th>
                        <th className="py-3 px-4">Actor</th>
                        <th className="py-3 px-4">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#152642] font-medium font-mono text-[11px]">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#11213D] transition-colors">
                          <td className="py-3 px-4 text-slate-400">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-blue-400 font-bold">{log.action}</td>
                          <td className="py-3 px-4 text-slate-300">{log.user_email || 'System'}</td>
                          <td className="py-3 px-4 text-slate-400 max-w-md truncate font-sans">
                            {log.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal 1: Register New Company */}
      {isCreateCompanyOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A162B] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#182C4D] text-white">
            <div className="flex items-center justify-between pb-4 border-b border-[#152642]">
              <div className="flex items-center gap-2 text-blue-400 font-black text-sm uppercase">
                <Building2 className="w-5 h-5" />
                <span>Register Tenant Organization</span>
              </div>
              <button
                onClick={() => setIsCreateCompanyOpen(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateCompany} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zen Systems"
                    value={newCompName}
                    onChange={(e) => {
                      setNewCompName(e.target.value);
                      if (!newCompSlug) {
                        setNewCompSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                      }
                    }}
                    className="w-full px-3 py-2 bg-[#070F1E] border border-[#182C4D] rounded-xl font-semibold outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Unique Slug / Subdomain</label>
                  <input
                    type="text"
                    required
                    placeholder="zen-systems"
                    value={newCompSlug}
                    onChange={(e) => setNewCompSlug(e.target.value)}
                    className="w-full px-3 py-2 bg-[#070F1E] border border-[#182C4D] rounded-xl font-semibold outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Industry Sector</label>
                  <input
                    type="text"
                    value={newCompIndustry}
                    onChange={(e) => setNewCompIndustry(e.target.value)}
                    className="w-full px-3 py-2 bg-[#070F1E] border border-[#182C4D] rounded-xl font-semibold outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Headquarters</label>
                  <input
                    type="text"
                    value={newCompHQ}
                    onChange={(e) => setNewCompHQ(e.target.value)}
                    className="w-full px-3 py-2 bg-[#070F1E] border border-[#182C4D] rounded-xl font-semibold outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Initial Administrator Email</label>
                <input
                  type="email"
                  required
                  placeholder="hr@zensystems.com"
                  value={newCompAdminEmail}
                  onChange={(e) => setNewCompAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[#070F1E] border border-[#182C4D] rounded-xl font-semibold outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Admin Password</label>
                  <input
                    type="password"
                    required
                    value={newCompAdminPassword}
                    onChange={(e) => setNewCompAdminPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-[#070F1E] border border-[#182C4D] rounded-xl font-semibold outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Primary Brand Color</label>
                  <div className="flex items-center gap-2 p-1.5 bg-[#070F1E] border border-[#182C4D] rounded-xl">
                    <input
                      type="color"
                      value={newCompPrimaryColor}
                      onChange={(e) => setNewCompPrimaryColor(e.target.value)}
                      className="w-6 h-6 rounded border-0 cursor-pointer p-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={newCompPrimaryColor}
                      onChange={(e) => setNewCompPrimaryColor(e.target.value)}
                      className="w-full text-xs font-mono font-bold uppercase bg-transparent outline-none text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Tier 1 Assigner or Tier 2 Client selection */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Organization Tier</label>
                  <select
                    value={newCompType}
                    onChange={(e) => setNewCompType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#070F1E] border border-[#182C4D] rounded-xl font-bold text-white outline-none"
                  >
                    <option value="CLIENT">Level 2: Client Enterprise (End-User)</option>
                    <option value="PARTNER">Level 1: Middleman Partner (Assigner)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    {newCompType === 'PARTNER' ? 'Wholesale Seat Capacity' : 'Assigned Seat Quota'}
                  </label>
                  <input
                    type="number"
                    min={10}
                    value={newCompQuota}
                    onChange={(e) => setNewCompQuota(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#070F1E] border border-[#182C4D] rounded-xl font-mono font-bold text-white outline-none"
                  />
                </div>
              </div>

              {newCompType === 'CLIENT' && (
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Managing Middleman Partner (Assigner)
                  </label>
                  <select
                    value={newCompPartnerId}
                    onChange={(e) => setNewCompPartnerId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#070F1E] border border-[#182C4D] rounded-xl font-semibold text-white outline-none"
                  >
                    <option value="">Direct Client (Managed by Platform Owner)</option>
                    {companies
                      .filter((c) => c.company_type === 'PARTNER')
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.slug})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateCompanyOpen(false)}
                  className="px-4 py-2 bg-[#152642] font-bold rounded-xl text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-5 py-2 bg-[#2A62FF] hover:bg-blue-600 text-white font-bold rounded-xl shadow cursor-pointer"
                >
                  {modalSubmitting ? 'Provisioning...' : 'Provision Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Provision Platform User */}
      {isCreateUserOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A162B] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#182C4D] text-white">
            <div className="flex items-center justify-between pb-3 border-b border-[#152642]">
              <h3 className="text-sm font-black uppercase text-blue-400">Provision User Account</h3>
              <button
                onClick={() => setIsCreateUserOpen(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUsrName}
                  onChange={(e) => setNewUsrName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#070F1E] border border-[#182C4D] rounded-xl font-semibold outline-none text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Corporate Email</label>
                <input
                  type="email"
                  required
                  value={newUsrEmail}
                  onChange={(e) => setNewUsrEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[#070F1E] border border-[#182C4D] rounded-xl font-semibold outline-none text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={newUsrPassword}
                  onChange={(e) => setNewUsrPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#070F1E] border border-[#182C4D] rounded-xl font-semibold outline-none text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Assign to Organization</label>
                <select
                  value={newUsrCompId}
                  onChange={(e) => setNewUsrCompId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#070F1E] border border-[#182C4D] rounded-xl font-bold text-white outline-none"
                >
                  <option value="">None (Global Platform Administrator)</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Role Privilege</label>
                <select
                  value={newUsrRole}
                  onChange={(e) => setNewUsrRole(e.target.value)}
                  className="w-full px-3 py-2 bg-[#070F1E] border border-[#182C4D] rounded-xl font-bold text-white outline-none"
                >
                  <option value="COMPANY_ADMIN">Company Administrator</option>
                  <option value="HR_MANAGER">HR Manager</option>
                  <option value="IC_MEMBER">Internal Committee Member</option>
                  <option value="AUDITOR">Auditor</option>
                  <option value="SUPER_ADMIN">Platform Super Admin</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateUserOpen(false)}
                  className="px-4 py-2 bg-[#152642] font-bold rounded-xl text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-5 py-2 bg-[#2A62FF] hover:bg-blue-600 font-bold rounded-xl text-white cursor-pointer"
                >
                  {modalSubmitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Reset Password */}
      {isResetPasswordOpen && selectedUserForReset && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A162B] rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#182C4D] text-white">
            <h3 className="text-sm font-black mb-1">Reset Password</h3>
            <p className="text-xs text-slate-400 mb-4">{selectedUserForReset.email}</p>

            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#070F1E] border border-[#182C4D] rounded-xl font-semibold outline-none text-white"
                  placeholder="Min 6 characters"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordOpen(false)}
                  className="px-3.5 py-1.5 bg-[#152642] font-bold rounded-xl text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-1.5 bg-blue-600 font-bold rounded-xl text-white cursor-pointer"
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Upload Logo for Company */}
      {isLogoModalOpen && selectedCompanyForLogo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A162B] rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#182C4D] text-white">
            <h3 className="text-sm font-black mb-1">Upload Brand Logo</h3>
            <p className="text-xs text-slate-400 mb-4">{selectedCompanyForLogo.name}</p>

            <form onSubmit={handleUploadCompanyLogo} className="space-y-4 text-xs">
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                required
                onChange={(e) => e.target.files && setLogoFile(e.target.files[0])}
                className="w-full px-3 py-2 bg-[#070F1E] border border-[#182C4D] rounded-xl font-semibold outline-none text-white file:mr-3 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:font-bold file:text-xs"
              />

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLogoModalOpen(false)}
                  className="px-3.5 py-1.5 bg-[#152642] font-bold rounded-xl text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-1.5 bg-blue-600 font-bold rounded-xl text-white cursor-pointer"
                >
                  {modalSubmitting ? 'Uploading...' : 'Upload Logo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

