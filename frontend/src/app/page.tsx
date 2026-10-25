'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { KPICards } from '@/components/dashboard/KPICards';
import { AnalyticsCharts } from '@/components/dashboard/AnalyticsCharts';
import { ProgramProgress } from '@/components/dashboard/ProgramProgress';
import { EmployeeTable } from '@/components/dashboard/EmployeeTable';
import { ImportModal } from '@/components/modals/ImportModal';
import { apiClient } from '@/lib/api';
import { ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';

export default function Home() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
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

  // Attempt to restore token
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
      setLoginError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoginLoading(false);
    }
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
      localStorage.removeItem('posh_token');
      setToken(null);
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
      const [kpiRes, deptRes, bandRes, stageRes, webRes, empRes] = await Promise.all([
        apiClient.get(`/dashboard/kpis?company_id=${compId}`),
        apiClient.get(`/dashboard/departments?company_id=${compId}`),
        apiClient.get(`/dashboard/assessment-bands?company_id=${compId}`),
        apiClient.get(`/dashboard/program-stages?company_id=${compId}`),
        apiClient.get(`/dashboard/webinars?company_id=${compId}`),
        apiClient.get(`/employees?company_id=${compId}&limit=100`),
      ]);

      setKpis(kpiRes.data);
      setDepartments(deptRes.data);
      setAssessmentBands(bandRes.data);
      setStages(stageRes.data);
      setWebinars(webRes.data);
      setEmployees(empRes.data);
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

  // If not logged in, show polished enterprise login portal
  if (!token) {
    return (
      <div className="min-h-screen bg-[#0B1D3A] flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#315FD1] to-[#60A5FA] flex items-center justify-center font-black text-white text-xl mx-auto mb-3 shadow-lg">
              H
            </div>
            <h2 className="text-2xl font-black text-[#0D2345] tracking-tight">
              HRYAAR Digi-PoSH
            </h2>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Awareness | Respect | Safer Workplaces
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Corporate Email
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#315FD1]"
                placeholder="name@company.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#315FD1]"
              />
            </div>

            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-2.5 bg-[#315FD1] hover:bg-[#254cb2] text-white font-bold text-xs rounded-lg transition-all shadow-md"
            >
              {loginLoading ? 'Authenticating...' : 'Sign In to Digi-PoSH Portal'}
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2.5">
              Instant Demo Accounts
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setLoginEmail('hr@acme.com');
                  setLoginPassword('Acme@1234');
                }}
                className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-left font-medium text-slate-700"
              >
                <div className="font-bold text-[#0D2345]">Acme Corp HR</div>
                <div className="text-[10px] text-slate-500">1,250 Employees</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginEmail('hr@beta.com');
                  setLoginPassword('Beta@1234');
                }}
                className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-left font-medium text-slate-700"
              >
                <div className="font-bold text-[#0D2345]">Beta Ind. HR</div>
                <div className="text-[10px] text-slate-500">600 Employees</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F8FD] flex">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        userRole={user?.role}
        companyName={user?.company_name || 'Acme Corporation'}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        <Header
          userName={user?.full_name || 'HR Administrator'}
          userRole={user?.role || 'HR_ADMIN'}
          companyName={user?.company_name || 'Acme Corporation'}
          companies={companies}
          selectedCompanyId={selectedCompanyId}
          onCompanyChange={(id) => {
            setSelectedCompanyId(id);
            loadDashboardData(id);
          }}
          onImportClick={() => setIsImportModalOpen(true)}
        />

        <main className="p-6 space-y-6 max-w-7xl w-full mx-auto">
          {/* Welcome Capsule Banner */}
          <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-[#0D2345] tracking-tight">
                {user?.company_name || 'Acme Corporation'} PoSH Overview
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Mandatory employee sensitization compliance under the Sexual Harassment of Women at Workplace Act, 2013.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => loadDashboardData(selectedCompanyId)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
                <span>Sync Metrics</span>
              </button>
            </div>
          </div>

          {/* 1. Dashboard KPI Cards */}
          <KPICards kpis={kpis} />

          {/* 2. Program Progress Roadmap & Upcoming IC Sessions */}
          <ProgramProgress
            stages={stages}
            overallPct={kpis.training_completed_pct}
            webinars={webinars}
          />

          {/* 3. Analytics Charts (Department Progress & Score Band Distribution) */}
          <AnalyticsCharts
            departments={departments}
            bands={assessmentBands}
          />

          {/* 4. Employee Table with Search, Filter & CSV Export */}
          <EmployeeTable
            employees={filteredEmployees}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedDept={selectedDept}
            setSelectedDept={setSelectedDept}
            departments={departmentList}
          />
        </main>

        {/* Compact Footer */}
        <footer className="mt-auto py-4 px-6 border-t border-slate-200/60 bg-white text-center text-xs text-slate-400">
          HRYAAR Digi-PoSH &copy; 2026. Awareness | Respect | Safer Workplaces. Production Multi-Tenant Platform.
        </footer>
      </div>

      {/* CSV Ingestion Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        companyId={selectedCompanyId}
        onSuccess={() => loadDashboardData(selectedCompanyId)}
      />
    </div>
  );
}
