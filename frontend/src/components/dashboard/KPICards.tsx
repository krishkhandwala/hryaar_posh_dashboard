'use client';

import React from 'react';
import { Users, CheckCircle2, Award, FileCheck, HelpCircle } from 'lucide-react';

interface KPICardsProps {
  kpis: {
    total_employees: number;
    training_completed: number;
    training_completed_pct: number;
    assessment_completed: number;
    assessment_completed_pct: number;
    certificates_issued: number;
    certificates_issued_pct: number;
    compliance_docs: number;
  };
}

export const KPICards: React.FC<KPICardsProps> = ({ kpis }) => {
  const cards = [
    {
      label: 'Total Employees',
      value: kpis.total_employees.toLocaleString(),
      subtext: 'Target compliance cohort',
      icon: Users,
      iconBg: 'bg-rose-50 text-rose-500',
      pillColor: 'bg-slate-100 text-slate-700'
    },
    {
      label: 'Training Completed',
      value: kpis.training_completed.toLocaleString(),
      subtext: `${kpis.training_completed_pct}% overall completion`,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600',
      pillColor: 'bg-emerald-50 text-emerald-700'
    },
    {
      label: 'Assessment Passed',
      value: kpis.assessment_completed.toLocaleString(),
      subtext: `${kpis.assessment_completed_pct}% pass rate`,
      icon: FileCheck,
      iconBg: 'bg-blue-50 text-blue-600',
      pillColor: 'bg-blue-50 text-blue-700'
    },
    {
      label: 'Certificates Issued',
      value: kpis.certificates_issued.toLocaleString(),
      subtext: `${kpis.certificates_issued_pct}% issued & verified`,
      icon: Award,
      iconBg: 'bg-purple-50 text-purple-600',
      pillColor: 'bg-purple-50 text-purple-700'
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-11 h-11 rounded-lg ${c.iconBg} flex items-center justify-center`}>
                <Icon className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${c.pillColor}`}>
                Verified
              </span>
            </div>
            <div className="text-2xl font-black text-[#0D2345] tracking-tight">
              {c.value}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">
              {c.label}
            </div>
            <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span>{c.subtext}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
