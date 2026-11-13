'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Zap,
  Users,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Radio,
  FileText
} from 'lucide-react';
import { apiClient } from '@/lib/api';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId?: string;
  companyName: string;
  currentQuota?: number;
  usedCredits?: number;
  onSuccess: (addedSeats: number) => void;
}

const SEAT_PACKS = [
  { seats: 50, priceInr: 10000, priceUsd: 125, badge: 'Startup', popular: false },
  { seats: 100, priceInr: 20000, priceUsd: 250, badge: 'Growth', popular: true },
  { seats: 250, priceInr: 50000, priceUsd: 625, badge: 'Scale', popular: false },
  { seats: 500, priceInr: 100000, priceUsd: 1250, badge: 'Enterprise', popular: false },
];

export const RazorpayCheckoutModal: React.FC<RazorpayCheckoutModalProps> = ({
  isOpen,
  onClose,
  companyId,
  companyName,
  currentQuota = 1500,
  usedCredits = 0,
  onSuccess,
}) => {
  const [selectedPackSeats, setSelectedPackSeats] = useState<number>(100);
  const [customSeats, setCustomSeats] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<any>(null);

  // Load Razorpay script
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (document.getElementById('razorpay-checkout-script')) return;
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  if (!isOpen) return null;

  const effectiveSeats = isCustom ? Math.max(10, Number(customSeats) || 10) : selectedPackSeats;
  const priceInr = effectiveSeats * 200; // ₹200 per employee credit

  const handleProceedToRazorpay = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Create order on backend
      const checkoutRes = await apiClient.post('/billing/checkout', {
        provider: 'RAZORPAY',
        currency: 'INR',
        billing_cycle: 'TOPUP',
        seats_to_add: effectiveSeats,
        company_id: companyId,
      });

      const orderData = checkoutRes.data;

      // 2. If Live Razorpay Keys are active and Razorpay SDK is loaded
      if (orderData.gateway_mode === 'LIVE' && window.Razorpay && orderData.key_id) {
        const options = {
          key: orderData.key_id,
          amount: orderData.amount_cents,
          currency: orderData.currency || 'INR',
          name: 'HRYAAR Digi-PoSH',
          description: `Employee Seat Top-Up (+${effectiveSeats} seats) for ${companyName}`,
          order_id: orderData.order_id,
          prefill: {
            name: companyName,
          },
          theme: {
            color: '#2A62FF',
          },
          handler: async function (response: any) {
            try {
              const verifyRes = await apiClient.post('/billing/verify', {
                order_id: response.razorpay_order_id || orderData.order_id,
                payment_id: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              });
              setSuccessInfo(verifyRes.data);
              onSuccess(effectiveSeats);
            } catch (err: any) {
              setError(err.response?.data?.detail || 'Payment verification failed');
            }
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
            },
          },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
        setLoading(false);
        return;
      }

      // 3. Sandbox / Developer Simulation Mode (When test keys are in use)
      const testPaymentId = `pay_rzp_mock_${Date.now().toString(36)}`;
      const verifyRes = await apiClient.post('/billing/verify', {
        order_id: orderData.order_id,
        payment_id: testPaymentId,
        signature: orderData.sandbox_signature || `sig_${orderData.order_id}_${testPaymentId}`,
      });

      setSuccessInfo({
        ...verifyRes.data,
        seatsAdded: effectiveSeats,
        amount: priceInr,
      });
      onSuccess(effectiveSeats);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to initiate Razorpay checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md text-blue-300">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Razorpay Instant Top-Up</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 font-bold text-[10px] uppercase tracking-wider border border-emerald-400/30">
                  Instant Credit
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">Top up employee seat capacity for {companyName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/60 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {successInfo ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Payment Successfully Verified!</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {effectiveSeats} employee credits have been credited to {companyName}. Your updated capacity is now{' '}
                  <strong className="text-slate-900">{currentQuota + effectiveSeats} seats</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Invoice Number:</span>
                  <span className="font-mono font-bold text-slate-900">{successInfo.invoice_number || 'INV-POSH-RECENT'}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Order ID:</span>
                  <span className="font-mono text-slate-800">{successInfo.order_id}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Amount Paid:</span>
                  <span className="font-bold text-emerald-600">₹{priceInr.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Close &amp; Return to Dashboard
              </button>
            </div>
          ) : (
            <>
              {/* Capacity Banner */}
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/60 flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Current Seat Capacity</div>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">
                    {usedCredits.toLocaleString()} / {currentQuota.toLocaleString()} Used
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Remaining Credits</div>
                  <div className="text-base font-extrabold text-emerald-600">
                    {Math.max(0, currentQuota - usedCredits).toLocaleString()} Seats
                  </div>
                </div>
              </div>

              {/* Seat Packs Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2.5">
                  Select Employee Credit Package
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {SEAT_PACKS.map((pack) => {
                    const isSelected = !isCustom && selectedPackSeats === pack.seats;
                    return (
                      <div
                        key={pack.seats}
                        onClick={() => {
                          setIsCustom(false);
                          setSelectedPackSeats(pack.seats);
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-blue-50/90 border-blue-600 shadow-sm'
                            : 'bg-white border-slate-200/90 hover:border-slate-300'
                        }`}
                      >
                        {pack.popular && (
                          <span className="absolute -top-2 right-3 px-2 py-0.5 bg-blue-600 text-white font-bold text-[9px] uppercase tracking-wider rounded-full shadow-xs">
                            Most Popular
                          </span>
                        )}
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-extrabold text-sm text-slate-900">+{pack.seats} Seats</span>
                          <span className="text-[10px] font-bold text-slate-500">{pack.badge}</span>
                        </div>
                        <div className="text-sm font-bold text-blue-600">
                          ₹{pack.priceInr.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          (₹200 per employee)
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Quantity */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCustom}
                      onChange={(e) => setIsCustom(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Enter Custom Seat Quantity</span>
                  </label>
                  {isCustom && <span className="text-[11px] font-semibold text-blue-600">₹200 / seat</span>}
                </div>
                {isCustom && (
                  <input
                    type="number"
                    min="10"
                    step="10"
                    placeholder="e.g. 150"
                    value={customSeats}
                    onChange={(e) => setCustomSeats(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-900 font-semibold focus:outline-hidden focus:border-blue-600"
                  />
                )}
              </div>

              {/* Payment Summary */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Selected Credits:</span>
                  <span className="font-bold text-white">+{effectiveSeats.toLocaleString()} Employees</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Payment Gateway:</span>
                  <span className="font-semibold text-blue-300 flex items-center gap-1">
                    <span>Razorpay Official</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  </span>
                </div>
                <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-sm">
                  <span className="font-bold text-white">Total Amount (INR):</span>
                  <span className="font-extrabold text-base text-emerald-400">
                    ₹{priceInr.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleProceedToRazorpay}
                disabled={loading || effectiveSeats <= 0}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {loading ? (
                  <span>Processing Razorpay Checkout...</span>
                ) : (
                  <>
                    <span>Proceed to Pay ₹{priceInr.toLocaleString('en-IN')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>256-bit SSL Encrypted • GST Compliant Invoices Generated Automatically</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
