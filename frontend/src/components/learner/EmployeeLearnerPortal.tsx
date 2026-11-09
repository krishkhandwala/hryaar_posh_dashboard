'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  ChevronRight,
  LogOut,
  Printer,
  Sparkles,
  ShieldAlert,
  FileCheck2,
  Building,
  User,
  ExternalLink,
  Send,
  AlertTriangle,
  RefreshCw,
  XCircle,
  HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { apiClient } from '@/lib/api';
import { CompanyLogo } from '@/components/brand/CompanyLogo';

interface EmployeeLearnerPortalProps {
  user: any;
  onLogout: () => void;
}

export const EmployeeLearnerPortal: React.FC<EmployeeLearnerPortalProps> = ({
  user,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'modules' | 'assessment' | 'certificate' | 'grievance'>('modules');
  const [learnerData, setLearnerData] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Assessment Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<any | null>(null);

  // Grievance State
  const [grievanceSummary, setGrievanceSummary] = useState('');
  const [grievanceSubmitting, setGrievanceSubmitting] = useState(false);
  const [grievanceSuccess, setGrievanceSuccess] = useState<any | null>(null);

  const fetchLearnerData = async () => {
    setLoading(true);
    try {
      const [profileRes, modulesRes] = await Promise.all([
        apiClient.get('/learner/me'),
        apiClient.get('/learner/modules'),
      ]);
      setLearnerData(profileRes.data);
      setModules(modulesRes.data);
    } catch (err) {
      console.error('Failed to load learner context:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLearnerData();
  }, []);

  const handleCompleteModule = async (moduleId: string) => {
    setActionLoading(true);
    try {
      await apiClient.post(`/learner/modules/${moduleId}/complete`);
      await fetchLearnerData();
      if (activeModuleIndex < modules.length - 1) {
        setActiveModuleIndex(activeModuleIndex + 1);
      } else {
        setActiveTab('assessment');
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to record module completion');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectQuizOption = (questionId: string, optionKey: string) => {
    setQuizAnswers((prev) => ({ ...prev, [questionId]: optionKey }));
  };

  const handleSubmitQuiz = async () => {
    setQuizSubmitting(true);
    try {
      const payload = {
        answers: Object.entries(quizAnswers).map(([qid, sel]) => ({
          question_id: qid,
          selected_key: sel,
        })),
      };
      const res = await apiClient.post('/learner/assessment/submit', payload);
      setQuizResult(res.data);
      if (res.data.passed) {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
        });
      }
      await fetchLearnerData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to evaluate assessment');
    } finally {
      setQuizSubmitting(false);
    }
  };

  const handleFileGrievance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grievanceSummary.trim()) return;
    setGrievanceSubmitting(true);
    try {
      const res = await apiClient.post('/learner/file-grievance', {
        summary: grievanceSummary,
      });
      setGrievanceSuccess(res.data);
      setGrievanceSummary('');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to lodge grievance');
    } finally {
      setGrievanceSubmitting(false);
    }
  };

  if (loading && !learnerData) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 font-semibold text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <span>Loading Mandated PoSH Learner Portal...</span>
        </div>
      </div>
    );
  }

  const emp = learnerData?.employee || {};
  const comp = learnerData?.company || {};
  const training = learnerData?.training || {};
  const cert = learnerData?.certificate || {};
  const isCertified = cert.is_valid || training.status === 'COMPLETED';

  // Questions for the statutory scenario assessment
  const scenarios = [
    {
      id: 'scenario-1',
      title: 'Scenario 1: Digital Messages After Working Hours',
      prompt: 'A team lead frequently sends personal compliments, heart emojis, and unsolicited late-night messages to a junior team member on personal WhatsApp, asking about her dating life. The team member feels uncomfortable but hesitates to reply.',
      options: [
        { key: 'A', text: 'This is not harassment because it occurred outside office premises on private WhatsApp.' },
        { key: 'B', text: 'This constitutes Sexual Harassment creating a hostile environment under Section 2(n), as the workplace extends to electronic communications and power dynamics.' },
        { key: 'C', text: 'It is harmless banter and should be ignored until formal performance evaluations.' },
      ],
    },
    {
      id: 'scenario-2',
      title: 'Scenario 2: Quid Pro Quo Coercion',
      prompt: 'During an appraisal discussion, a senior manager hints that an outstanding rating and promotion are contingent upon joining him for an unchaperoned weekend getaway.',
      options: [
        { key: 'A', text: 'This is standard corporate negotiation and acceptable unless physical contact occurred.' },
        { key: 'B', text: 'The employee must decline and wait 6 months before informing HR.' },
        { key: 'C', text: 'This is classic Quid Pro Quo sexual harassment under Section 3(2) of the Act, which explicitly prohibits promising preferential employment in exchange for sexual favors.' },
      ],
    },
    {
      id: 'scenario-3',
      title: 'Scenario 3: Active Bystander Intervention',
      prompt: 'During a cross-functional offsite dinner, you notice a colleague repeatedly making sexually suggestive jokes directed at a quiet peer who is visibly humiliated.',
      options: [
        { key: 'A', text: 'Remain silent to avoid social conflict since the comment was not directed at you.' },
        { key: 'B', text: 'Actively intervene using bystander principles (e.g. interrupt the conversation, express that the comments are inappropriate, or check in with the peer and assist in notifying the IC).' },
        { key: 'C', text: 'Laugh along to maintain group rapport.' },
      ],
    },
    {
      id: 'scenario-4',
      title: 'Scenario 4: Statutory Timelines & Confidentiality',
      prompt: 'An employee experienced an unwelcome incident 2 months ago and wishes to submit a complaint. What are her legal rights regarding timelines and confidentiality?',
      options: [
        { key: 'A', text: 'The complaint is expired because complaints must be submitted within 7 days.' },
        { key: 'B', text: 'The employer has the right to publish the names on the company intranet for transparency.' },
        { key: 'C', text: 'She has 3 months from the incident date to lodge a complaint to the IC, and Section 16 strictly prohibits publishing or leaking the identities of the complainant, respondent, or witnesses.' },
      ],
    },
    {
      id: 'scenario-5',
      title: 'Scenario 5: Protection Against Retaliation',
      prompt: 'After providing truthful witness testimony to the Internal Committee, an employee is abruptly removed from primary client accounts by the respondent manager.',
      options: [
        { key: 'A', text: 'Managers have absolute discretion to assign accounts regardless of IC inquiries.' },
        { key: 'B', text: 'This is illegal retaliation. Section 15 and corporate compliance treat retaliatory actions as a severe violation warranting disciplinary inquiry.' },
        { key: 'C', text: 'The witness must accept the reassignment without recourse.' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans select-none">
      {/* Top Company Branded Learner Header */}
      <header className="h-18 bg-white border-b border-slate-200/80 px-6 sm:px-10 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-4">
          <CompanyLogo
            name={comp.name || 'Enterprise Client'}
            slug={comp.slug}
            logoUrl={comp.logo_url}
            primaryColor={comp.primary_color}
            size="md"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {comp.name || 'Enterprise Client'}
              </h1>
              {comp.partner_name && comp.co_branding_mode === 'CO_BRANDED' && (
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/70">
                  <CompanyLogo
                    name={comp.partner_name}
                    logoUrl={comp.partner_logo_url}
                    size="xs"
                    showBorder={false}
                  />
                  <span>Managed by {comp.partner_name}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Mandatory PoSH Statutory Sensitization &bull; CY 2025–2026 Mandate
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 font-bold text-xs flex items-center justify-center shadow-xs">
              {emp.full_name?.charAt(0) || 'E'}
            </div>
            <div className="hidden sm:block text-left text-xs">
              <div className="font-bold text-slate-900 leading-tight">
                {emp.full_name}
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                {emp.employee_code} &bull; {emp.department}
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200/80 transition-colors ml-1 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Learner Canvas */}
      <main className="p-6 sm:p-10 max-w-6xl w-full mx-auto space-y-7 flex-1">
        {/* Compliance Hero Progress Banner */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                isCertified
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                  : 'bg-blue-50 text-blue-700 border border-blue-200/70'
              }`}>
                {isCertified ? 'Statutory Mandate Certified' : 'Active Compliance Cycle'}
              </span>
              <span className="text-slate-400 text-xs">&bull;</span>
              <span className="text-xs font-semibold text-slate-700">Section 19 Sensitization</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {isCertified
                ? `Congratulations ${emp.full_name}, your statutory certificate is active.`
                : `Annual Workplace Dignity & Harassment Prevention Course`}
            </h2>

            <p className="text-xs text-slate-500 font-medium max-w-2xl leading-relaxed">
              Under Section 19 of the Sexual Harassment of Women at Workplace Act 2013, all corporate employees must complete statutory modules and achieve ≥70% on the assessment.
            </p>

            {/* Dynamic Progress Bar */}
            <div className="pt-2 space-y-1.5 max-w-md">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Course Completion Progress</span>
                <span className="text-blue-600">{Math.round(training.progress_pct || 0)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isCertified
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                  }`}
                  style={{ width: `${Math.min(100, Math.round(training.progress_pct || 0))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3">
            {isCertified ? (
              <button
                onClick={() => setActiveTab('certificate')}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <Award className="w-4 h-4" />
                <span>View Official Certificate</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('modules')}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                <span>Resume Training Modules</span>
              </button>
            )}
          </div>
        </div>

        {/* Learner Tabs */}
        <div className="flex items-center bg-slate-200/60 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('modules')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'modules' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Curriculum Modules ({modules.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('assessment')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'assessment' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Statutory Assessment</span>
          </button>

          <button
            onClick={() => setActiveTab('certificate')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'certificate' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Digital Certificate</span>
          </button>

          <button
            onClick={() => setActiveTab('grievance')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'grievance' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Confidential IC Redressal</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: CURRICULUM MODULES & INTERACTIVE PLAYER */}
        {/* ======================================================== */}
        {activeTab === 'modules' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
            {/* Left Column: Module Selector List */}
            <div className="lg:col-span-4 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block px-1">
                Course Syllabus
              </span>
              {modules.map((mod, idx) => {
                const isSelected = activeModuleIndex === idx;
                const isCompleted = training.completed_modules?.includes(mod.id);

                return (
                  <button
                    key={mod.id}
                    onClick={() => setActiveModuleIndex(idx)}
                    className={`w-full p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-500 shadow-xs ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : idx + 1}
                    </div>

                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Module {mod.order}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3" />
                          {mod.duration_minutes}m
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {mod.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {mod.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Active Module Content Reader */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
              {modules[activeModuleIndex] && (
                <>
                  <div className="border-b border-slate-100 pb-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-blue-600 mb-1">
                      <span>Module {modules[activeModuleIndex].order} of {modules.length}</span>
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {modules[activeModuleIndex].duration_minutes} Minutes
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {modules[activeModuleIndex].title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      {modules[activeModuleIndex].description}
                    </p>
                  </div>

                  {/* Sections */}
                  <div className="space-y-5">
                    {modules[activeModuleIndex].sections?.map((sec: any, sIdx: number) => (
                      <div key={sIdx} className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/70 space-y-2">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          {sec.subtitle}
                        </h4>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                          {sec.content}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Key Takeaway Box */}
                  <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-1">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Statutory Core Principle</span>
                    </div>
                    <p className="text-xs text-slate-800 font-semibold leading-relaxed">
                      {modules[activeModuleIndex].key_takeaway}
                    </p>
                  </div>

                  {/* Bottom Navigation Actions */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      disabled={activeModuleIndex === 0}
                      onClick={() => setActiveModuleIndex(activeModuleIndex - 1)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      &larr; Previous Module
                    </button>

                    <button
                      disabled={actionLoading}
                      onClick={() => handleCompleteModule(modules[activeModuleIndex].id)}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                    >
                      {actionLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving Progress...</span>
                        </>
                      ) : activeModuleIndex < modules.length - 1 ? (
                        <>
                          <span>Complete & Continue</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          <span>Complete Curriculum & Start Quiz</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: STATUTORY ASSESSMENT QUIZ */}
        {/* ======================================================== */}
        {activeTab === 'assessment' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs max-w-3xl mx-auto space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                Mandatory Assessment &bull; Section 21
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                Statutory Workplace Scenarios Evaluation
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Answer each practical workplace dilemma. Scoring 70% or higher automatically issues your verifiable digital compliance certificate.
              </p>
            </div>

            {quizResult ? (
              <div className="space-y-6">
                <div className={`p-5 rounded-2xl border ${
                  quizResult.passed
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {quizResult.passed ? (
                        <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-8 h-8 text-rose-600 shrink-0" />
                      )}
                      <div>
                        <h4 className="font-bold text-base">
                          {quizResult.passed ? 'Statutory Assessment Passed!' : 'Benchmark Threshold Unmet'}
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5 font-medium">
                          Your score: <b>{quizResult.score}%</b> (Statutory benchmark: 70%) &bull;{' '}
                          {quizResult.passed
                            ? 'Digital completion certificate generated and logged.'
                            : 'Please review curriculum modules and re-attempt.'}
                        </p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-slate-900 bg-white px-3 py-1 rounded-xl border border-slate-200">
                      {quizResult.score}%
                    </span>
                  </div>
                </div>

                {quizResult.passed && (
                  <div className="text-center pt-2">
                    <button
                      onClick={() => setActiveTab('certificate')}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-2"
                    >
                      <Award className="w-4 h-4" />
                      <span>View & Download Certificate</span>
                    </button>
                  </div>
                )}

                <div className="text-center">
                  <button
                    onClick={() => {
                      setQuizResult(null);
                      setQuizAnswers({});
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline cursor-pointer"
                  >
                    Retake Statutory Assessment
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {scenarios.map((sc, idx) => (
                  <div key={sc.id} className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                          {sc.title}
                        </h4>
                        <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                          {sc.prompt}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 pl-9">
                      {sc.options.map((opt) => {
                        const isSelected = quizAnswers[sc.id] === opt.key;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => handleSelectQuizOption(sc.id, opt.key)}
                            className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition-all flex items-start gap-3 cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <span className={`w-5 h-5 text-[10px] font-bold rounded-md flex items-center justify-center shrink-0 border ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-slate-100 border-slate-200 text-slate-600'
                            }`}>
                              {opt.key}
                            </span>
                            <span className="leading-relaxed">{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    Answered: <b>{Object.keys(quizAnswers).length}</b> of {scenarios.length} scenarios
                  </span>
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={quizSubmitting || Object.keys(quizAnswers).length < scenarios.length}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-40"
                  >
                    <span>{quizSubmitting ? 'Evaluating...' : 'Submit & Generate Certificate'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: VERIFIABLE DIGITAL CERTIFICATE */}
        {/* ======================================================== */}
        {activeTab === 'certificate' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                  Statutory Credential
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Official Completion Certificate
                </h3>
              </div>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Certificate</span>
              </button>
            </div>

            {isCertified && cert.certificate_id ? (
              <div className="p-8 border-2 border-dashed border-blue-300 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/50 rounded-2xl text-center space-y-5 shadow-sm relative">
                {/* Certificate Company Seal / Watermark */}
                <div className="flex justify-center">
                  <CompanyLogo
                    name={comp.name}
                    slug={comp.slug}
                    logoUrl={comp.logo_url}
                    primaryColor={comp.primary_color}
                    size="xl"
                    className="shadow-md"
                  />
                </div>

                <div className="text-[11px] font-bold uppercase tracking-widest text-blue-700">
                  Certificate of Statutory Compliance
                </div>

                <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Prevention of Sexual Harassment Mandate
                </div>

                <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed font-medium">
                  This certifies that <b className="text-slate-900">{emp.full_name}</b> (Code: <span className="font-mono">{emp.employee_code}</span>), employed at <b className="text-slate-900">{comp.name}</b>, has successfully concluded all mandated training modules and passed the statutory evaluation under the <b>Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013</b>.
                </p>

                {/* Metadata Row */}
                <div className="pt-6 border-t border-blue-200/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-medium text-slate-600">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Certificate ID</span>
                    <span className="font-mono text-xs font-bold text-blue-700">{cert.certificate_id}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Issue Date</span>
                    <span className="font-semibold text-slate-800">
                      {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : new Date().toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Compliance Mandate</span>
                    <span className="font-semibold text-slate-800">CY 2025–2026</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Validation</span>
                    <span className="font-semibold text-emerald-700">Section 21 Verified</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center space-y-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Award className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-800">
                  Certificate Not Yet Issued
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
                  Please complete the curriculum modules and achieve a passing score of 70% or higher on the statutory assessment to generate your official certificate.
                </p>
                <button
                  onClick={() => setActiveTab('modules')}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  Start Training Modules
                </button>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: CONFIDENTIAL IC GRIEVANCE HOTLINE */}
        {/* ======================================================== */}
        {activeTab === 'grievance' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs max-w-3xl mx-auto space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                Confidential Inquiry Channel &bull; Section 16 Protected
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                Internal Committee (IC) Direct Redressal Channel
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                Send a secure, encrypted notice or inquiry directly to your company&apos;s Presiding Officer and Internal Committee members. Section 16 non-disclosure and anti-retaliation protections apply automatically.
              </p>
            </div>

            {grievanceSuccess ? (
              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-emerald-950 text-sm">
                      Confidential Ticket Lodged Successfully
                    </h4>
                    <span className="font-mono text-xs font-semibold text-emerald-800">
                      Tracking ID: {grievanceSuccess.ticket_number}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {grievanceSuccess.message}
                </p>
                <button
                  onClick={() => setGrievanceSuccess(null)}
                  className="px-4 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition-all cursor-pointer"
                >
                  Submit Another Notice
                </button>
              </div>
            ) : (
              <form onSubmit={handleFileGrievance} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Confidential Summary / Incident Description
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={grievanceSummary}
                    onChange={(e) => setGrievanceSummary(e.target.value)}
                    placeholder="Describe the incident, question, or guidance required from the Presiding Officer. All submissions are treated under strict judicial non-disclosure."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium leading-relaxed"
                  />
                </div>

                <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200/70 text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                    <span>Statutory Protections Under Law</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                    This inquiry is transmitted directly to the IC Presiding Officer. Your employer is legally prohibited from taking any adverse or retaliatory employment action against you under Section 15 of the Act.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={grievanceSubmitting || !grievanceSummary.trim()}
                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {grievanceSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Transmitting Securely...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Lodge Confidential Notice to IC</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </main>

      {/* Modern Learner Footer */}
      <footer className="mt-auto py-4 px-8 border-t border-slate-200/80 bg-white text-center text-xs text-slate-500 font-medium flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="text-slate-700 font-semibold">
          {comp.name || 'Corporate'} &bull; Mandatory Workplace Sensitization Platform
        </div>
        <div className="text-slate-400 text-[11px]">
          HRYAAR Digi-PoSH &bull; Prevention | Prohibition | Redressal
        </div>
      </footer>
    </div>
  );
};

