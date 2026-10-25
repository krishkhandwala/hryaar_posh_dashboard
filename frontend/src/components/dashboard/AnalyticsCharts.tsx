'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

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

const BAND_COLORS = ['#10B981', '#315FD1', '#F59E0B', '#EF4444'];

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  departments,
  bands,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Department Bar Chart */}
      <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-[#0D2345] text-sm">
              Training Completion by Department
            </h3>
            <p className="text-[11px] text-slate-500">
              Department-wise progress against mandatory PoSH threshold
            </p>
          </div>
          <span className="text-[11px] font-bold text-[#315FD1] bg-blue-50 px-2 py-0.5 rounded">
            Target: 100%
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={departments}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="department"
                tick={{ fontSize: 11 }}
                width={120}
              />
              <Tooltip
                formatter={(val: any, name: any, item: any) => [
                  `${val}% (${item.payload.completed}/${item.payload.total} staff)`,
                  'Completed'
                ]}
              />
              <Bar
                dataKey="percentage"
                fill="#315FD1"
                radius={[0, 4, 4, 0]}
                barSize={18}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Assessment Score Distribution */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-[#0D2345] text-sm">
            Assessment Results Distribution
          </h3>
          <p className="text-[11px] text-slate-500 mb-2">
            Performance breakdown across score bands
          </p>

          <div className="h-44 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bands}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {bands.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={BAND_COLORS[index % BAND_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any, item: any) => [
                    `${value} employees (${item.payload.percentage}%)`,
                    item.payload.band
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-1.5 pt-3 border-t border-slate-100">
          {bands.map((b, i) => (
            <div key={b.band} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: BAND_COLORS[i % BAND_COLORS.length] }}
                />
                <span className="text-slate-600 font-medium text-[11px]">
                  {b.band}
                </span>
              </div>
              <span className="font-bold text-[#0D2345] text-[11px]">
                {b.count} ({b.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
