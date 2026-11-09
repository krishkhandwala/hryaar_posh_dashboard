'use client';

import React, { useState } from 'react';
import {
  Video,
  Calendar,
  Clock,
  Mail,
  Send,
  BellRing,
  CheckCircle2,
  Users,
  ExternalLink,
  RefreshCw,
  FileSpreadsheet,
  Check,
  Shield,
  Sparkles,
  X
} from 'lucide-react';
import { apiClient } from '@/lib/api';

interface Webinar {
  id: string;
  title: string;
  speaker: string;
  session_time: string;
  duration_minutes: number;
  meeting_url?: string | null;
  status: string;
  attendees_count: number;
  auto_reminder_7d_enabled?: boolean;
  auto_reminder_2d_enabled?: boolean;
  reminder_7d_sent_at?: string | null;
  reminder_2d_sent_at?: string | null;
  last_broadcast_email_sent_at?: string | null;
  total_emails_dispatched?: number;
}

interface LiveWebinarsViewProps {
  webinars: Webinar[];
  totalEmployees: number;
  companyName: string;
  onRefresh: () => void;
}

export const LiveWebinarsView: React.FC<LiveWebinarsViewProps> = ({
  webinars,
  totalEmployees,
  companyName,
  onRefresh,
}) => {
  const [selectedWebinarForBroadcast, setSelectedWebinarForBroadcast] = useState<Webinar | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccessMessage, setBroadcastSuccessMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [reminderToast, setReminderToast] = useState<string | null>(null);

  const formatSessionTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const handleBroadcastMailAll = async (webinar: Webinar) => {
    setIsBroadcasting(true);
    setBroadcastSuccessMessage(null);
    try {
      const res = await apiClient.post(`/dashboard/webinars/${webinar.id}/mail-all`);
      setBroadcastSuccessMessage(
        `Successfully dispatched invitations to all ${res.data.recipients_count || totalEmployees} employees from the CSV roster.`
      );
      setTimeout(() => {
        setSelectedWebinarForBroadcast(null);
        setBroadcastSuccessMessage(null);
        onRefresh();
      }, 2200);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to dispatch broadcast emails');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleTriggerReminder = async (webinarId: string, reminderType: '7_DAYS' | '2_DAYS') => {
    setActionLoadingId(`${webinarId}-${reminderType}`);
    try {
      const res = await apiClient.post(`/dashboard/webinars/${webinarId}/trigger-reminders`, {
        reminder_type: reminderType,
        auto_schedule: true,
      });
      setReminderToast(
        `${reminderType === '7_DAYS' ? '7-Day' : '2-Day'} auto-reminder email sent to all ${res.data.recipients_dispatched || totalEmployees} employees!`
      );
      setTimeout(() => setReminderToast(null), 4000);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to trigger reminder');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/60">
              Interactive Sessions
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Live Sensitization Webinars & Roster Mail
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl font-medium leading-relaxed">
            Statutory workshops conducted under Section 19 of the Sexual Harassment of Women at Workplace Act 2013.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 text-xs font-semibold flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>CSV Active: {totalEmployees.toLocaleString()} Learners</span>
          </div>
        </div>
      </div>

      {/* Reminder Notification Toast */}
      {reminderToast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-3 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{reminderToast}</span>
        </div>
      )}

      {/* Webinars List */}
      <div className="space-y-5">
        {webinars && webinars.length > 0 ? (
          webinars.map((webinar, idx) => {
            const hasSent7d = !!webinar.reminder_7d_sent_at;
            const hasSent2d = !!webinar.reminder_2d_sent_at;

            return (
              <div
                key={webinar.id}
                className="bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-200/80 hover:border-blue-400/50 p-5 sm:p-6 transition-all shadow-xs hover:shadow-md space-y-5"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  {/* Left Column: Webinar Metadata */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                      <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200/60 rounded-md px-2 py-0.5 text-[11px]">
                        Session {idx + 1}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {webinar.duration_minutes} Minutes
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {webinar.attendees_count} Attendees
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      {webinar.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-5 text-xs text-slate-600 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span className="text-slate-900 font-semibold">
                          {formatSessionTime(webinar.session_time)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Speaker:</span>
                        <span className="text-slate-800 font-semibold">{webinar.speaker}</span>
                      </div>
                      {webinar.meeting_url && (
                        <a
                          href={webinar.meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 underline font-semibold"
                        >
                          <span>Join Link</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {/* Broadcast Log */}
                    {webinar.last_broadcast_email_sent_at && (
                      <div className="text-xs text-emerald-700 flex items-center gap-1.5 pt-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          Broadcast sent on {new Date(webinar.last_broadcast_email_sent_at).toLocaleDateString()} &bull;{' '}
                          {webinar.total_emails_dispatched || totalEmployees} invites logged
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Mail All Action */}
                  <div className="shrink-0 flex items-center">
                    <button
                      type="button"
                      onClick={() => setSelectedWebinarForBroadcast(webinar)}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Mail All (from CSV)</span>
                    </button>
                  </div>
                </div>

                {/* Auto Reminders (7-day and 2-day) */}
                <div className="pt-4 border-t border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <div className="flex items-center gap-2">
                      <BellRing className="w-4 h-4 text-amber-500" />
                      <span>Automated Reminders (CSV Contacts)</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-normal">
                      7-Day & 2-Day Prior Mailers
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* 7 Days Reminder Row */}
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 flex items-center justify-between shadow-xs">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                          <span>7 Days Prior Reminder</span>
                          {hasSent7d ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200/60">
                              Dispatched
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200/60">
                              Armed
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {hasSent7d
                            ? `Sent on ${new Date(webinar.reminder_7d_sent_at!).toLocaleDateString()}`
                            : 'Scheduled 7 days before session date'}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={actionLoadingId === `${webinar.id}-7_DAYS`}
                        onClick={() => handleTriggerReminder(webinar.id, '7_DAYS')}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {actionLoadingId === `${webinar.id}-7_DAYS` ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                        ) : (
                          <Send className="w-3.5 h-3.5 text-blue-600" />
                        )}
                        <span>{hasSent7d ? 'Re-Mail All' : 'Mail Now'}</span>
                      </button>
                    </div>

                    {/* 2 Days Reminder Row */}
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 flex items-center justify-between shadow-xs">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                          <span>2 Days Prior Reminder</span>
                          {hasSent2d ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200/60">
                              Dispatched
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200/60">
                              Armed
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {hasSent2d
                            ? `Sent on ${new Date(webinar.reminder_2d_sent_at!).toLocaleDateString()}`
                            : 'Scheduled 48 hours before session date'}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={actionLoadingId === `${webinar.id}-2_DAYS`}
                        onClick={() => handleTriggerReminder(webinar.id, '2_DAYS')}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {actionLoadingId === `${webinar.id}-2_DAYS` ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                        ) : (
                          <Send className="w-3.5 h-3.5 text-blue-600" />
                        )}
                        <span>{hasSent2d ? 'Re-Mail All' : 'Mail Now'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-slate-400 font-medium text-sm">
            No live sensitization webinars currently recorded for {companyName}.
          </div>
        )}
      </div>

      {/* Broadcast Modal */}
      {selectedWebinarForBroadcast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                  Statutory Broadcast
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  Dispatch Webinar Invitations
                </h3>
              </div>
              <button
                onClick={() => setSelectedWebinarForBroadcast(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Session Card */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Target Session
              </div>
              <div className="font-bold text-slate-900 text-base">
                {selectedWebinarForBroadcast.title}
              </div>
              <div className="text-xs text-slate-600 font-medium flex items-center gap-2 pt-1">
                <span>{formatSessionTime(selectedWebinarForBroadcast.session_time)}</span>
                <span>&bull;</span>
                <span>Speaker: {selectedWebinarForBroadcast.speaker}</span>
              </div>
            </div>

            {/* Roster Target Details */}
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-700 font-semibold">
                  Recipient Roster: CSV Employee List
                </span>
                <span className="font-bold text-blue-700">
                  {totalEmployees.toLocaleString()} Recipients
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Direct statutory email dispatch with calendar invitation (.ics) and personalized attendance tokens.
              </p>
            </div>

            {/* Email Preview */}
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 text-xs space-y-1.5 text-slate-600">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                Preview Template
              </div>
              <div>
                <strong className="text-slate-900">Subject:</strong> Mandatory PoSH Sensitization: {selectedWebinarForBroadcast.title}
              </div>
              <div>
                <strong className="text-slate-900">Direct Join URL:</strong> {selectedWebinarForBroadcast.meeting_url || 'https://meet.google.com/hryaar-live-posh'}
              </div>
              <div className="text-[11px] text-slate-500 italic pt-1.5 border-t border-slate-200">
                &ldquo;Under Section 19 of the PoSH Act 2013, attendance in this live session is mandated for annual compliance certification...&rdquo;
              </div>
            </div>

            {broadcastSuccessMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{broadcastSuccessMessage}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedWebinarForBroadcast(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isBroadcasting}
                onClick={() => handleBroadcastMailAll(selectedWebinarForBroadcast)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isBroadcasting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Dispatch All ({totalEmployees.toLocaleString()})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
