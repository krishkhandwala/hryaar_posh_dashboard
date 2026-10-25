'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Download, CheckCircle2, Clock, XCircle, ShieldCheck, UserCheck, FileSpreadsheet } from 'lucide-react';
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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>100% Verified</span>
        </span>
      );
    }
    if (status === 'IN_PROGRESS') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>{pct}% Ongoing</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200/60">
        Not Started
      </span>
    );
  };

  const getAssessmentBadge = (status: string, score: number | null) => {
    if (status === 'PASSED') {
      return (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-mono font-bold text-xs text-emerald-700">
            {score}% Passed
          </span>
        </div>
      );
    }
    if (status === 'FAILED') {
      return (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span className="font-mono font-bold text-xs text-rose-600">
            {score}% Failed
          </span>
        </div>
      );
    }
    return <span className="text-xs text-slate-400 font-medium">Pending Attempt</span>;
  };

  const exportCSV = () => {
    // Fire festive celebration confetti on audit export
    confetti({
      particleCount: 50,
      spread: 60,
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
    link.setAttribute('download', `hryaar_posh_compliance_roster_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden"
    >
      {/* Header Bar */}
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-gradient-to-r from-white to-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#2A62FF]" />
            <h3 className="font-extrabold text-[#0A192F] text-sm tracking-tight">
              Individual Employee Audit Roster
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
            Granular employee records for statutory verification and internal audits
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by name, ID or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2A62FF] focus:border-transparent transition-all shadow-sm"
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none hover:border-slate-300 transition-colors shadow-sm cursor-pointer"
          >
            <option value="ALL">All Departments ({employees.length})</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Export CSV Button */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-[#0A192F] text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export Roster CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <th className="py-3.5 px-5">Staff Code</th>
              <th className="py-3.5 px-5">Employee Identity</th>
              <th className="py-3.5 px-5">Department</th>
              <th className="py-3.5 px-5">Video Module Status</th>
              <th className="py-3.5 px-5">Assessment Score</th>
              <th className="py-3.5 px-5">Statutory Certificate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {employees.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                  No employee records found matching your filter criteria.
                </td>
              </tr>
            ) : (
              employees.slice(0, 50).map((emp) => (
                <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="py-3.5 px-5">
                    <span className="font-mono font-bold text-[#0A192F] bg-slate-100 px-2 py-0.5 rounded text-[11px] group-hover:bg-blue-100/60 transition-colors">
                      {emp.employee_code}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="font-bold text-slate-900 group-hover:text-[#2A62FF] transition-colors">
                      {emp.first_name} {emp.last_name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-normal">{emp.email}</div>
                  </td>
                  <td className="py-3.5 px-5 font-semibold text-slate-700">
                    {emp.department}
                  </td>
                  <td className="py-3.5 px-5">
                    {getTrainingBadge(emp.training_status, emp.training_progress_pct)}
                  </td>
                  <td className="py-3.5 px-5">
                    {getAssessmentBadge(emp.assessment_status, emp.assessment_score)}
                  </td>
                  <td className="py-3.5 px-5">
                    {emp.certificate_status === 'ISSUED' ? (
                      <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-200/70 inline-flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-indigo-600" />
                        <span>{emp.certificate_id}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">Awaiting completion</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-500 font-medium">
        <span>Showing top {Math.min(employees.length, 50)} of {employees.length} employees</span>
        <span>Standard Indian Labor Compliance Certified &bull; FY 2025-26</span>
      </div>
    </motion.div>
  );
};
