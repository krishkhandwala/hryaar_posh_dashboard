'use client';

import React from 'react';
import { CheckCircle2, Clock, Calendar, Video, ArrowRight } from 'lucide-react';

interface StageProps {
  stages: Array<{
    stage: string;
    status: string;
    completed_count: number;
    total_count: number;
    percentage: number;
  }>;
  overallPct: number;
  webinars: Array<{
    id: string;
    title: string;
    speaker: string;
    session_time: string;
    duration_minutes: number;
    attendees_count: number;
  }>;
}

export const ProgramProgress: React.FC<StageProps> = ({
  stages,
  overallPct,
  webinars,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* 5-Stage Programme Progress */}
      <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-[#0D2345] text-sm">
              PoSH Implementation Roadmap & Milestones
            </h3>
            <p className="text-[11px] text-slate-500">
              Live tracking through statutory awareness & assessment stages
            </p>
          </div>
          <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
            Overall {overallPct}% Completed
          </span>
        </div>

        <div className="space-y-3.5">
          {stages.map((st, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-50 text-[#315FD1] text-[10px] font-black flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-slate-700">{st.stage}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">
                    {st.completed_count.toLocaleString()} / {st.total_count.toLocaleString()}
                  </span>
                  <span className="font-bold text-[#0D2345] text-xs">
                    {st.percentage}%
                  </span>
                </div>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    st.percentage === 100
                      ? 'bg-emerald-500'
                      : st.percentage > 50
                      ? 'bg-[#315FD1]'
                      : 'bg-amber-400'
                  }`}
                  style={{ width: `${st.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Webinars & IC Workshops */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[#0D2345] text-sm flex items-center gap-2">
              <Video className="w-4 h-4 text-[#315FD1]" />
              <span>Upcoming IC Sessions</span>
            </h3>
            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
              Scheduled
            </span>
          </div>

          <div className="space-y-3">
            {webinars.map((w) => (
              <div
                key={w.id}
                className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div className="font-bold text-xs text-[#0D2345] line-clamp-1 mb-1">
                  {w.title}
                </div>
                <div className="text-[11px] text-slate-500 font-medium mb-2">
                  Trainer: {w.speaker}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium pt-1.5 border-t border-slate-200/50">
                  <span className="flex items-center gap-1 text-[#315FD1] font-semibold">
                    <Calendar className="w-3 h-3" />
                    <span>In 4 Days</span>
                  </span>
                  <span>{w.duration_minutes} mins</span>
                  <span>{w.attendees_count} Enrolled</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button className="w-full mt-3 py-2 bg-slate-100 hover:bg-slate-200/70 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5">
          <span>View All Training Calendar</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
