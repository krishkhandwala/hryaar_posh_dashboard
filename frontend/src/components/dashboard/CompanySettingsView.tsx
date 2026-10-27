'use client';

import React, { useState } from 'react';
import { Sliders, ShieldCheck, Mail, Save, AlertCircle, CheckCircle2, Building, Hash, Globe, Bell } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface CompanySettingsViewProps {
  settings: any;
  companyId: string;
  onRefresh: () => void;
}

export const CompanySettingsView: React.FC<CompanySettingsViewProps> = ({
  settings,
  companyId,
  onRefresh,
}) => {
  const [passingScore, setPassingScore] = useState(settings?.passing_threshold_pct || 70);
  const [mandateYear, setMandateYear] = useState(settings?.mandate_year || 'CY 2025-2026');
  const [prefix, setPrefix] = useState(settings?.certificate_prefix || 'CERT-POSH');
  const [escalationEmail, setEscalationEmail] = useState(settings?.escalation_email || 'legal-compliance@company.com');
  const [allowedDomains, setAllowedDomains] = useState(settings?.allowed_domains || 'acmecorp.com');
  const [autoCert, setAutoCert] = useState(settings?.auto_issue_certificates ?? true);
  const [emailNotif, setEmailNotif] = useState(settings?.email_notifications ?? true);
  const [escalate, setEscalate] = useState(settings?.escalate_non_compliance ?? true);
  const [syncFreq, setSyncFreq] = useState(settings?.sync_frequency || 'DAILY');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      await apiClient.put(`/companies/current/settings?company_id=${companyId}`, {
        passing_threshold_pct: parseFloat(passingScore),
        mandate_year: mandateYear,
        certificate_prefix: prefix,
        escalation_email: escalationEmail,
        allowed_domains: allowedDomains,
        auto_issue_certificates: autoCert,
        email_notifications: emailNotif,
        escalate_non_compliance: escalate,
        sync_frequency: syncFreq,
      });
      setSavedSuccess(true);
      onRefresh();
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2A62FF] flex items-center justify-center">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#0A192F] tracking-tight">
              Company-Wide PoSH Compliance Rules
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Configure tenant-specific passing criteria, certificate prefixes, and statutory escalation workflows.
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Tenant settings successfully updated and committed to audit trail!</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Statutory Assessment Passing Benchmark (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="50"
                  max="100"
                  required
                  value={passingScore}
                  onChange={(e) => setPassingScore(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2A62FF]"
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">%</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Recommended legal threshold: 70% or 75%.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Statutory Mandate Cycle
              </label>
              <input
                type="text"
                required
                value={mandateYear}
                onChange={(e) => setMandateYear(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2A62FF]"
              />
              <p className="text-[10px] text-slate-400 mt-1">Reflected on statutory certificates and annual filing reports.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Certificate Identifier Prefix
              </label>
              <input
                type="text"
                required
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2A62FF]"
              />
              <p className="text-[10px] text-slate-400 mt-1">Example: CERT-ACME-POSH generates IDs like CERT-ACME-POSH-1025.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Statutory Escalation Email
              </label>
              <input
                type="email"
                required
                value={escalationEmail}
                onChange={(e) => setEscalationEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2A62FF]"
              />
              <p className="text-[10px] text-slate-400 mt-1">Receives automated alerts when employees remain non-compliant past deadline.</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Allowed Employee Corporate Email Domains
              </label>
              <input
                type="text"
                required
                value={allowedDomains}
                onChange={(e) => setAllowedDomains(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2A62FF]"
              />
              <p className="text-[10px] text-slate-400 mt-1">Comma-separated list (e.g. acmecorp.com, acmeglobal.com). Rejects invalid imports.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Automated Policy Toggles</h4>
            
            <label className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100/70 rounded-xl cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={autoCert}
                onChange={(e) => setAutoCert(e.target.checked)}
                className="w-4 h-4 rounded text-[#2A62FF] focus:ring-[#2A62FF]"
              />
              <div>
                <div className="text-xs font-bold text-[#0A192F]">Instant Cryptographic Certificate Generation</div>
                <div className="text-[11px] text-slate-500">Automatically generate a verifiable certificate when an employee passes the exam.</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100/70 rounded-xl cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={emailNotif}
                onChange={(e) => setEmailNotif(e.target.checked)}
                className="w-4 h-4 rounded text-[#2A62FF] focus:ring-[#2A62FF]"
              />
              <div>
                <div className="text-xs font-bold text-[#0A192F]">Employee Milestone Notifications</div>
                <div className="text-[11px] text-slate-500">Send confirmation receipts and PDF certificates to the employee's corporate email.</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100/70 rounded-xl cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={escalate}
                onChange={(e) => setEscalate(e.target.checked)}
                className="w-4 h-4 rounded text-[#2A62FF] focus:ring-[#2A62FF]"
              />
              <div>
                <div className="text-xs font-bold text-[#0A192F]">Escalate Non-Compliant Departments to IC</div>
                <div className="text-[11px] text-slate-500">Auto-flag business units below 80% completion 14 days before statutory audit deadlines.</div>
              </div>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#2A62FF] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1E40AF] text-white font-bold text-xs rounded-xl shadow-[0_4px_16px_rgba(42,98,255,0.35)] transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Committing Settings...' : 'Save Tenant Configuration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
