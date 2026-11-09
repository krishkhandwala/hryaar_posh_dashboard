'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BarChart3, PieChart as PieIcon, Award, ShieldCheck, TrendingUp } from 'lucide-react';

interface AnalyticsChartsProps {
  departments: Array<{
    department: string;
    total: number;
    completed: number;
    percentage: number;
  }>;
  bands: Array<{
    band: string;
    count: number;
    percentage: number;
  }>;
}

const BAND_COLORS = ['#10B981', '#2A62FF', '#F59E0B', '#EF4444'];

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  departments,
  bands,
}) => {
  const totalEvaluated = bands.reduce((acc, b) => acc + b.count, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* 1. Departmental Compliance Bar Chart (7 Cols) */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-[#0A192F] text-sm tracking-tight">
                Departmental Sensitization Progress
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              Employee training completion benchmarked against statutory compliance mandate
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg font-mono">
            Benchmark: 100%
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={departments}
              layout="vertical"
              margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
            >
              <XAxis
                type="number"
                domain={[0, 100]}
                unit="%"
                tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                axisLine={{ stroke: '#E2E8F0' }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="department"
                tick={{ fontSize: 11, fill: '#1E293B', fontWeight: 600 }}
                width={140}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: '#F8FAFC' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#0A192F] text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs">
                        <div className="font-bold text-blue-400 mb-1">{data.department}</div>
                        <div>
                          Sensitization Rate:{' '}
                          <span className="font-mono font-black text-white">{data.percentage}%</span>
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5 font-mono">
                          {data.completed} of {data.total} employees certified
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="percentage"
                fill="#2A62FF"
                radius={[0, 8, 8, 0]}
                barSize={18}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#2A62FF]" />
            <span>% Certified Completion</span>
          </div>
          <span className="font-mono font-semibold text-slate-700">
            {departments.length} Monitored Units
          </span>
        </div>
      </motion.div>

      {/* 2. Assessment Score Bands Donut Distribution (5 Cols) */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <PieIcon className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-[#0A192F] text-sm tracking-tight">
                Exam Score Bands
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              Passing benchmark: ≥70% score
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-lg font-mono">
            {totalEvaluated.toLocaleString()} Tested
          </span>
        </div>

        <div className="h-56 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={bands}
                dataKey="count"
                nameKey="band"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
              >
                {bands.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={BAND_COLORS[index % BAND_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#0A192F] text-white p-2.5 rounded-xl shadow-xl text-xs">
                        <div className="font-bold text-slate-200">{data.band}</div>
                        <div className="font-mono text-emerald-400 font-bold mt-0.5">
                          {data.count.toLocaleString()} employees ({data.percentage}%)
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Center Callout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-black text-[#0A192F] mono-numeric leading-none">
              {totalEvaluated.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">
              Attempts
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-[11px]">
          {bands.map((b, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: BAND_COLORS[idx % BAND_COLORS.length] }}
              />
              <span className="text-slate-600 truncate text-[11px] font-medium">{b.band}</span>
              <span className="font-bold font-mono text-[#0A192F] ml-auto">{b.count}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
