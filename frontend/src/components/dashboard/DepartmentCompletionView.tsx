'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { BarChart3, Building2, CheckCircle2 } from 'lucide-react';

interface DepartmentCompletionViewProps {
  departments: Array<{
    department: string;
    total: number;
    completed: number;
    percentage: number;
  }>;
}

export const DepartmentCompletionView: React.FC<DepartmentCompletionViewProps> = ({
  departments,
}) => {
  const sortedDepartments = [...departments].sort((a, b) => b.percentage - a.percentage);
  const totalEmployeesAcrossDepts = departments.reduce((acc, d) => acc + d.total, 0);
  const totalCompletedAcrossDepts = departments.reduce((acc, d) => acc + d.completed, 0);
  const averageCompletionPct =
    totalEmployeesAcrossDepts > 0
      ? Math.round((totalCompletedAcrossDepts / totalEmployeesAcrossDepts) * 1000) / 10
      : 0;

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              Department Tracking
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Department-Wise Completion Rate
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl font-medium leading-relaxed">
            Statutory module completion progress tracked across each corporate division.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 text-xs font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            <span>{departments.length} Units</span>
          </div>
          <div className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{averageCompletionPct}% Benchmark</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Department Ruled List (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          {sortedDepartments.map((dept, idx) => (
            <div
              key={dept.department}
              className="p-3.5 bg-slate-50/70 hover:bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-slate-400 w-5">
                    #{idx + 1}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">
                    {dept.department}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-medium">
                    {dept.completed.toLocaleString()} / {dept.total.toLocaleString()} staff
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {dept.percentage}%
                  </span>
                </div>
              </div>

              {/* Modern Rounded progress bar */}
              <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    dept.percentage >= 85
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                      : dept.percentage >= 70
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500'
                  }`}
                  style={{ width: `${dept.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Right: Comparative Chart (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-50/70 rounded-2xl border border-slate-200/80 p-5 flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Comparative Analysis
            </span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              Target: 100%
            </span>
          </div>

          <div className="h-64 w-full my-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedDepartments}
                layout="vertical"
                margin={{ top: 5, right: 25, left: 10, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="department"
                  tick={{ fontSize: 12, fill: '#1E293B', fontWeight: 500 }}
                  width={110}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#F1F5F9' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-700 text-xs">
                          <div className="font-bold text-sm text-blue-300">{data.department}</div>
                          <div className="mt-1">
                            Completion: <span className="font-bold text-white">{data.percentage}%</span>
                          </div>
                          <div className="text-slate-400 text-[11px] mt-0.5">
                            {data.completed} of {data.total} completed
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="percentage" barSize={14} radius={[0, 6, 6, 0]}>
                  {sortedDepartments.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.percentage >= 85
                          ? '#10B981'
                          : entry.percentage >= 70
                          ? '#2563EB'
                          : '#F59E0B'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-slate-200 text-xs text-slate-500 font-medium flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>≥85% High</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span>70–84% On Track</span>
              </span>
            </div>
            <span className="font-semibold text-slate-600">Statutory Mandate</span>
          </div>
        </div>
      </div>
    </section>
  );
};
