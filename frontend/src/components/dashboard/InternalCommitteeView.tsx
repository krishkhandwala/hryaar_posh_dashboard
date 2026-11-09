'use client';

import React, { useState, useEffect } from 'react';
import {
  Users2,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  Trash2,
  RefreshCw,
  Scale
} from 'lucide-react';
import { apiClient } from '@/lib/api';

interface InternalCommitteeViewProps {
  companyName: string;
}

export const InternalCommitteeView: React.FC<InternalCommitteeViewProps> = ({ companyName }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New member form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('INTERNAL_MEMBER');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');
  const [isExternal, setIsExternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/company/ic-members');
      setMembers(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/company/ic-members', {
        name,
        email,
        role_in_committee: role,
        designation: designation || 'Committee Member',
        phone,
        is_external: isExternal,
      });
      setIsAddModalOpen(false);
      setName('');
      setEmail('');
      setDesignation('');
      setPhone('');
      setIsExternal(false);
      fetchMembers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to appoint committee member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove '${memberName}' from the Internal Committee?`)) {
      return;
    }
    try {
      await apiClient.delete(`/company/ic-members/${memberId}`);
      fetchMembers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to remove member.');
    }
  };

  const hasPresidingOfficer = members.some((m) => m.role_in_committee === 'PRESIDING_OFFICER');
  const hasExternalMember = members.some((m) => m.is_external || m.role_in_committee === 'EXTERNAL_MEMBER');
  const totalCount = members.length;
  const isQuorumMet = totalCount >= 4 && hasPresidingOfficer && hasExternalMember;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200/60 flex items-center gap-1">
              <Scale className="w-3 h-3" />
              <span>Section 4 Mandatory Constitution</span>
            </span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-xs font-semibold text-slate-500">{companyName}</span>
          </div>
          <h2 className="text-xl font-black text-[#0A192F] tracking-tight">
            Internal Committee (IC) Gazette Constitution
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-2xl leading-relaxed">
            Statutory registry of appointed Internal Committee members responsible for prevention, prohibition, and confidential redressal under the PoSH Act 2013.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Appoint Committee Member</span>
        </button>
      </div>

      {/* Statutory Compliance Checklist Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md">
        <div className="text-xs font-bold uppercase tracking-wider text-blue-300 mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>PoSH Act 2013 Section 4 Statutory Validation Matrix</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-2 text-xs font-bold">
              {hasPresidingOfficer ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span>Senior Presiding Officer</span>
            </div>
            <div className="text-[11px] text-blue-200 mt-1 font-medium">
              {hasPresidingOfficer ? 'Gazetted Presiding Officer active' : 'Mandatory Presiding Officer missing'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-2 text-xs font-bold">
              {hasExternalMember ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span>Independent External Expert</span>
            </div>
            <div className="text-[11px] text-blue-200 mt-1 font-medium">
              {hasExternalMember ? 'External NGO / Advocate representative active' : 'Mandatory external expert missing'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-2 text-xs font-bold">
              {isQuorumMet ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span>Statutory Quorum (Min 4)</span>
            </div>
            <div className="text-[11px] text-blue-200 mt-1 font-medium">
              {totalCount} members gazetted (Quorum {isQuorumMet ? 'Compliant' : 'Incomplete'})
            </div>
          </div>
        </div>
      </div>

      {/* Committee Members Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
            Appointed Committee Register ({members.length} Members)
          </h3>
          <button
            onClick={fetchMembers}
            className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              <tr>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Role in Committee</th>
                <th className="py-3 px-4">Corporate Designation</th>
                <th className="py-3 px-4">Official Contact</th>
                <th className="py-3 px-4">Affiliation</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    <span>Loading Internal Committee constitution...</span>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                    No committee members currently appointed.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#0A192F]">{m.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Appointed: {new Date(m.appointed_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          m.role_in_committee === 'PRESIDING_OFFICER'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : m.role_in_committee === 'EXTERNAL_MEMBER'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}
                      >
                        {m.role_in_committee.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-semibold">{m.designation}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{m.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.is_external ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {m.is_external ? 'External Expert' : 'Internal Employee'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteMember(m.id, m.name)}
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Appoint Member */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-sm font-black text-[#0A192F] uppercase tracking-wide">
                Appoint Committee Member
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleAddMember} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Adv. Sunita Rao"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Official Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="email@organization.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Statutory IC Role</label>
                <select
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    if (e.target.value === 'EXTERNAL_MEMBER') setIsExternal(true);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                >
                  <option value="PRESIDING_OFFICER">Presiding Officer (Senior Woman)</option>
                  <option value="INTERNAL_MEMBER">Internal Member</option>
                  <option value="EXTERNAL_MEMBER">External Member (NGO / Legal Expert)</option>
                  <option value="SECRETARY">Committee Secretary / Convener</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Designation & Credentials</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Advocate / VP HR"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isExt"
                  checked={isExternal}
                  onChange={(e) => setIsExternal(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                />
                <label htmlFor="isExt" className="font-bold text-slate-700 cursor-pointer">
                  External Member (NGO or Legal Practitioner)
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 font-bold rounded-xl text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow cursor-pointer"
                >
                  {submitting ? 'Appointing...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

