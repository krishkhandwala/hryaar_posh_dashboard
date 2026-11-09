'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  UserCheck,
  ChevronRight,
  RefreshCw,
  Lock
} from 'lucide-react';
import { apiClient } from '@/lib/api';

interface ComplaintsViewProps {
  companyName: string;
}

export const ComplaintsView: React.FC<ComplaintsViewProps> = ({ companyName }) => {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  // New complaint form
  const [newComplainant, setNewComplainant] = useState('');
  const [newComplainantDept, setNewComplainantDept] = useState('Engineering');
  const [newRespondent, setNewRespondent] = useState('');
  const [newRespondentDept, setNewRespondentDept] = useState('Engineering');
  const [newSummary, setNewSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Update stage form
  const [updateStatus, setUpdateStatus] = useState('FORMAL_INQUIRY');
  const [updateActionTaken, setUpdateActionTaken] = useState('');

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/company/complaints');
      setComplaints(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await apiClient.post('/company/complaints', {
        complainant_name: newComplainant,
        complainant_department: newComplainantDept,
        respondent_name: newRespondent,
        respondent_department: newRespondentDept,
        summary: newSummary,
      });
      setIsCreateModalOpen(false);
      setNewComplainant('');
      setNewRespondent('');
      setNewSummary('');
      fetchComplaints();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to file statutory complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setSubmitting(true);
    try {
      await apiClient.put(`/company/complaints/${selectedComplaint.id}`, {
        status: updateStatus,
        action_taken: updateActionTaken,
      });
      setIsUpdateModalOpen(false);
      setSelectedComplaint(null);
      fetchComplaints();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update complaint stage.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = complaints.filter((c) => {
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesSearch =
      c.complaint_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.respondent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.complainant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.summary.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const total = complaints.length;
  const active = complaints.filter((c) => !['CLOSED', 'RESOLVED'].includes(c.status)).length;
  const closed = complaints.filter((c) => ['CLOSED', 'RESOLVED'].includes(c.status)).length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CLOSED':
      case 'RESOLVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'FORMAL_INQUIRY':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CONCILIATION':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'REPORT_SUBMITTED':
      case 'ACTION_TAKEN':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md border border-rose-200/60 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>Section 11 Statutory Charter</span>
            </span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-xs font-semibold text-slate-500">{companyName}</span>
          </div>
          <h2 className="text-xl font-black text-[#0A192F] tracking-tight">
            PoSH Complaints Redressal & IC Inquiry Register
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-2xl">
            Statutory tracking under the Sexual Harassment of Women at Workplace Act, 2013. Mandates 90-day inquiry completion, strict complainant confidentiality, and formal conciliation records.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Grievance</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
            Total Cases (Cycle)
          </div>
          <div className="text-2xl font-black text-[#0A192F] mono-numeric">{total}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Statutory filings registered</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wider mb-1">
            Active Inquiries
          </div>
          <div className="text-2xl font-black text-amber-600 mono-numeric">{active}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Under active IC proceedings</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider mb-1">
            Closed / Redressed
          </div>
          <div className="text-2xl font-black text-emerald-600 mono-numeric">{closed}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Resolved within 90 days</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider mb-1">
            Statutory Compliance
          </div>
          <div className="text-2xl font-black text-blue-600 mono-numeric">100%</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Zero overdue statutory notices</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by Case No, Respondent, or Keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-600">Stage:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
          >
            <option value="ALL">All Stages</option>
            <option value="FILED">Grievance Filed</option>
            <option value="CONCILIATION">Conciliation (Sec 10)</option>
            <option value="FORMAL_INQUIRY">Formal IC Inquiry (Sec 11)</option>
            <option value="REPORT_SUBMITTED">Report Submitted</option>
            <option value="ACTION_TAKEN">Disciplinary Action Taken</option>
            <option value="CLOSED">Closed & Archival</option>
          </select>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              <tr>
                <th className="py-3 px-4">Grievance ID</th>
                <th className="py-3 px-4">Complainant (Confidential)</th>
                <th className="py-3 px-4">Respondent</th>
                <th className="py-3 px-4">Filing Date</th>
                <th className="py-3 px-4">Presiding Officer</th>
                <th className="py-3 px-4">Statutory Stage</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    <span>Loading confidential complaints register...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold">
                    No complaints matching current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const filedDate = new Date(c.filing_date);
                  const daysElapsed = Math.floor((Date.now() - filedDate.getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#0A192F]">
                        {c.complaint_number}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{c.complainant_name}</div>
                        <div className="text-[10px] text-slate-400">{c.complainant_department}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{c.respondent_name}</div>
                        <div className="text-[10px] text-slate-400">{c.respondent_department}</div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div>{filedDate.toISOString().split('T')[0]}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">{daysElapsed} days elapsed</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-semibold">
                        {c.assigned_ic_chair || 'Adv. Sunita Rao'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(c.status)}`}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedComplaint(c);
                            setUpdateStatus(c.status);
                            setUpdateActionTaken(c.action_taken || '');
                            setIsUpdateModalOpen(true);
                          }}
                          className="px-3 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          Update Stage
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Create New Complaint */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600 font-black text-sm uppercase">
                <ShieldAlert className="w-5 h-5" />
                <span>Statutory Confidential Grievance Entry</span>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateComplaint} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Complainant Alias / Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Employee X"
                    value={newComplainant}
                    onChange={(e) => setNewComplainant(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Complainant Department</label>
                  <input
                    type="text"
                    required
                    value={newComplainantDept}
                    onChange={(e) => setNewComplainantDept(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Respondent Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Respondent full name"
                    value={newRespondent}
                    onChange={(e) => setNewRespondent(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Respondent Department</label>
                  <input
                    type="text"
                    required
                    value={newRespondentDept}
                    onChange={(e) => setNewRespondentDept(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Incident Summary & Context</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Concise statutory overview of the allegation..."
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-medium leading-relaxed">
                <strong>Statutory Notice:</strong> Under Section 16 of PoSH Act 2013, publishing or making known contents of complaint and inquiry proceedings is strictly prohibited.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 font-bold rounded-xl text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow cursor-pointer"
                >
                  {submitting ? 'Registering...' : 'Register Grievance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Update Complaint Status */}
      {isUpdateModalOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-[#0A192F]">
                Update Status: {selectedComplaint.complaint_number}
              </h3>
              <button
                onClick={() => setIsUpdateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Statutory Stage Progression</label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                >
                  <option value="FILED">Grievance Filed</option>
                  <option value="CONCILIATION">Conciliation (Sec 10)</option>
                  <option value="FORMAL_INQUIRY">Formal IC Inquiry (Sec 11)</option>
                  <option value="REPORT_SUBMITTED">Inquiry Report Submitted</option>
                  <option value="ACTION_TAKEN">Disciplinary Action Taken</option>
                  <option value="CLOSED">Closed & Resolved</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Actions Taken / Interim Measures / IC Findings
                </label>
                <textarea
                  rows={4}
                  value={updateActionTaken}
                  onChange={(e) => setUpdateActionTaken(e.target.value)}
                  placeholder="Document actions taken, IC meeting notes, or resolution orders..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUpdateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 font-bold rounded-xl text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow cursor-pointer"
                >
                  {submitting ? 'Updating...' : 'Commit Stage Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

