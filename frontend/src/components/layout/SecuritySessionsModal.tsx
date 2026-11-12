'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Monitor,
  LogOut,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '@/lib/api';

interface SecuritySessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

interface SessionItem {
  id: string;
  jti: string;
  ip_address?: string | null;
  user_agent?: string | null;
  is_revoked: boolean;
  is_current: boolean;
  created_at: string;
  expires_at: string;
}

export const SecuritySessionsModal: React.FC<SecuritySessionsModalProps> = ({
  isOpen,
  onClose,
  userEmail,
}) => {
  const [tab, setTab] = useState<'sessions' | 'password'>('sessions');
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    setError(null);
    try {
      const res = await apiClient.get('/auth/sessions');
      setSessions(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load active sessions.');
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setMessage(null);
      setError(null);
      fetchSessions();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRevokeSession = async (sessionId: string) => {
    setError(null);
    setMessage(null);
    try {
      await apiClient.post(`/auth/sessions/${sessionId}/revoke`);
      setMessage('Selected device session revoked immediately.');
      await fetchSessions();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to revoke session.');
    }
  };

  const handleRevokeAllOthers = async () => {
    setError(null);
    setMessage(null);
    try {
      const res = await apiClient.post('/auth/sessions/revoke-others');
      setMessage(`Signed out ${res.data.revoked_count} other active session(s).`);
      await fetchSessions();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to revoke other sessions.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSavingPw(true);
    try {
      const res = await apiClient.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setMessage(res.data.message || 'Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await fetchSessions();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update password.');
    } finally {
      setSavingPw(false);
    }
  };

  const pwRules = [
    { label: '8+ characters', met: newPassword.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'Lowercase letter', met: /[a-z]/.test(newPassword) },
    { label: 'Digit', met: /[0-9]/.test(newPassword) },
    { label: 'Special character', met: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Account Security &amp; Sessions</h3>
              <p className="text-[11px] text-slate-500">
                {userEmail || 'Manage active device tokens and credential rotation'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-navigation */}
        <div className="px-6 pt-4 flex gap-2 border-b border-slate-100 pb-3">
          <button
            type="button"
            onClick={() => setTab('sessions')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              tab === 'sessions'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Active Sessions ({sessions.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('password')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              tab === 'password'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Change Password</span>
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
          {message && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {tab === 'sessions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">
                  Revoked tokens are blocked immediately across all cluster nodes.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchSessions}
                    className="p-1.5 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-lg cursor-pointer"
                    title="Refresh sessions"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingSessions ? 'animate-spin' : ''}`} />
                  </button>
                  {sessions.filter((s) => !s.is_current).length > 0 && (
                    <button
                      type="button"
                      onClick={handleRevokeAllOthers}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out Others</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                {sessions.length > 0 ? (
                  sessions.map((s) => (
                    <div
                      key={s.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 truncate">
                            {s.ip_address || '127.0.0.1'}
                          </span>
                          {s.is_current && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                              Current Session
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5 max-w-sm">
                          {s.user_agent || 'Web Client'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          Signed in: {new Date(s.created_at).toLocaleString()}
                        </div>
                      </div>

                      {!s.is_current && (
                        <button
                          type="button"
                          onClick={() => handleRevokeSession(s.id)}
                          className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg font-semibold shrink-0 cursor-pointer"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-400">
                    {loadingSessions ? 'Loading active sessions...' : 'No active sessions found.'}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {pwRules.map((r) => (
                    <span
                      key={r.label}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        r.met
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}
                    >
                      {r.label}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={savingPw}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold cursor-pointer disabled:opacity-50"
                >
                  {savingPw ? 'Updating...' : 'Rotate Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

