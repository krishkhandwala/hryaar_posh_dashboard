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
  Legend
} from 'recharts';
import { BarChart3, PieChart as PieIcon, ArrowUpRight, Award } from 'lucide-react';

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

const BAND_COLORS = ['#059669', '#2A62FF', '#D97706', '#E11D48'];

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  departments,
  bands,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Department Breakdown (7 Cols) */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#2A62FF]" />
              <h3 className="font-extrabold text-[#0A192F] text-sm tracking-tight">
                Departmental Completion Rates
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              Real-time progress compared against 100% compliance threshold
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              Benchmark: 100%
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={departments}
              layout="vertical"
              margin={{ top: 0, right: 25, left: 20, bottom: 0 }}
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
                width={130}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#061122] text-white p-3 rounded-xl shadow-xl border border-blue-500/30 text-xs">
                        <div className="font-bold text-blue-400 mb-1">{data.department}</div>
                        <div>Completion: <span className="font-mono font-bold text-white">{data.percentage}%</span></div>
                        <div className="text-slate-400 text-[11px] mt-0.5">Staff: {data.completed} / {data.total} completed</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="percentage"
                fill="#2A62FF"
                radius={[0, 6, 6, 0]}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Assessment Score Band Distribution (5 Cols) */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.22 }}
        className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-[#059669]" />
              <h3 className="font-extrabold text-[#0A192F] text-sm tracking-tight">
                Assessment Mastery Distribution
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              Employee proficiency segmentation across 4 score tiers
            </p>
          </div>
        </div>

        <div className="h-48 w-full flex items-center justify-center relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={bands}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
                dataKey="count"
              >
                {bands.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={BAND_COLORS[index % BAND_COLORS.length]}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#061122] text-white p-3 rounded-xl shadow-xl border border-blue-500/30 text-xs">
                        <div className="font-bold text-emerald-400 mb-1">{data.band}</div>
                        <div>Count: <span className="font-mono font-bold text-white">{data.count} employees</span></div>
                        <div className="text-slate-400 text-[11px]">Share: {data.percentage}% of test takers</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Centered Pass Badge */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-black text-[#0A192F] mono-numeric">81.6%</span>
            <span className="text-[9px] font-extrabold uppercase text-emerald-600 tracking-wider">Pass Rate</span>
          </div>
        </div>

        {/* Crisp Legend Grid */}
        <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100">
          {bands.map((b, i) => (
            <div key={b.band} className="p-2 rounded-lg bg-slate-50/70 border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: BAND_COLORS[i % BAND_COLORS.length] }}
                />
                <span className="text-[11px] font-bold text-slate-700 truncate">
                  {b.band.split(' ')[0]}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1 text-[11px]">
                <span className="font-mono font-black text-[#0A192F]">{b.count}</span>
                <span className="text-slate-500 text-[10px] font-semibold">{b.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
