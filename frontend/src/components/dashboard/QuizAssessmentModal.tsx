'use client';

import React, { useState, useEffect } from 'react';
import { 
  Award, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  ShieldCheck, 
  Printer, 
  Check, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  X,
  Shield
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { apiClient } from '@/lib/api';

interface Question {
  id: string;
  scenario: string;
  options: Array<{ key: string; text: string }>;
}

interface QuizAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  onCertificateIssued?: () => void;
}

export const QuizAssessmentModal: React.FC<QuizAssessmentModalProps> = ({
  isOpen,
  onClose,
  companyName,
  onCertificateIssued,
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [publicVerification, setPublicVerification] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setPublicVerification(null);
      setAnswers({});
      fetchQuestions();
    }
  }, [isOpen]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/training/quiz/questions');
      setQuestions(res.data);
    } catch (err) {
      console.error('Failed to load quiz:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (questionId: string, optionKey: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionKey }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      alert('Please answer all scenarios before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        answers: Object.entries(answers).map(([qid, sel]) => ({
          question_id: qid,
          selected_key: sel,
        })),
      };
      const res = await apiClient.post('/training/quiz/submit', payload);
      setResult(res.data);

      if (res.data.passed) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        if (onCertificateIssued) {
          onCertificateIssued();
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to submit assessment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyPublicly = async (certId: string) => {
    try {
      const res = await apiClient.get(`/training/certificates/verify/${certId}`);
      setPublicVerification(res.data);
    } catch (err) {
      alert('Verification lookup failed.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col relative overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-slate-900">
                  Statutory PoSH Assessment
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                  Section 21
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                70% passing threshold required for cryptographic statutory certificate issuance.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-16 text-center text-slate-400 font-medium text-sm">
              Loading statutory scenarios...
            </div>
          ) : result ? (
            /* Result & Certificate View */
            <div className="space-y-6">
              <div
                className={`p-5 rounded-2xl border ${
                  result.passed
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50/80 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {result.passed ? (
                      <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-7 h-7 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <h4 className="font-bold text-base">
                        {result.passed ? 'Statutory Assessment Passed' : 'Assessment Threshold Unmet'}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5 font-medium">
                        Score: <b>{result.score}%</b> (Threshold: 70%) &bull;{' '}
                        {result.passed ? 'Mandatory Standard Certified' : 'Please review curriculum and re-attempt'}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-2xl text-slate-900 px-3 py-1 bg-white rounded-xl border border-slate-200 shadow-xs">
                    {result.score}%
                  </span>
                </div>
              </div>

              {/* Digital Certificate */}
              {result.passed && (
                <div className="p-6 border-2 border-dashed border-blue-300 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 rounded-2xl text-center relative space-y-4 shadow-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                    Certificate of Statutory Sensitization
                  </div>

                  <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Prevention of Sexual Harassment Mandate
                  </div>

                  <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed font-medium">
                    This certifies that the employee at <b className="text-slate-900">{companyName}</b> has successfully completed the statutory PoSH assessment under the Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013.
                  </p>

                  <div className="pt-4 border-t border-blue-200/60 flex flex-wrap items-center justify-between text-xs text-slate-600 font-medium gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Credential ID</span>
                      <span className="font-mono text-xs font-semibold text-slate-900">{result.certificate_id}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Issue Date</span>
                      <span className="font-semibold text-slate-900">{new Date().toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Validation</span>
                      <span className="font-semibold text-emerald-700">Cryptographically Logged</span>
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-center gap-3">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 rounded-xl flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Document</span>
                    </button>
                    <button
                      onClick={() => handleVerifyPublicly(result.certificate_id)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verify Public Record</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Public Verification Result Box */}
              {publicVerification && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Validated on Public Statutory Ledger</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {publicVerification.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600 font-medium">
                    <div><b>Holder:</b> {publicVerification.recipient_name}</div>
                    <div><b>Entity:</b> {publicVerification.company_name}</div>
                    <div><b>Certificate ID:</b> <span className="font-mono text-slate-900">{publicVerification.certificate_id}</span></div>
                    <div><b>Audit Status:</b> Section 21 Compliant</div>
                  </div>
                </div>
              )}

              <div className="text-center pt-2">
                <button
                  onClick={() => setResult(null)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline cursor-pointer"
                >
                  &larr; Retake Assessment
                </button>
              </div>
            </div>
          ) : (
            /* Scenario Questions List */
            <div className="space-y-5">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                      {q.scenario}
                    </p>
                  </div>

                  <div className="space-y-2 pl-9">
                    {q.options.map((opt) => {
                      const isSelected = answers[q.id] === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleSelect(q.id, opt.key)}
                          className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition-all flex items-start gap-3 cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 text-[10px] font-bold rounded-md flex items-center justify-center shrink-0 border ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-slate-100 border-slate-200 text-slate-600'
                            }`}
                          >
                            {opt.key}
                          </span>
                          <span className="leading-relaxed">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Submit Action */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  Answered: <b>{Object.keys(answers).length}</b> of {questions.length} scenarios
                </span>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || Object.keys(answers).length < questions.length}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-40"
                >
                  <span>{submitting ? 'Evaluating...' : 'Submit & Issue Certificate'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
