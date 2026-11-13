'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Download, CheckCircle2, Clock, ShieldCheck, ShieldAlert, AlertTriangle, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import confetti from 'canvas-confetti';

interface EmployeeTableProps {
  employees: Array<{
    id: string;
    employee_code: string;
    first_name: string;
    last_name: string;
    email: string;
    department: string;
    training_status: string;
    training_progress_pct: number;
    assessment_status: string;
    assessment_score: number | null;
    certificate_status: string;
    certificate_id: string | null;
  }>;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  selectedDept: string;
  setSelectedDept: (d: string) => void;
  departments: string[];
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({
  employees,
  searchTerm,
  setSearchTerm,
  selectedDept,
  setSelectedDept,
  departments,
}) => {
  const [page, setPage] = useState(1);
  const [assessmentFilter, setAssessmentFilter] = useState<'ALL' | 'FAILED' | 'PASSED' | 'PENDING'>('ALL');
  const [scoreThreshold, setScoreThreshold] = useState<number>(70);
  const pageSize = 25;

  // Compute counts
  const failedCount = useMemo(() => {
    return employees.filter(
      (e) => e.assessment_status === 'FAILED' || (e.assessment_score !== null && e.assessment_score < scoreThreshold)
    ).length;
  }, [employees, scoreThreshold]);

  const passedCount = useMemo(() => {
    return employees.filter(
      (e) => e.assessment_status === 'PASSED' || (e.assessment_score !== null && e.assessment_score >= scoreThreshold)
    ).length;
  }, [employees, scoreThreshold]);

  const pendingCount = useMemo(() => {
    return employees.filter(
      (e) => !e.assessment_status || e.assessment_status === 'NOT_ATTEMPTED' || e.assessment_status === 'PENDING'
    ).length;
  }, [employees]);

  // Filtered dataset
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // 1. Search filter
      const matchesSearch =
        !searchTerm ||
        emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      // 2. Department filter
      const matchesDept = selectedDept === 'ALL' || emp.department === selectedDept;
      if (!matchesDept) return false;

      // 3. Assessment status / score threshold filter
      if (assessmentFilter === 'FAILED') {
        const isFailed =
          emp.assessment_status === 'FAILED' ||
          (emp.assessment_score !== null && emp.assessment_score < scoreThreshold);
        if (!isFailed) return false;
      } else if (assessmentFilter === 'PASSED') {
        const isPassed =
          emp.assessment_status === 'PASSED' ||
          (emp.assessment_score !== null && emp.assessment_score >= scoreThreshold);
        if (!isPassed) return false;
      } else if (assessmentFilter === 'PENDING') {
        const isPending =
          !emp.assessment_status ||
          emp.assessment_status === 'NOT_ATTEMPTED' ||
          emp.assessment_status === 'PENDING';
        if (!isPending) return false;
      }

      return true;
    });
  }, [employees, searchTerm, selectedDept, assessmentFilter, scoreThreshold]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedDept, assessmentFilter, scoreThreshold]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const startIndex = (page - 1) * pageSize;
  const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + pageSize);

  const getTrainingBadge = (status: string, pct: number) => {
    if (status === 'COMPLETED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-full">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>100% Certified</span>
        </span>
      );
    }
    if (status === 'IN_PROGRESS') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200/60 rounded-full">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>{pct}% Ongoing</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-slate-500 bg-slate-100 rounded-full">
        Not Started
      </span>
    );
  };

  const getAssessmentBadge = (status: string, score: number | null) => {
    if (status === 'PASSED' || (score !== null && score >= scoreThreshold)) {
      return (
        <span className="font-semibold text-xs text-emerald-700 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>{score ?? 100}% Passed</span>
        </span>
      );
    }
    if (status === 'FAILED' || (score !== null && score < scoreThreshold)) {
      return (
        <span className="font-semibold text-xs text-rose-600 flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
          <span>{score ?? 0}% Needs Retest (&lt;{scoreThreshold}%)</span>
        </span>
      );
    }
    return <span className="text-xs text-slate-400 font-medium">Pending Attempt</span>;
  };

  const exportCSV = () => {
    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.85 }
    });

    const headers = ['Employee Code', 'Full Name', 'Corporate Email', 'Department', 'Module Progress', 'Assessment Status', 'Assessment Score'];
    const rows = filteredEmployees.map(e => [
      e.employee_code,
      `"${e.first_name} ${e.last_name}"`,
      e.email,
      e.department,
      `${e.training_progress_pct}%`,
      e.assessment_status || 'PENDING',
      e.assessment_score !== null ? `${e.assessment_score}%` : 'N/A'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const filterSuffix = assessmentFilter === 'FAILED' ? '_FAILED_RETEST_LIST' : '';
    link.setAttribute('download', `hryaar_posh_audit_roster${filterSuffix}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-100 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/60">
              Audit Roster
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Individual Employee Audit Roster
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl font-medium leading-relaxed">
            Granular employee records for statutory verification, internal committee inspection, and annual returns.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Field */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search code, name, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 w-56 sm:w-64 transition-all"
            />
          </div>

          {/* Department Filter */}
          <div className="relative">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:bg-white focus:border-blue-500 cursor-pointer transition-all"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={exportCSV}
            className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Roster</span>
          </button>
        </div>
      </div>

      {/* Benchmark Filter Tabs & Threshold Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setAssessmentFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              assessmentFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>All Employees ({employees.length})</span>
          </button>

          <button
            onClick={() => setAssessmentFilter('FAILED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              assessmentFilter === 'FAILED'
                ? 'bg-rose-600 text-white shadow-xs'
                : failedCount > 0
                ? 'bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-100'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Below Benchmark / Failed ({failedCount})</span>
            {failedCount > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping inline-block" />
            )}
          </button>

          <button
            onClick={() => setAssessmentFilter('PASSED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              assessmentFilter === 'PASSED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200/60 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Certified ({passedCount})</span>
          </button>

          <button
            onClick={() => setAssessmentFilter('PENDING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              assessmentFilter === 'PENDING'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>Pending Attempt ({pendingCount})</span>
          </button>
        </div>

        {/* Threshold Selector */}
        <div className="flex items-center gap-2 shrink-0 text-xs">
          <span className="text-slate-500 font-medium">Benchmark Threshold:</span>
          <select
            value={scoreThreshold}
            onChange={(e) => setScoreThreshold(Number(e.target.value))}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:border-blue-500 cursor-pointer"
          >
            <option value={70}>70% (PoSH Statutory)</option>
            <option value={80}>80% (Advanced Tier)</option>
            <option value={60}>60% (Minimum Compliance)</option>
            <option value={50}>50% (Basic)</option>
          </select>
        </div>
      </div>

      {/* Audit Table */}
      <div className="border border-slate-200/80 rounded-xl overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200/80">
            <tr>
              <th className="py-3.5 px-4 font-semibold">Code</th>
              <th className="py-3.5 px-4 font-semibold">Employee Identity</th>
              <th className="py-3.5 px-4 font-semibold">Department</th>
              <th className="py-3.5 px-4 font-semibold">Training Status</th>
              <th className="py-3.5 px-4 font-semibold">Assessment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {paginatedEmployees.length > 0 ? (
              paginatedEmployees.map((emp) => {
                const isEmpFailed =
                  emp.assessment_status === 'FAILED' ||
                  (emp.assessment_score !== null && emp.assessment_score < scoreThreshold);
                return (
                  <tr
                    key={emp.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isEmpFailed ? 'bg-rose-50/40' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-blue-700">
                      {emp.employee_code}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 leading-tight">
                        {emp.first_name} {emp.last_name}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                        {emp.email}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {emp.department}
                    </td>
                    <td className="py-3.5 px-4">
                      {getTrainingBadge(emp.training_status, emp.training_progress_pct)}
                    </td>
                    <td className="py-3.5 px-4">
                      {getAssessmentBadge(emp.assessment_status, emp.assessment_score)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 font-medium text-sm">
                  No employee audit records match your search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 font-medium">
        <span>
          Showing {employees.length === 0 ? 0 : startIndex + 1}&ndash;{Math.min(startIndex + pageSize, employees.length)} of {employees.length.toLocaleString()} records
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer inline-flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <span className="tabular-nums text-slate-600 px-1">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer inline-flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
