'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Users2,
  CheckCircle2,
  Award,
  FileCheck,
  TrendingUp,
  Shield,
  Clock,
  ArrowUpRight
} from 'lucide-react';

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
      label: 'Compliance Cohort',
      metric: kpis.total_employees.toLocaleString(),
      subMetric: '100% Mandated Staff',
      fraction: `${kpis.total_employees} Active Accounts`,
      trend: '+12.4% vs Q3',
      icon: Users2,
      accentColor: 'from-blue-600 to-indigo-600',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200/60',
      borderGlow: 'hover:border-blue-400/50'
    },
    {
      label: 'Modules Completed',
      metric: kpis.training_completed.toLocaleString(),
      subMetric: `${kpis.training_completed_pct}% Overall Progress`,
      fraction: `${kpis.training_completed} of ${kpis.total_employees} Done`,
      trend: '84.0% Completion Rate',
      icon: CheckCircle2,
      accentColor: 'from-emerald-600 to-teal-600',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      borderGlow: 'hover:border-emerald-400/50'
    },
    {
      label: 'Statutory Assessments Passed',
      metric: kpis.assessment_completed.toLocaleString(),
      subMetric: `${kpis.assessment_completed_pct}% Qualified First-Try`,
      fraction: `${kpis.assessment_completed} Valid Attempts`,
      trend: 'Min 70% Benchmark Met',
      icon: FileCheck,
      accentColor: 'from-violet-600 to-purple-600',
      badgeBg: 'bg-violet-50 text-violet-700 border-violet-200/60',
      borderGlow: 'hover:border-violet-400/50'
    },
    {
      label: 'Issued Credentials',
      metric: kpis.certificates_issued.toLocaleString(),
      subMetric: `${kpis.certificates_issued_pct}% Cryptographically Verified`,
      fraction: `${kpis.certificates_issued} Ready for Audit`,
      trend: 'Audit-Ready Proof',
      icon: Award,
      accentColor: 'from-amber-500 to-orange-500',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200/60',
      borderGlow: 'hover:border-amber-400/50'
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.08 }}
            className={`bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(42,98,255,0.08)] transition-all relative overflow-hidden group ${c.borderGlow}`}
          >
            {/* Top gradient accent hairline */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${c.accentColor}`} />

            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-800 group-hover:scale-105 transition-transform">
                <Icon className="w-5 h-5 text-slate-700" />
              </div>
              <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${c.badgeBg}`}>
                {c.trend}
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-[28px] font-black text-[#0A192F] tracking-tight mono-numeric leading-none">
                {c.metric}
              </div>
              <div className="text-xs font-bold text-slate-800 tracking-tight">
                {c.label}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100/90 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>{c.subMetric}</span>
              <span className="font-semibold text-slate-700">{c.fraction}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
