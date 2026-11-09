'use client';

import React from 'react';
import { Building2, ShieldCheck, Mail, MapPin, Briefcase, Calendar, CheckCircle2 } from 'lucide-react';
import { CompanyLogo } from '@/components/brand/CompanyLogo';

interface TenantProfileViewProps {
  company: any;
  kpis: any;
}

export const TenantProfileView: React.FC<TenantProfileViewProps> = ({ company, kpis }) => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <CompanyLogo
            name={company?.name}
            slug={company?.slug}
            logoUrl={company?.logo_url}
            primaryColor={company?.primary_color}
            size="lg"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-[#0A192F] tracking-tight">{company?.name}</h2>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                Statutory Charter Active
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Corporate Registry ID: <code className="font-mono text-slate-700 font-bold">{company?.id}</code>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Briefcase className="w-3.5 h-3.5 text-[#2A62FF]" />
              <span>Industry Sector</span>
            </div>
            <div className="text-sm font-bold text-[#0A192F]">{company?.industry || 'Enterprise Technology'}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>Headquarters Jurisdiction</span>
            </div>
            <div className="text-sm font-bold text-[#0A192F]">{company?.headquarters || 'Mumbai, Maharashtra, India'}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>Internal Committee Presiding Officer</span>
            </div>
            <div className="text-sm font-bold text-[#0A192F]">{company?.ic_chairperson || 'Adv. Sunita Rao (External IC Chair)'}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Mail className="w-3.5 h-3.5 text-purple-500" />
              <span>Statutory IC Confidential Inbox</span>
            </div>
            <div className="text-sm font-mono font-bold text-[#2A62FF]">{company?.posh_reporting_email || 'posh-ic@company.com'}</div>
          </div>
        </div>

        {/* Tenant Metrics Capsule */}
        <div className="mt-6 p-5 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-950 text-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-300">Contract & Compliance Standing</span>
            <span className="text-xs font-bold bg-white/10 px-2 py-0.5 rounded">CY 2025-2026</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xl font-black mono-numeric">{kpis.total_employees}</div>
              <div className="text-[10px] text-blue-200 uppercase font-semibold">Active Staff</div>
            </div>
            <div>
              <div className="text-xl font-black mono-numeric text-emerald-400">{kpis.training_completed_pct}%</div>
              <div className="text-[10px] text-blue-200 uppercase font-semibold">Training Complete</div>
            </div>
            <div>
              <div className="text-xl font-black mono-numeric text-purple-300">{kpis.certificates_issued}</div>
              <div className="text-[10px] text-blue-200 uppercase font-semibold">Certs Issued</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
