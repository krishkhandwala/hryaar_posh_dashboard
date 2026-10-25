'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Calendar, Video, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* 5-Stage Statutory Roadmap (8 Cols) */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="lg:col-span-8 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#2A62FF]" />
              <h3 className="font-extrabold text-[#0A192F] text-sm tracking-tight">
                Mandatory PoSH Compliance Roadmap
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              Statutory 5-stage progression toward Annual Internal Committee certification
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-3 py-1 rounded-full mono-numeric">
              {overallPct}% Program Complete
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {stages.map((st, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-lg bg-slate-900 text-white font-mono text-[10px] font-black flex items-center justify-center shadow-sm">
                    0{idx + 1}
                  </span>
                  <span className="font-bold text-[#0A192F] text-xs">{st.stage}</span>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {st.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-[11px] text-slate-500 font-medium">
                    {st.completed_count.toLocaleString()} / {st.total_count.toLocaleString()}
                  </span>
                  <span className="font-black text-[#0A192F] text-xs">
                    {st.percentage}%
                  </span>
                </div>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${st.percentage}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    st.percentage === 100
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                      : st.percentage > 50
                      ? 'bg-gradient-to-r from-[#2A62FF] to-indigo-600'
                      : 'bg-gradient-to-r from-amber-400 to-orange-500'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* IC Workshops & Webinars (4 Cols) */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.18 }}
        className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-[#2A62FF]" />
              <h3 className="font-extrabold text-[#0A192F] text-sm tracking-tight">
                Live IC Workshops
              </h3>
            </div>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-extrabold px-2 py-0.5 rounded-full border border-blue-200/60">
              Interactive
            </span>
          </div>

          <div className="space-y-3">
            {webinars.map((w) => (
              <div
                key={w.id}
                className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-all hover:border-blue-300"
              >
                <div className="font-extrabold text-xs text-[#0A192F] line-clamp-1 mb-1">
                  {w.title}
                </div>
                <div className="text-[11px] text-slate-500 font-medium mb-3">
                  Lead Facilitator: <span className="text-slate-800 font-semibold">{w.speaker}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600 pt-2 border-t border-slate-200/60 font-medium">
                  <span className="flex items-center gap-1.5 font-bold text-[#2A62FF]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>This Thursday</span>
                  </span>
                  <span className="mono-numeric font-bold">{w.attendees_count} Enrolled</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button className="w-full mt-4 py-2.5 bg-[#061122] hover:bg-[#0D2140] text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2">
          <span>Explore IC Training Schedule</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </div>
  );
};
