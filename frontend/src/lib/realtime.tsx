'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Users,
  CreditCard,
  RefreshCw,
  Cpu,
  X,
  Sparkles,
  Radio,
} from 'lucide-react';

export interface RealtimeEvent {
  id: number;
  event_id: string;
  type: string;
  title: string;
  message: string;
  company_id?: string | null;
  user_id?: string | null;
  node_id?: string | null;
  created_at: string;
  payload?: Record<string, any>;
}

interface ToastItem extends RealtimeEvent {
  toastId: string;
}

interface RealtimeContextType {
  isConnected: boolean;
  isConnecting: boolean;
  events: RealtimeEvent[];
  unreadCount: number;
  clearNotifications: () => void;
  markAllRead: () => void;
  subscribeToEvent: (eventType: string, handler: (event: RealtimeEvent) => void) => () => void;
  broadcastMessage: (title: string, message: string, event_type?: string) => Promise<boolean>;
}

const RealtimeContext = createContext<RealtimeContextType>({
  isConnected: false,
  isConnecting: false,
  events: [],
  unreadCount: 0,
  clearNotifications: () => {},
  markAllRead: () => {},
  subscribeToEvent: () => () => {},
  broadcastMessage: async () => false,
});

export const useRealtime = () => useContext(RealtimeContext);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const listenersRef = useRef<Map<string, Set<(ev: RealtimeEvent) => void>>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);

  // Fetch initial recent events once token is available
  const fetchRecentEvents = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/v1/realtime/recent?limit=15', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.events)) {
          setEvents(data.events);
        }
      }
    } catch {
      // Quiet fail if backend is still spinning up
    }
  }, []);

  const triggerToast = useCallback((event: RealtimeEvent) => {
    const toastItem: ToastItem = {
      ...event,
      toastId: `${event.event_id || event.id}-${Date.now()}`,
    };
    setToasts((prev) => [toastItem, ...prev.slice(0, 3)]); // Keep max 4 concurrent toasts

    // Auto-dismiss after 6.5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.toastId !== toastItem.toastId));
    }, 6500);
  }, []);

  const connectSSE = useCallback(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('posh_token') || localStorage.getItem('token');
    if (!token) {
      setIsConnected(false);
      setIsConnecting(false);
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnecting(true);
    fetchRecentEvents(token);

    const sseUrl = `/api/v1/realtime/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
      setIsConnecting(false);
    };

    es.onerror = () => {
      setIsConnected(false);
      setIsConnecting(false);
      es.close();
      eventSourceRef.current = null;

      if (!isUnmountedRef.current) {
        // Reconnect after 4 seconds
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectSSE();
        }, 4000);
      }
    };

    // Generic onmessage & custom event dispatcher
    const handleIncoming = (ev: MessageEvent) => {
      try {
        const data: RealtimeEvent = JSON.parse(ev.data);
        setEvents((prev) => {
          if (prev.some((e) => e.id === data.id || e.event_id === data.event_id)) return prev;
          return [data, ...prev.slice(0, 49)];
        });
        setUnreadCount((c) => c + 1);
        triggerToast(data);

        // Notify specific event listeners
        const specificListeners = listenersRef.current.get(data.type);
        if (specificListeners) {
          specificListeners.forEach((fn) => fn(data));
        }
        // Notify wildcard listeners
        const wildcardListeners = listenersRef.current.get('*');
        if (wildcardListeners) {
          wildcardListeners.forEach((fn) => fn(data));
        }
      } catch {
        // Heartbeats / non-JSON ignored
      }
    };

    es.onmessage = handleIncoming;

    // Listen to registered statutory event types
    const knownEvents = [
      'COMPLAINT_FILED',
      'COMPLAINT_UPDATED',
      'ASSESSMENT_PASSED',
      'CSV_ROSTER_IMPORTED',
      'LMS_SYNC_COMPLETED',
      'INVOICE_PAID',
      'BATCH_JOB_COMPLETED',
      'SYSTEM_BROADCAST',
      'ANNOUNCEMENT',
    ];
    knownEvents.forEach((evt) => {
      es.addEventListener(evt, handleIncoming as EventListener);
    });
  }, [fetchRecentEvents, triggerToast]);

  useEffect(() => {
    isUnmountedRef.current = false;
    connectSSE();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'posh_token' || e.key === 'token') {
        connectSSE();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      isUnmountedRef.current = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      window.removeEventListener('storage', handleStorage);
    };
  }, [connectSSE]);

  const subscribeToEvent = useCallback((eventType: string, handler: (event: RealtimeEvent) => void) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set());
    }
    listenersRef.current.get(eventType)!.add(handler);

    return () => {
      const set = listenersRef.current.get(eventType);
      if (set) {
        set.delete(handler);
        if (set.size === 0) {
          listenersRef.current.delete(eventType);
        }
      }
    };
  }, []);

  const clearNotifications = useCallback(() => {
    setEvents([]);
    setUnreadCount(0);
  }, []);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const broadcastMessage = useCallback(async (title: string, message: string, event_type = 'SYSTEM_BROADCAST') => {
    try {
      const token = localStorage.getItem('posh_token') || localStorage.getItem('token');
      if (!token) return false;
      const res = await fetch('/api/v1/realtime/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, message, event_type }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        isConnecting,
        events,
        unreadCount,
        clearNotifications,
        markAllRead,
        subscribeToEvent,
        broadcastMessage,
      }}
    >
      {children}

      {/* Floating Real-Time Toast Notifications */}
      <div className="fixed top-20 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            const isCert = toast.type === 'ASSESSMENT_PASSED' || toast.type === 'INVOICE_PAID';
            const isAlert = toast.type.includes('COMPLAINT');
            const isSync = toast.type.includes('CSV') || toast.type.includes('LMS');

            return (
              <motion.div
                key={toast.toastId}
                initial={{ opacity: 0, y: -20, scale: 0.95, x: 20 }}
                animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: 20 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={`pointer-events-auto shadow-2xl rounded-2xl border p-4 backdrop-blur-xl transition-all ${
                  isCert
                    ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-50 shadow-emerald-900/30'
                    : isAlert
                    ? 'bg-amber-950/90 border-amber-500/40 text-amber-50 shadow-amber-900/30'
                    : isSync
                    ? 'bg-indigo-950/90 border-indigo-500/40 text-indigo-50 shadow-indigo-900/30'
                    : 'bg-slate-900/95 border-slate-700/60 text-slate-100 shadow-black/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      isCert
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : isAlert
                        ? 'bg-amber-500/20 text-amber-300'
                        : isSync
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'bg-blue-500/20 text-blue-300'
                    }`}
                  >
                    {isCert && <CheckCircle2 className="w-5 h-5" />}
                    {isAlert && <AlertTriangle className="w-5 h-5" />}
                    {isSync && <RefreshCw className="w-5 h-5" />}
                    {!isCert && !isAlert && !isSync && <Radio className="w-5 h-5 animate-pulse" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/10">
                          {toast.type.replace(/_/g, ' ')}
                        </span>
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      </div>
                      <button
                        onClick={() => setToasts((prev) => prev.filter((t) => t.toastId !== toast.toastId))}
                        className="text-white/60 hover:text-white p-0.5 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <h4 className="font-semibold text-sm mt-1.5 truncate">{toast.title}</h4>
                    <p className="text-xs text-white/80 mt-0.5 line-clamp-2 leading-relaxed">{toast.message}</p>
                    <div className="text-[10px] text-white/50 mt-2 font-mono">
                      {new Date(toast.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </RealtimeContext.Provider>
  );
}
