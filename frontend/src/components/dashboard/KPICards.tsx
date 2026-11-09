'use client';

import React from 'react';
import {
  Users2,
  CheckCircle2,
  Award,
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';
import { motion } from 'framer-motion';

interface KPICardsProps {
  kpis: {
    total_employees: number;
    training_completed: number;
    training_completed_pct: number;
    assessment_completed: number;
    assessment_completed_pct: number;
  };
}

export const KPICards: React.FC<KPICardsProps> = ({ kpis }) => {
  const cards = [
    {
      label: 'Number of Employees / Learners',
      metric: kpis.total_employees.toLocaleString(),
      subMetric: '100% Eligible Staff',
      fraction: `${kpis.total_employees.toLocaleString()} Total Learners`,
      trend: 'Annual Cohort Active',
      icon: Users2,
      accentColor: 'from-blue-600 to-indigo-600',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200/70',
      iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
      progressPct: 100,
      progressBarColor: 'bg-gradient-to-r from-blue-600 to-indigo-600',
    },
    {
      label: 'Completion Rate',
      metric: `${kpis.training_completed_pct}%`,
      subMetric: `${kpis.training_completed.toLocaleString()} of ${kpis.total_employees.toLocaleString()} Completed Modules`,
      fraction: `${kpis.training_completed.toLocaleString()} Learners Completed`,
      trend: `${kpis.training_completed_pct}% Certified`,
      icon: CheckCircle2,
      accentColor: 'from-emerald-500 to-teal-600',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      progressPct: kpis.training_completed_pct,
      progressBarColor: 'bg-gradient-to-r from-emerald-500 to-teal-600',
    },
    {
      label: 'Assessment Success Rate',
      metric: `${kpis.assessment_completed_pct}%`,
      subMetric: `${kpis.assessment_completed.toLocaleString()} Passed (≥70% Benchmark)`,
      fraction: `${kpis.assessment_completed.toLocaleString()} Passed Assessment`,
      trend: '70% Passing Threshold',
      icon: Award,
      accentColor: 'from-violet-600 to-purple-600',
      badgeBg: 'bg-violet-50 text-violet-700 border-violet-200/70',
      iconBg: 'bg-violet-50 text-violet-600 border-violet-100',
      progressPct: kpis.assessment_completed_pct,
      progressBarColor: 'bg-gradient-to-r from-violet-600 to-purple-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.08 }}
            className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(42,98,255,0.08)] transition-all relative overflow-hidden group flex flex-col justify-between"
          >
            {/* Top gradient hairline */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${c.accentColor}`} />

            <div>
              {/* Header with Icon and Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-xs ${c.iconBg}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-[11px] font-bold uppercase px-3 py-1 rounded-full border ${c.badgeBg}`}>
                  {c.trend}
                </span>
              </div>

              {/* Metric and Label */}
              <div className="space-y-1">
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 mono-numeric tracking-tight">
                  {c.metric}
                </div>
                <div className="text-sm font-semibold text-slate-700">
                  {c.label}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {c.subMetric}
                </div>
              </div>
            </div>

            {/* Progress Bar & Subtext */}
            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${c.progressBarColor}`}
                  style={{ width: `${Math.min(c.progressPct, 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>{c.fraction}</span>
                <span className="font-semibold text-slate-700">{c.progressPct}% benchmark</span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
