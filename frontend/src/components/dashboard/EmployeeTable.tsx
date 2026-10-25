'use client';

import React from 'react';
import { Search, Filter, Download, CheckCircle2, Clock, XCircle, ShieldAlert } from 'lucide-react';

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
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Completed (100%)
        </span>
      );
    }
    if (status === 'IN_PROGRESS') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          In Progress ({pct}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
        Not Started (0%)
      </span>
    );
  };

  const getAssessmentBadge = (status: string, score: number | null) => {
    if (status === 'PASSED') {
      return (
        <span className="font-bold text-xs text-emerald-600">
          Passed ({score}%)
        </span>
      );
    }
    if (status === 'FAILED') {
      return (
        <span className="font-bold text-xs text-rose-500">
          Failed ({score}%)
        </span>
      );
    }
    return <span className="text-xs text-slate-400 font-medium">Pending</span>;
  };

  const exportCSV = () => {
    const headers = ['Employee Code', 'Name', 'Email', 'Department', 'Training Status', 'Progress', 'Assessment Score', 'Certificate'];
    const rows = employees.map(e => [
      e.employee_code,
      `"${e.first_name} ${e.last_name}"`,
      e.email,
      e.department,
      e.training_status,
      `${e.training_progress_pct}%`,
      e.assessment_score ? `${e.assessment_score}%` : 'N/A',
      e.certificate_id || 'Pending'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hryaar_posh_audit_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-[#0D2345] text-sm">
            Employee Compliance Records & Audit Trail
          </h3>
          <p className="text-[11px] text-slate-500">
            Real-time individual employee tracking for statutory inspection
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search code, name, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#315FD1]"
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Export Report */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <th className="py-3 px-4">Code</th>
              <th className="py-3 px-4">Employee</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Training Status</th>
              <th className="py-3 px-4">Assessment</th>
              <th className="py-3 px-4">Certificate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {employees.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                  No employee records matched your filter criteria.
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#0D2345]">
                    {emp.employee_code}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">
                      {emp.first_name} {emp.last_name}
                    </div>
                    <div className="text-[11px] text-slate-400">{emp.email}</div>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-600">
                    {emp.department}
                  </td>
                  <td className="py-3 px-4">
                    {getTrainingBadge(emp.training_status, emp.training_progress_pct)}
                  </td>
                  <td className="py-3 px-4">
                    {getAssessmentBadge(emp.assessment_status, emp.assessment_score)}
                  </td>
                  <td className="py-3 px-4">
                    {emp.certificate_status === 'ISSUED' ? (
                      <span className="font-mono text-[11px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {emp.certificate_id}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Pending</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
