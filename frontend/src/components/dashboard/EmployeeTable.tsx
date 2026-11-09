'use client';

import React from 'react';
import { Search, Filter, Download, CheckCircle2, Clock, UserCheck, ShieldCheck } from 'lucide-react';
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
    if (status === 'PASSED') {
      return (
        <span className="font-semibold text-xs text-emerald-700 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>{score}% Passed</span>
        </span>
      );
    }
    if (status === 'FAILED') {
      return (
        <span className="font-semibold text-xs text-rose-600">
          {score}% Needs Retest
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

    const headers = ['Employee Code', 'Full Name', 'Corporate Email', 'Department', 'Module Progress', 'Assessment Score', 'Certificate Id'];
    const rows = employees.map(e => [
      e.employee_code,
      `"${e.first_name} ${e.last_name}"`,
      e.email,
      e.department,
      `${e.training_progress_pct}%`,
      e.assessment_score ? `${e.assessment_score}%` : 'N/A',
      e.certificate_id || 'Pending'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hryaar_posh_audit_roster_${new Date().toISOString().slice(0, 10)}.csv`);
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
              <th className="py-3.5 px-4 font-semibold">Certificate ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {employees.length > 0 ? (
              employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
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
                  <td className="py-3.5 px-4">
                    {emp.certificate_id ? (
                      <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {emp.certificate_id}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs font-medium">Pending</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 font-medium text-sm">
                  No employee audit records match your search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pt-2 flex items-center justify-between text-xs text-slate-500 font-medium">
        <span>Showing {employees.length} records under active statutory mandate</span>
        <span className="text-slate-600 font-semibold">Section 21 Redressal & Verification Standard</span>
      </div>
    </section>
  );
};
