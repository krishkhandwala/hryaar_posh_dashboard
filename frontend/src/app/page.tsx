'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { KPICards } from '@/components/dashboard/KPICards';
import { AnalyticsCharts } from '@/components/dashboard/AnalyticsCharts';
import { ProgramProgress } from '@/components/dashboard/ProgramProgress';
import { EmployeeTable } from '@/components/dashboard/EmployeeTable';
import { CompanySettingsView } from '@/components/dashboard/CompanySettingsView';
import { ComplianceDocsView } from '@/components/dashboard/ComplianceDocsView';
import { TenantProfileView } from '@/components/dashboard/TenantProfileView';
import { AuditTrailView } from '@/components/dashboard/AuditTrailView';
import { ImportModal } from '@/components/modals/ImportModal';
import { apiClient } from '@/lib/api';
import { ShieldCheck, RefreshCw, AlertCircle, Sparkles, Building2, Lock, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [currentCompany, setCurrentCompany] = useState<any>(null);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [complianceDocs, setComplianceDocs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('c-acme-corp-1250');
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('hr@acme.com');
  const [loginPassword, setLoginPassword] = useState('Acme@1234');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Dashboard Data State
  const [kpis, setKpis] = useState({
    total_employees: 1250,
    training_completed: 1050,
    training_completed_pct: 84.0,
    assessment_completed: 1020,
    assessment_completed_pct: 81.6,
    certificates_issued: 1020,
    certificates_issued_pct: 81.6,
    compliance_docs: 3,
  });

  const [departments, setDepartments] = useState<any[]>([]);
  const [assessmentBands, setAssessmentBands] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [webinars, setWebinars] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Restore session
  useEffect(() => {
    const savedToken = localStorage.getItem('posh_token');
    if (savedToken) {
      setToken(savedToken);
      fetchUserData(savedToken);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await apiClient.post('/auth/login', {
        email: loginEmail,
        password: loginPassword,
      });
      const data = res.data;
      localStorage.setItem('posh_token', data.access_token);
      setToken(data.access_token);
      setUser(data);
      if (data.company_id) {
        setSelectedCompanyId(data.company_id);
      }
      loadDashboardData(data.company_id || 'c-acme-corp-1250');
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
  };

  const fetchUserData = async (tok: string) => {
    try {
      const res = await apiClient.get('/auth/me');
      setUser(res.data);
      if (res.data.company_id) {
        setSelectedCompanyId(res.data.company_id);
        loadDashboardData(res.data.company_id);
      } else {
        loadCompanies();
        loadDashboardData(selectedCompanyId);
      }
    } catch {
      handleLogout();
    }
  };

  const loadCompanies = async () => {
    try {
      const res = await apiClient.get('/companies');
      setCompanies(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadDashboardData = async (compId: string) => {
    setLoadingData(true);
    try {
      const [kpiRes, deptRes, bandRes, stageRes, webRes, empRes, compRes, setRes, docRes, logRes] = await Promise.all([
        apiClient.get(`/dashboard/kpis?company_id=${compId}`),
        apiClient.get(`/dashboard/departments?company_id=${compId}`),
        apiClient.get(`/dashboard/assessment-bands?company_id=${compId}`),
        apiClient.get(`/dashboard/program-stages?company_id=${compId}`),
        apiClient.get(`/dashboard/webinars?company_id=${compId}`),
        apiClient.get(`/employees?company_id=${compId}&limit=100`),
        apiClient.get(`/companies/current?company_id=${compId}`),
        apiClient.get(`/companies/current/settings?company_id=${compId}`),
        apiClient.get(`/documents?company_id=${compId}`),
        apiClient.get(`/audit-logs?company_id=${compId}`),
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

  // Distinctive Enterprise Login Portal
  if (!token) {
    return (
      <div className="min-h-screen bg-[#061122] flex flex-col justify-center items-center p-6 relative overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#2A62FF]/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] p-8 border border-slate-100 relative z-10"
        >
          <div className="text-center mb-7">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#2A62FF] to-[#1D4ED8] flex items-center justify-center font-black text-white text-xl mx-auto mb-4 shadow-[0_8px_20px_rgba(42,98,255,0.35)] border border-blue-400/30">
              H
            </div>
            <h2 className="text-2xl font-black text-[#0A192F] tracking-tight">
              HRYAAR Digi-PoSH
            </h2>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Enterprise Prevention of Sexual Harassment Management
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Authorized Corporate Email
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2A62FF] transition-all"
                placeholder="name@company.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2A62FF] transition-all"
              />
            </div>

            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-semibold">{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 bg-gradient-to-r from-[#2A62FF] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1E40AF] text-white font-bold text-xs rounded-xl transition-all shadow-[0_4px_16px_rgba(42,98,255,0.35)] active:scale-95 cursor-pointer"
            >
              {loginLoading ? 'Authenticating...' : 'Sign In to Digi-PoSH Portal'}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-7 pt-5 border-t border-slate-100">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider text-center mb-3">
              One-Click Multi-Tenant Demo Portals
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setLoginEmail('hr@acme.com');
                  setLoginPassword('Acme@1234');
                }}
                className="p-3 bg-slate-50 hover:bg-blue-50/60 border border-slate-200/80 rounded-xl text-left transition-colors group cursor-pointer"
              >
                <div className="font-bold text-[#0A192F] group-hover:text-[#2A62FF]">Acme Corp HR</div>
                <div className="text-[10px] text-slate-500 font-medium">1,250 Employees (Tech)</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginEmail('hr@beta.com');
                  setLoginPassword('Beta@1234');
                }}
                className="p-3 bg-slate-50 hover:bg-blue-50/60 border border-slate-200/80 rounded-xl text-left transition-colors group cursor-pointer"
              >
                <div className="font-bold text-[#0A192F] group-hover:text-[#2A62FF]">Beta Ind. HR</div>
                <div className="text-[10px] text-slate-500 font-medium">600 Employees (Mfg)</div>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F8FC] flex">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        userRole={user?.role}
        companyName={currentCompany?.name || user?.company_name || 'Acme Corporation'}
        onLogout={handleLogout}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        <Header
          userName={user?.full_name || 'HR Administrator'}
          userRole={user?.role || 'HR_ADMIN'}
          companyName={currentCompany?.name || user?.company_name || 'Acme Corporation'}
          companies={companies}
          selectedCompanyId={selectedCompanyId}
          onCompanyChange={(id) => {
            setSelectedCompanyId(id);
            loadDashboardData(id);
          }}
          onImportClick={() => setIsImportModalOpen(true)}
        />

        <main className="p-7 space-y-6 max-w-7xl w-full mx-auto pb-12">
          {/* TAB 1: EXECUTIVE PULSE (MAIN DASHBOARD) */}
          {currentTab === 'dashboard' && (
            <>
              {/* Executive Overview Hero Banner */}
              <div className="bg-gradient-to-r from-white via-white to-blue-50/30 rounded-2xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-extrabold uppercase bg-blue-50 text-[#2A62FF] px-2 py-0.5 rounded-md border border-blue-200/60">
                      Annual Compliance Cycle
                    </span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="text-xs font-semibold text-slate-500">
                      {currentCompany?.name || 'Acme Corporation'}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-[#0A192F] tracking-tight">
                    Statutory Sensitization & Assessment Dashboard
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 font-medium max-w-2xl leading-relaxed">
                    Mandatory monitoring under the Sexual Harassment of Women at Workplace Act, 2013. Ingest LMS logs, run tests, and export certified records.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => loadDashboardData(selectedCompanyId)}
                    className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#2A62FF] ${loadingData ? 'animate-spin' : ''}`} />
                    <span>Sync Data</span>
                  </button>
                </div>
              </div>

              {/* 1. Core KPIs */}
              <KPICards kpis={kpis} />

              {/* 2. Program Roadmap & Workshops */}
              <ProgramProgress
                stages={stages}
                overallPct={kpis.training_completed_pct}
                webinars={webinars}
              />

              {/* 3. Analytics Charts */}
              <AnalyticsCharts
                departments={departments}
                bands={assessmentBands}
              />

              {/* 4. Employee Audit Table */}
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

          {/* TAB 2: TENANT PROFILE */}
          {currentTab === 'organisation' && (
            <TenantProfileView company={currentCompany} kpis={kpis} />
          )}

          {/* TAB 3: EMPLOYEE REGISTRY ONLY */}
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

          {/* TAB 4: COMPLIANCE DOCUMENTS */}
          {currentTab === 'compliance' && (
            <ComplianceDocsView
              documents={complianceDocs}
              companyName={currentCompany?.name || 'Company'}
            />
          )}

          {/* TAB 5: TENANT SETTINGS */}
          {currentTab === 'settings' && (
            <CompanySettingsView
              settings={companySettings}
              companyId={selectedCompanyId}
              onRefresh={() => loadDashboardData(selectedCompanyId)}
            />
          )}

          {/* TAB 6: AUDIT TRAIL */}
          {currentTab === 'audit' && (
            <AuditTrailView logs={auditLogs} />
          )}
        </main>

        <footer className="mt-auto py-4 px-7 border-t border-slate-200/60 bg-white text-center text-xs text-slate-400 font-medium">
          HRYAAR Digi-PoSH &copy; 2026. Enterprise Multi-Tenant Platform &bull; Awareness | Respect | Safer Workplaces.
        </footer>
      </div>

      {/* Import CSV Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        companyId={selectedCompanyId}
        onSuccess={() => loadDashboardData(selectedCompanyId)}
      />
    </div>
  );
}
