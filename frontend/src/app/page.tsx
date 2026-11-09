'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { KPICards } from '@/components/dashboard/KPICards';
import { LiveWebinarsView } from '@/components/dashboard/LiveWebinarsView';
import { DepartmentCompletionView } from '@/components/dashboard/DepartmentCompletionView';
import { EmployeeTable } from '@/components/dashboard/EmployeeTable';
import { CompanySettingsView } from '@/components/dashboard/CompanySettingsView';
import { ComplianceDocsView } from '@/components/dashboard/ComplianceDocsView';
import { TenantProfileView } from '@/components/dashboard/TenantProfileView';
import { AuditTrailView } from '@/components/dashboard/AuditTrailView';
import { BrandingCustomizerView } from '@/components/dashboard/BrandingCustomizerView';
import { ComplaintsView } from '@/components/dashboard/ComplaintsView';
import { InternalCommitteeView } from '@/components/dashboard/InternalCommitteeView';
import { IntegrationsView } from '@/components/dashboard/IntegrationsView';
import { QuizAssessmentModal } from '@/components/dashboard/QuizAssessmentModal';
import { SuperAdminDashboard } from '@/components/superadmin/SuperAdminDashboard';
import { PartnerDashboard } from '@/components/partner/PartnerDashboard';
import { EmployeeLearnerPortal } from '@/components/learner/EmployeeLearnerPortal';
import { ImportModal } from '@/components/modals/ImportModal';
import { apiClient } from '@/lib/api';
import { applyTheme } from '@/lib/brand';
import { CompanyLogo } from '@/components/brand/CompanyLogo';
import {
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Building2,
  Lock,
  ArrowRight,
  Sparkles,
  KeyRound,
  ChevronDown,
  ChevronUp,
  Shield,
  CheckCircle2,
  Layers,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [currentCompany, setCurrentCompany] = useState<any>(null);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [complianceDocs, setComplianceDocs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  
  // Super Admin / Partner Tenant Inspection Mode
  const [inspectedCompanyId, setInspectedCompanyId] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showDemoDrawer, setShowDemoDrawer] = useState(false);

  // Dashboard Data State
  const [kpis, setKpis] = useState({
    total_employees: 1250,
    training_completed: 1050,
    training_completed_pct: 84.0,
    assessment_completed: 980,
    assessment_completed_pct: 78.4,
    certificates_issued: 1020,
    certificates_issued_pct: 81.6,
    compliance_docs: 3,
    total_complaints: 3,
    resolved_complaints: 1,
    ic_members_count: 4,
  });

  const [departments, setDepartments] = useState<any[]>([]);
  const [assessmentBands, setAssessmentBands] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [webinars, setWebinars] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Restore session
  useEffect(() => {
    const savedToken = localStorage.getItem('posh_token');
    if (savedToken) {
      setToken(savedToken);
      fetchUserData();
    }
  }, []);

  const handleLogin = async (e?: React.FormEvent, directEmail?: string, directPassword?: string) => {
    if (e) e.preventDefault();
    const emailToUse = directEmail || loginEmail;
    const passwordToUse = directPassword || loginPassword;

    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await apiClient.post('/auth/login', {
        email: emailToUse,
        password: passwordToUse,
      });

      const { access_token, user: loggedUser } = res.data;
      localStorage.setItem('posh_token', access_token);
      setToken(access_token);
      setUser(loggedUser);
      setInspectedCompanyId(null);

      if (loggedUser.company_id) {
        setSelectedCompanyId(loggedUser.company_id);
        loadDashboardData(loggedUser.company_id);
      }
    } catch (err: any) {
      setLoginError(err.response?.data?.detail || 'Invalid corporate credentials');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('posh_token');
    setToken(null);
    setUser(null);
    setCurrentCompany(null);
    setInspectedCompanyId(null);
  };

  const fetchUserData = async () => {
    try {
      const res = await apiClient.get('/auth/me');
      setUser(res.data);
      if (res.data.company_id) {
        setSelectedCompanyId(res.data.company_id);
        loadDashboardData(res.data.company_id);
      }
    } catch (err) {
      handleLogout();
    }
  };

  const loadDashboardData = async (companyId?: string) => {
    setLoadingData(true);
    try {
      const compId = companyId || selectedCompanyId;
      const [kpiRes, deptRes, bandRes, stageRes, webRes, empRes, compRes, setRes, docRes, logRes, subRes] =
        await Promise.all([
          apiClient.get(`/dashboard/kpis?company_id=${compId}`).catch(() => ({ data: kpis })),
          apiClient.get(`/dashboard/departments?company_id=${compId}`).catch(() => ({ data: [] })),
          apiClient.get(`/dashboard/assessment-bands?company_id=${compId}`).catch(() => ({ data: [] })),
          apiClient.get(`/dashboard/stages?company_id=${compId}`).catch(() => ({ data: [] })),
          apiClient.get(`/dashboard/webinars?company_id=${compId}`).catch(() => ({ data: [] })),
          apiClient.get(`/employees?company_id=${compId}`).catch(() => ({ data: [] })),
          apiClient.get(`/companies/current?company_id=${compId}`).catch(() => ({ data: { name: 'Acme Corporation' } })),
          apiClient.get(`/companies/current/settings?company_id=${compId}`).catch(() => ({ data: null })),
          apiClient.get(`/documents?company_id=${compId}`).catch(() => ({ data: [] })),
          apiClient.get(`/audit-logs?company_id=${compId}`).catch(() => ({ data: [] })),
          apiClient.get('/company/subscription').catch(() => ({ data: null })),
        ]);

      setKpis(kpiRes.data);
      setDepartments(deptRes.data);
      setAssessmentBands(bandRes.data);
      setStages(stageRes.data);
      setWebinars(webRes.data);
      setEmployees(empRes.data);
      setCurrentCompany(compRes.data);
      setCompanySettings(setRes.data);
      setComplianceDocs(docRes.data);
      setAuditLogs(logRes.data);
      setSubscriptionDetails(subRes.data);

      applyTheme({
        primary_color: compRes.data.primary_color,
        secondary_color: compRes.data.secondary_color,
        accent_color: compRes.data.accent_color,
        sidebar_color: compRes.data.sidebar_color,
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'ALL' || emp.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const departmentList = Array.from(new Set(employees.map((e) => e.department))).filter(Boolean);

  // ==========================================
  // VIEW 1: ENTERPRISE AUTHENTICATION GATEWAY
  // ==========================================
  if (!token) {
    return (
      <div className="min-h-screen bg-[#061122] flex flex-col justify-center items-center p-6 select-none relative overflow-hidden">
        {/* Atmospheric background radial glows */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full bg-[#0A192F]/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 sm:p-9 shadow-2xl relative z-10">
          {/* Brand Header */}
          <div className="text-center mb-8">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-blue-500/20">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
              Multi-Tenant SaaS Gateway
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Enterprise PoSH Platform
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013
            </p>
          </div>

          <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Authorized Corporate Email
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#061122] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="name@company.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#061122] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="••••••••••••"
              />
            </div>

            {loginError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/25 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              {loginLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Authenticating Identity...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Compliance Gateway</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* 3-Tier Demo Accounts Drawer */}
          <div className="mt-7 pt-5 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowDemoDrawer(!showDemoDrawer)}
              className="w-full flex items-center justify-between p-3 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer text-xs"
            >
              <div className="flex items-center gap-2 font-medium">
                <KeyRound className="w-4 h-4 text-blue-400" />
                <span>Fast Login: 3-Tier Demo Accounts</span>
              </div>
              {showDemoDrawer ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            <AnimatePresence>
              {showDemoDrawer && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 space-y-3 overflow-hidden text-left"
                >
                  {/* LEVEL 0: PLATFORM CREATOR / HRYAAR TECH PERSON */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400 px-1 flex items-center justify-between">
                      <span>Level 0 &bull; HRYAAR Tech Person (Master User)</span>
                      <span className="text-[9px] text-blue-300 font-mono">tech@hryaar.com</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginEmail('tech@hryaar.com');
                        setLoginPassword('Admin@1234');
                        handleLogin(undefined, 'tech@hryaar.com', 'Admin@1234');
                      }}
                      className="w-full p-2.5 bg-slate-900 hover:bg-slate-800 border border-blue-500/30 rounded-xl text-left transition-colors flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <CompanyLogo name="HRYAAR" slug="hryaar" size="sm" />
                        <div>
                          <div className="font-semibold text-xs text-white flex items-center gap-2">
                            <span>HRYAAR Tech Master Console</span>
                            <span className="text-[9px] px-1.5 py-0.2 bg-blue-500/20 text-blue-300 rounded font-mono font-normal">Super Admin</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            HRYAAR Tech Lead &bull; Governs Wholesale Middlemen & Tenancy Core
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Tech Master
                      </span>
                    </button>
                  </div>

                  {/* LEVEL 1: MUTUALLY EXCLUSIVE MIDDLEMEN */}
                  <div className="space-y-1 pt-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 px-1">
                      Level 1 &bull; Middlemen (Assigners)
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginEmail('partner@talentpro.com');
                        setLoginPassword('Partner@1234');
                        handleLogin(undefined, 'partner@talentpro.com', 'Partner@1234');
                      }}
                      className="w-full p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-colors flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <CompanyLogo name="TalentPro" slug="talentpro" size="sm" />
                        <div>
                          <div className="font-semibold text-xs text-white">
                            TalentPro HR Advisory
                          </div>
                          <div className="text-[11px] text-slate-400">
                            5,000 Quota &bull; Resells to Acme & Nexus
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Partner A
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLoginEmail('partner@apex.com');
                        setLoginPassword('Partner@1234');
                        handleLogin(undefined, 'partner@apex.com', 'Partner@1234');
                      }}
                      className="w-full p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-colors flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <CompanyLogo name="Apex" slug="apex" size="sm" />
                        <div>
                          <div className="font-semibold text-xs text-white">
                            Apex Compliance
                          </div>
                          <div className="text-[11px] text-slate-400">
                            3,000 Quota &bull; Resells to Beta Precision
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Partner B
                      </span>
                    </button>
                  </div>

                  {/* LEVEL 2 & 3: CLIENT END-USERS / HR ANALYTICS */}
                  <div className="space-y-1 pt-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 px-1">
                      Level 2 & 3 &bull; Client HR Analytics
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setLoginEmail('hr@acme.com');
                        setLoginPassword('Acme@1234');
                        handleLogin(undefined, 'hr@acme.com', 'Acme@1234');
                      }}
                      className="w-full p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-colors flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <CompanyLogo name="Acme Corporation" slug="acme" size="sm" />
                        <div>
                          <div className="font-semibold text-xs text-white">
                            Acme Cloud Systems
                          </div>
                          <div className="text-[11px] text-slate-400">
                            1,250 Learners &bull; Managed by TalentPro
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Client
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLoginEmail('hr@nexusbio.com');
                        setLoginPassword('Nexus@1234');
                        handleLogin(undefined, 'hr@nexusbio.com', 'Nexus@1234');
                      }}
                      className="w-full p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-colors flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <CompanyLogo name="Nexus BioHealth" slug="nexusbio" size="sm" />
                        <div>
                          <div className="font-semibold text-xs text-white">
                            Nexus Health & BioSciences
                          </div>
                          <div className="text-[11px] text-slate-400">
                            450 Learners &bull; Managed by TalentPro
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Client
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLoginEmail('hr@beta.com');
                        setLoginPassword('Beta@1234');
                        handleLogin(undefined, 'hr@beta.com', 'Beta@1234');
                      }}
                      className="w-full p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-colors flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <CompanyLogo name="Beta Industries" slug="beta" size="sm" />
                        <div>
                          <div className="font-semibold text-xs text-white">
                            Beta Precision Manufacturing
                          </div>
                          <div className="text-[11px] text-slate-400">
                            600 Learners &bull; Managed by Apex
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Client
                      </span>
                    </button>
                  </div>

                  {/* LEVEL 3: MANDATED EMPLOYEES / LEARNERS */}
                  <div className="space-y-1 pt-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-violet-400 px-1">
                      Level 3 &bull; Mandated Employee / Learner Portal
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setLoginEmail('rohan.reddy194@acmecorp.com');
                        setLoginPassword('Employee@1234');
                        handleLogin(undefined, 'rohan.reddy194@acmecorp.com', 'Employee@1234');
                      }}
                      className="w-full p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-colors flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <CompanyLogo name="Acme Corporation" slug="acme" size="sm" />
                        <div>
                          <div className="font-semibold text-xs text-white">
                            Rohan Reddy (Acme Employee)
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Code: ACM-1194 &bull; Training in progress
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        Learner
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLoginEmail('ananya.mehta1@acmecorp.com');
                        setLoginPassword('Employee@1234');
                        handleLogin(undefined, 'ananya.mehta1@acmecorp.com', 'Employee@1234');
                      }}
                      className="w-full p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-colors flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <CompanyLogo name="Acme Corporation" slug="acme" size="sm" />
                        <div>
                          <div className="font-semibold text-xs text-white">
                            Ananya Mehta (Acme Employee)
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Code: ACM-1001 &bull; 100% Certified
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Certified
                      </span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: SUPER ADMIN DASHBOARD (LEVEL 0)
  // ==========================================
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'PLATFORM_ADMIN';
  const isPartnerAdmin = user?.role === 'PARTNER_ADMIN';
  const isEmployee = user?.role === 'EMPLOYEE';

  if (isSuperAdmin && !inspectedCompanyId) {
    return (
      <SuperAdminDashboard
        user={user}
        onLogout={handleLogout}
        onInspectTenant={(companyId) => {
          setInspectedCompanyId(companyId);
          setSelectedCompanyId(companyId);
          loadDashboardData(companyId);
        }}
      />
    );
  }

  // ==========================================
  // VIEW 3: MIDDLEMAN PARTNER PORTAL (LEVEL 1)
  // ==========================================
  if (isPartnerAdmin && !inspectedCompanyId) {
    return (
      <PartnerDashboard
        user={user}
        onLogout={handleLogout}
        onInspectClient={(companyId) => {
          setInspectedCompanyId(companyId);
          setSelectedCompanyId(companyId);
          loadDashboardData(companyId);
        }}
      />
    );
  }

  // ==========================================
  // VIEW 4: EMPLOYEE / LEARNER PORTAL (LEVEL 3)
  // ==========================================
  if (isEmployee) {
    return (
      <EmployeeLearnerPortal
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  // ==========================================
  // VIEW 4: CLIENT DASHBOARD (LEVEL 2 & 3)
  // ==========================================
  const activeCompany = currentCompany;
  const primaryBrandColor = activeCompany?.primary_color || '#2A62FF';
  const sidebarBrandColor = activeCompany?.sidebar_color || '#061122';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex">
      {/* Sleek Modern Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        userRole={user?.role}
        companyName={activeCompany?.name || user?.company_name || 'Enterprise Client'}
        logoUrl={activeCompany?.logo_url}
        primaryColor={primaryBrandColor}
        sidebarColor={sidebarBrandColor}
        partnerName={activeCompany?.partner_name || user?.partner_name}
        coBrandingMode={activeCompany?.co_branding_mode || user?.co_branding_mode}
        onLogout={handleLogout}
        isSuperAdminSupervision={(isSuperAdmin || isPartnerAdmin) && !!inspectedCompanyId}
        onReturnToSuperAdmin={() => setInspectedCompanyId(null)}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#F8FAFC]">
        <Header
          userName={user?.full_name || 'HR Administrator'}
          userRole={user?.role || 'COMPANY_ADMIN'}
          companyName={activeCompany?.name || user?.company_name || 'Enterprise'}
          logoUrl={activeCompany?.logo_url}
          primaryColor={primaryBrandColor}
          partnerName={activeCompany?.partner_name || user?.partner_name}
          partnerLogoUrl={activeCompany?.partner_logo_url || user?.partner_logo_url}
          coBrandingMode={activeCompany?.co_branding_mode || user?.co_branding_mode}
          onImportClick={() => setIsImportModalOpen(true)}
          isSuperAdminSupervision={(isSuperAdmin || isPartnerAdmin) && !!inspectedCompanyId}
          onReturnToSuperAdmin={() => setInspectedCompanyId(null)}
          onNavigateToComplaints={() => setCurrentTab('complaints')}
        />

        <main className="p-8 space-y-7 max-w-7xl w-full mx-auto pb-16">
          {/* TAB 1: EXECUTIVE PULSE (MAIN DASHBOARD - STRICTLY 7 ITEMS) */}
          {currentTab === 'dashboard' && (
            <>
              {/* Modern Welcome Banner */}
              <div className="bg-gradient-to-r from-white via-white to-blue-50/50 rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <CompanyLogo
                    name={activeCompany?.name}
                    slug={activeCompany?.slug}
                    logoUrl={activeCompany?.logo_url}
                    primaryColor={primaryBrandColor}
                    size="lg"
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-full">
                        Mandatory Cycle Active
                      </span>
                      <span className="text-slate-400 text-xs">&bull;</span>
                      <span className="text-xs font-semibold text-slate-800">
                        {activeCompany?.name}
                      </span>
                      {activeCompany?.industry && (
                        <>
                          <span className="text-slate-400 text-xs">&bull;</span>
                          <span className="text-xs text-slate-500 font-medium">{activeCompany.industry}</span>
                        </>
                      )}
                    </div>

                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      {activeCompany?.welcome_message || 'Statutory Sensitization & Assessment Dashboard'}
                    </h2>

                    <p className="text-xs text-slate-500 mt-1.5 max-w-2xl font-medium leading-relaxed">
                      Corporate monitoring under the Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013. Monitor employee progress, live webinars, and maintain audit records.
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center">
                  <button
                    onClick={() => loadDashboardData(selectedCompanyId)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
                    <span>Sync Data</span>
                  </button>
                </div>
              </div>

              {/* 1. Core KPIs: Employees, Completion Rate, Assessment Success Rate */}
              <KPICards kpis={kpis} />

              {/* 2 & 3. Live Webinars with Email All (from CSV) and Auto Reminders (7-day & 2-day) */}
              <LiveWebinarsView
                webinars={webinars}
                totalEmployees={kpis.total_employees}
                companyName={activeCompany?.name || 'Company'}
                onRefresh={() => loadDashboardData(selectedCompanyId)}
              />

              {/* 4. Department-Wise Completion Rate */}
              <DepartmentCompletionView departments={departments} />

              {/* 5. Individual Employee Audit Roster */}
              <EmployeeTable
                employees={filteredEmployees}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedDept={selectedDept}
                setSelectedDept={setSelectedDept}
                departments={departmentList}
              />
            </>
          )}

          {/* TAB 2: POSH STATUTORY COMPLAINTS */}
          {currentTab === 'complaints' && (
            <ComplaintsView companyName={activeCompany?.name || 'Company'} />
          )}

          {/* TAB 3: INTERNAL COMMITTEE (IC) CONSTITUTION */}
          {currentTab === 'ic-members' && (
            <InternalCommitteeView companyName={activeCompany?.name || 'Company'} />
          )}

          {/* TAB 4: WHITE-LABEL BRANDING CUSTOMIZER */}
          {currentTab === 'branding' && (
            <BrandingCustomizerView
              company={activeCompany}
              onRefresh={() => loadDashboardData(selectedCompanyId)}
            />
          )}

          {/* TAB 5: TENANT PROFILE */}
          {currentTab === 'organisation' && (
            <TenantProfileView company={activeCompany} kpis={kpis} />
          )}

          {/* TAB 6: EMPLOYEE REGISTRY ONLY */}
          {currentTab === 'employees' && (
            <EmployeeTable
              employees={filteredEmployees}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedDept={selectedDept}
              setSelectedDept={setSelectedDept}
              departments={departmentList}
            />
          )}

          {/* TAB 7: COMPLIANCE DOCUMENTS */}
          {currentTab === 'compliance' && (
            <ComplianceDocsView
              documents={complianceDocs}
              companyName={activeCompany?.name || 'Company'}
              onOpenQuiz={() => setIsQuizModalOpen(true)}
            />
          )}

          {/* TAB 8: LMS & WEBHOOK INTEGRATIONS */}
          {currentTab === 'integrations' && (
            <IntegrationsView
              companyName={activeCompany?.name || 'Company'}
              onSyncComplete={() => loadDashboardData(selectedCompanyId)}
            />
          )}

          {/* TAB 9: MANDATORY POSH QUIZ ENTRY */}
          {currentTab === 'quiz' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center max-w-2xl mx-auto space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center border border-blue-100 shadow-xs">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Statutory Workplace Harassment Certification
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-lg mx-auto">
                Take the scenario quiz under the Sexual Harassment of Women at Workplace Act 2013. Scoring 70% or higher automatically issues a verifiable digital completion certificate recorded in your company&apos;s annual Section 21 return.
              </p>
              <button
                onClick={() => setIsQuizModalOpen(true)}
                className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Launch Statutory Assessment
              </button>
            </div>
          )}

          {/* TAB 10: TENANT COMPLIANCE SETTINGS */}
          {currentTab === 'settings' && (
            <CompanySettingsView
              settings={companySettings}
              companyId={selectedCompanyId}
              onRefresh={() => loadDashboardData(selectedCompanyId)}
            />
          )}

          {/* TAB 11: AUDIT TRAIL */}
          {currentTab === 'audit' && (
            <AuditTrailView logs={auditLogs} />
          )}
        </main>

        {/* Clean Modern Footer */}
        <footer className="mt-auto py-4 px-8 border-t border-slate-200/80 bg-white text-center text-xs text-slate-500 font-medium flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-slate-700 font-semibold">
            {activeCompany?.name || 'Corporate'} PoSH Operating System &bull; CY 2025–2026 Mandate
          </div>
          <div className="text-slate-400 text-[11px]">
            HRYAAR Digi-PoSH &bull; Awareness | Respect | Dignity at Workplace
          </div>
        </footer>
      </div>

      {/* CSV Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        companyId={selectedCompanyId}
        onSuccess={() => loadDashboardData(selectedCompanyId)}
      />

      {/* Mandatory Statutory Quiz & Certificate Modal */}
      <QuizAssessmentModal
        isOpen={isQuizModalOpen}
        onClose={() => setIsQuizModalOpen(false)}
        companyName={activeCompany?.name || 'Company'}
        onCertificateIssued={() => loadDashboardData(selectedCompanyId)}
      />
    </div>
  );
}
