'use client';

import React, { useState, useEffect } from 'react';
import { 
  Webhook, 
  Key, 
  RefreshCw, 
  Copy, 
  Check, 
  Plus, 
  ShieldCheck, 
  AlertCircle, 
  Zap, 
  Clock, 
  ExternalLink,
  Code2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { apiClient } from '@/lib/api';

interface APIKeyItem {
  id: string;
  name: string;
  masked_key: string;
  created_at: string;
  last_used_at?: string | null;
  is_active: boolean;
}

interface IntegrationData {
  company_id: string;
  webhook_url: string;
  lms_adapter: string;
  sync_frequency: string;
  api_keys: APIKeyItem[];
}

export const IntegrationsView: React.FC<{ companyName: string; onSyncComplete?: () => void }> = ({
  companyName,
  onSyncComplete,
}) => {
  const [data, setData] = useState<IntegrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [createdKeyPlaintext, setCreatedKeyPlaintext] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/company/integrations');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load integrations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleCopyWebhook = () => {
    if (data?.webhook_url) {
      navigator.clipboard.writeText(data.webhook_url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleGenerateKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await apiClient.post('/company/integrations/api-keys', {
        name: newKeyName.trim(),
      });
      setCreatedKeyPlaintext(res.data.api_key);
      setNewKeyName('');
      setIsGeneratingKey(false);
      fetchIntegrations();
    } catch (err) {
      alert('Failed to generate API Key');
    }
  };

  const handleRevokeKey = async (keyId: string, keyName: string) => {
    try {
      await apiClient.delete(`/company/integrations/api-keys/${keyId}`);
      fetchIntegrations();
    } catch (err) {
      alert(`Failed to revoke API key "${keyName}"`);
    }
  };

  const handleSimulateSync = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      const res = await apiClient.post('/company/integrations/simulate-lms-sync', {});
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
      setSyncResult(`Successfully synced ${res.data.synced_records} employee records via Leap10x LMS Relay!`);
      fetchIntegrations();
      if (onSyncComplete) onSyncComplete();
    } catch (err) {
      setSyncResult('Simulation failed: Please check server status.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
        <p className="text-sm text-slate-500 font-medium">Loading LMS Integration Fabric...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Webhook className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-[#0A192F] tracking-tight">
                  LMS & Webhook Integration Gateway
                </h2>
                <span className="text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Real-time Ingestion
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Automated continuous sync with Leap10x, Cornerstone OnDemand, Workday, and SAP SuccessFactors.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSimulateSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${syncing ? 'animate-bounce' : ''}`} />
              <span>{syncing ? 'Ingesting Batch...' : 'Simulate Leap10x LMS Sync'}</span>
            </button>
          </div>
        </div>

        {syncResult && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
            <span>{syncResult}</span>
            <button onClick={() => setSyncResult(null)} className="text-emerald-600 hover:text-emerald-900">&times;</button>
          </div>
        )}

        {/* Integration Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
            <span className="text-[10px] font-bold uppercase text-slate-400">Supported Connector</span>
            <p className="font-extrabold text-sm text-[#0A192F] mt-1">{data?.lms_adapter}</p>
            <span className="text-[11px] text-slate-500 mt-0.5 block">REST JSON Webhook Relay</span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
            <span className="text-[10px] font-bold uppercase text-slate-400">Sync Cadence</span>
            <p className="font-extrabold text-sm text-[#0A192F] mt-1">{data?.sync_frequency}</p>
            <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Webhook Listener Active
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
            <span className="text-[10px] font-bold uppercase text-slate-400">Tenant Target Scope</span>
            <p className="font-mono font-bold text-xs text-slate-700 mt-1 truncate">{data?.company_id}</p>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Strict Boundary Isolation</span>
          </div>
        </div>

        {/* Webhook Endpoint */}
        <div className="mt-6 p-4 rounded-xl border border-slate-200 bg-slate-900 text-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-blue-400" />
              <span>Inbound Webhook Listener URL</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">POST /webhook/:tenant_id</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={data?.webhook_url || ''}
              className="w-full bg-black/40 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-blue-300 select-all"
            />
            <button
              onClick={handleCopyWebhook}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* One-Time Plaintext Key Modal Alert */}
      {createdKeyPlaintext && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <h4 className="font-black text-sm">Save Your API Key Now (Never Shown Again)</h4>
          </div>
          <p className="text-xs text-amber-800 mb-3">
            This cryptographic key authenticates your external LMS webhook payload. HRYAAR stores only a salted bcrypt hash.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={createdKeyPlaintext}
              className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 select-all"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(createdKeyPlaintext);
                alert('API key copied to clipboard!');
              }}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
            >
              Copy Key
            </button>
            <button
              onClick={() => setCreatedKeyPlaintext(null)}
              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* API Keys Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-slate-500" />
            <h3 className="font-extrabold text-sm text-[#0A192F]">Active API Keys & Tokens</h3>
          </div>
          <button
            onClick={() => setIsGeneratingKey(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generate New Key</span>
          </button>
        </div>

        {isGeneratingKey && (
          <div className="mb-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <input
              type="text"
              placeholder="e.g. Workday Production Webhook Adapter"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <button
              onClick={handleGenerateKey}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Confirm
            </button>
            <button
              onClick={() => setIsGeneratingKey(false)}
              className="px-3 py-2 text-slate-500 hover:text-slate-800 text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase text-[10px]">
                <th className="py-2.5 px-3">Adapter Name</th>
                <th className="py-2.5 px-3">Token Mask</th>
                <th className="py-2.5 px-3">Created</th>
                <th className="py-2.5 px-3">Last Sync Call</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.api_keys && data.api_keys.length > 0 ? (
                data.api_keys.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3 font-bold text-slate-800">{k.name}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{k.masked_key}</td>
                    <td className="py-3 px-3 text-slate-500">{new Date(k.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-3 text-slate-500">
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleTimeString() : 'Never'}
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      {k.is_active ? (
                        <>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ACTIVE
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRevokeKey(k.id, k.name)}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer"
                          >
                            Revoke
                          </button>
                        </>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-500 border border-slate-200">
                          REVOKED
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No active API keys found. Generate a key or trigger Leap10x sync to automatically configure.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

