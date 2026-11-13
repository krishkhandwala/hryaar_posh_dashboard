'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  UserPlus,
  HelpCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  CreditCard,
  Plus,
  Trash2,
  ArrowRight,
  ShieldAlert,
  Send,
  RefreshCw,
  X,
  FileText
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { RazorpayCheckoutModal } from '@/components/modals/RazorpayCheckoutModal';

interface RosterAndRequestsViewProps {
  companyId: string;
  companyName: string;
  onRefreshData?: () => void;
}

export const RosterAndRequestsView: React.FC<RosterAndRequestsViewProps> = ({
  companyId,
  companyName,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'csv' | 'add_employee' | 'concern' | 'history'>('csv');
  const [creditInfo, setCreditInfo] = useState<any>({
    credits_total: 1500,
    credits_used: 0,
    credits_remaining: 1500,
    is_exhausted: false,
    is_near_exhaustion: false,
    utilization_pct: 0,
  });
  const [requestsHistory, setRequestsHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [isRazorpayModalOpen, setIsRazorpayModalOpen] = useState<boolean>(false);

  // CSV Upload State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvNotes, setCsvNotes] = useState<string>('');
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([]);
  const [csvParsedCount, setCsvParsedCount] = useState<number>(0);
  const [uploadingCsv, setUploadingCsv] = useState<boolean>(false);
  const [csvSuccessMessage, setCsvSuccessMessage] = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Individual Employee Form State
  const [employeeItems, setEmployeeItems] = useState([
    { name: '', email: '', phone: '', department: 'General', designation: 'Team Member', notes: '' },
  ]);
  const [submittingEmployees, setSubmittingEmployees] = useState<boolean>(false);
  const [employeeSuccessMessage, setEmployeeSuccessMessage] = useState<string | null>(null);
  const [employeeError, setEmployeeError] = useState<string | null>(null);

  // Corporate Concern State
  const [concernTitle, setConcernTitle] = useState<string>('');
  const [concernCategory, setConcernCategory] = useState<string>('ENROLLMENT');
  const [concernPriority, setConcernPriority] = useState<string>('NORMAL');
  const [concernDesc, setConcernDesc] = useState<string>('');
  const [submittingConcern, setSubmittingConcern] = useState<boolean>(false);
  const [concernSuccessMessage, setConcernSuccessMessage] = useState<string | null>(null);
  const [concernError, setConcernError] = useState<string | null>(null);

  const fetchCreditsAndRequests = async () => {
    try {
      const [credRes, reqRes] = await Promise.all([
        apiClient.get(`/company/credits?company_id=${companyId}`),
        apiClient.get(`/company/service-requests?company_id=${companyId}`),
      ]);
      setCreditInfo(credRes.data);
      setRequestsHistory(reqRes.data);
    } catch {
      // Quiet fail if network glitch
    }
  };

  useEffect(() => {
    fetchCreditsAndRequests();
  }, [companyId]);

  // Handle CSV file selection and client-side parse
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setCsvError(null);
    setCsvSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length <= 1) {
          setCsvError('CSV file has no employee data rows.');
          return;
        }
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const preview: any[] = [];
        for (let i = 1; i < Math.min(lines.length, 6); i++) {
          const cols = lines[i].split(',').map((c) => c.trim());
          const obj: any = {};
          headers.forEach((h, idx) => {
            obj[h] = cols[idx] || '';
          });
          preview.push(obj);
        }
        setCsvPreviewRows(preview);
        setCsvParsedCount(lines.length - 1);
      } catch {
        setCsvError('Unable to parse CSV file. Ensure it is a valid comma-separated file.');
      }
    };
    reader.readAsText(file);
  };

  // Submit CSV Roster
  const handleUploadCsvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) {
      setCsvError('Please select a CSV file first.');
      return;
    }
    setUploadingCsv(true);
    setCsvError(null);
    setCsvSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      if (csvNotes) formData.append('notes', csvNotes);
      formData.append('company_id', companyId);

      const res = await apiClient.post('/company/service-requests/upload-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setCsvSuccessMessage(
        `Successfully submitted roster (${res.data.row_count} employees) to Super Admin. Track status in the History tab below.`
      );
      setCsvFile(null);
      setCsvPreviewRows([]);
      setCsvParsedCount(0);
      setCsvNotes('');
      fetchCreditsAndRequests();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setCsvError(err.response?.data?.detail || 'Failed to upload CSV roster.');
    } finally {
      setUploadingCsv(false);
    }
  };

  // Download Sample CSV Template
  const handleDownloadTemplate = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,First Name,Last Name,Email,Phone,Department,Designation\n' +
      'Aarav,Patel,aarav.patel@acme.com,9876543210,Engineering,Software Engineer\n' +
      'Sneha,Reddy,sneha.reddy@acme.com,9876543211,Human Resources,HR Business Partner\n' +
      'Vikram,Mehta,vikram.mehta@acme.com,9876543212,Finance,Financial Analyst\n';

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hryaar_employee_roster_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit Individual Employee Request
  const handleSubmitEmployees = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = employeeItems.filter((e) => e.name && e.email);
    if (valid.length === 0) {
      setEmployeeError('Please fill out at least one employee name and corporate email.');
      return;
    }
    setSubmittingEmployees(true);
    setEmployeeError(null);

    try {
      await apiClient.post('/company/service-requests/employee-addition', {
        employees: valid,
        notes: 'Submitted via Client Dashboard',
        company_id: companyId,
      });

      setEmployeeSuccessMessage(`Successfully submitted request for ${valid.length} employee(s).`);
      setEmployeeItems([
        { name: '', email: '', phone: '', department: 'General', designation: 'Team Member', notes: '' },
      ]);
      fetchCreditsAndRequests();
    } catch (err: any) {
      setEmployeeError(err.response?.data?.detail || 'Failed to submit employee requests.');
    } finally {
      setSubmittingEmployees(false);
    }
  };

  // Submit Corporate Concern
  const handleSubmitConcern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concernTitle || !concernDesc) {
      setConcernError('Title and description are required.');
      return;
    }
    setSubmittingConcern(true);
    setConcernError(null);

    try {
      await apiClient.post('/company/service-requests/concern', {
        title: concernTitle,
        category: concernCategory,
        priority: concernPriority,
        description: concernDesc,
        company_id: companyId,
      });

      setConcernSuccessMessage('Your concern has been transmitted to the Super Admin Operations Desk.');
      setConcernTitle('');
      setConcernDesc('');
      fetchCreditsAndRequests();
    } catch (err: any) {
      setConcernError(err.response?.data?.detail || 'Failed to submit concern.');
    } finally {
      setSubmittingConcern(false);
    }
  };

  const exceedsCreditQuota = csvParsedCount > creditInfo.credits_remaining;

  return (
    <div className="space-y-6">
      {/* Top Employee Credit Capacity Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-6 shadow-xl border border-blue-900/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Employee Seat Licences
              </span>
              {creditInfo.is_exhausted ? (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/30 text-rose-300 border border-rose-400/40 animate-pulse">
                  Quota Exhausted
                </span>
              ) : creditInfo.is_near_exhaustion ? (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/30 text-amber-300 border border-amber-400/40">
                  Near Capacity
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Active Standing
                </span>
              )}
            </div>

            <h2 className="text-xl font-extrabold tracking-tight">
              {creditInfo.credits_used.toLocaleString()} / {creditInfo.credits_total.toLocaleString()} Seats Enrolled
            </h2>
            <p className="text-xs text-blue-200/80">
              You have <strong className="text-white">{creditInfo.credits_remaining.toLocaleString()} credits remaining</strong> for new employee training and statutory certification.
            </p>

            {/* Progress Bar */}
            <div className="w-full max-w-md bg-white/10 rounded-full h-2.5 overflow-hidden mt-3 border border-white/10">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  creditInfo.is_exhausted
                    ? 'bg-rose-500'
                    : creditInfo.is_near_exhaustion
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, creditInfo.utilization_pct)}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => setIsRazorpayModalOpen(true)}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <CreditCard className="w-4 h-4" />
              <span>Buy Credits via Razorpay</span>
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-3 bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Sample CSV Template</span>
            </button>
          </div>
        </div>
      </div>

      {/* Exhaustion Warning Banner */}
      {creditInfo.is_exhausted && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="text-xs">
              <strong className="font-bold">Employee Seat Limit Reached!</strong> All {creditInfo.credits_total} purchased credits are in use. Top up your seats to enroll new team members.
            </div>
          </div>
          <button
            onClick={() => setIsRazorpayModalOpen(true)}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-xs"
          >
            Top Up Seats
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('csv')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'csv'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Upload CSV Roster</span>
        </button>

        <button
          onClick={() => setActiveTab('add_employee')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'add_employee'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Employee Request</span>
        </button>

        <button
          onClick={() => setActiveTab('concern')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'concern'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Submit Corporate Concern</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Requests History ({requestsHistory.length})</span>
        </button>
      </div>

      {/* TAB 1: UPLOAD CSV ROSTER */}
      {activeTab === 'csv' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Upload Employee Roster (CSV)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload employee records including Name, Email, Phone Number, Department, and Designation.
            </p>
          </div>

          <form onSubmit={handleUploadCsvSubmit} className="space-y-5">
            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
                csvFile
                  ? 'border-blue-500 bg-blue-50/50'
                  : 'border-slate-300 hover:border-blue-400 bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>

              {csvFile ? (
                <div className="space-y-1">
                  <div className="font-bold text-sm text-slate-900">{csvFile.name}</div>
                  <div className="text-xs text-blue-600 font-semibold">
                    {csvParsedCount} employee row(s) parsed • {(csvFile.size / 1024).toFixed(1)} KB
                  </div>
                  <div className="text-[11px] text-slate-400">Click to choose another file</div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="font-bold text-sm text-slate-800">
                    Click to browse or drop CSV file here
                  </div>
                  <div className="text-xs text-slate-400">
                    Required headers: <code className="bg-slate-200/80 px-1 py-0.5 rounded font-mono text-[11px]">name, email, phone, department, designation</code>
                  </div>
                </div>
              )}
            </div>

            {/* Quota warning if file exceeds credits */}
            {exceedsCreditQuota && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold">Roster size exceeds available credits!</div>
                  <p>
                    Your CSV contains <strong>{csvParsedCount} employees</strong>, but your organization only has{' '}
                    <strong>{creditInfo.credits_remaining} credits</strong> remaining.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsRazorpayModalOpen(true)}
                    className="inline-flex items-center gap-1 font-bold text-blue-700 hover:underline mt-1 cursor-pointer"
                  >
                    <span>Purchase +{csvParsedCount - creditInfo.credits_remaining} credits via Razorpay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Preview Table */}
            {csvPreviewRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">File Preview (First 5 Rows)</span>
                  <span className="text-slate-400">Total {csvParsedCount} records</span>
                </div>
                <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">Name</th>
                        <th className="px-4 py-2.5">Corporate Email</th>
                        <th className="px-4 py-2.5">Phone Number</th>
                        <th className="px-4 py-2.5">Department</th>
                        <th className="px-4 py-2.5">Designation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {csvPreviewRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2 font-medium text-slate-900">{row.name || `${row.first_name || ''} ${row.last_name || ''}` || '—'}</td>
                          <td className="px-4 py-2 font-mono text-[11px]">{row.email || row.corporate_email || '—'}</td>
                          <td className="px-4 py-2 font-mono text-[11px]">{row.phone || row.mobile || row.number || '—'}</td>
                          <td className="px-4 py-2">{row.department || 'General'}</td>
                          <td className="px-4 py-2">{row.designation || 'Team Member'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Operational Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Notes for Super Admin Operations (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Q1 2026 Batch onboarding for Bengaluru sales & engineering units..."
                value={csvNotes}
                onChange={(e) => setCsvNotes(e.target.value)}
                className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-blue-600"
              />
            </div>

            {csvError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{csvError}</span>
              </div>
            )}

            {csvSuccessMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{csvSuccessMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400 font-medium">
                CSV submissions are transmitted directly to the Platform Super Admin desk.
              </span>
              <button
                type="submit"
                disabled={uploadingCsv || !csvFile}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                {uploadingCsv ? (
                  <span>Submitting Roster to Super Admin...</span>
                ) : (
                  <>
                    <span>Submit CSV Roster</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: ADD INDIVIDUAL EMPLOYEES */}
      {activeTab === 'add_employee' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Request Individual Employee Additions</h3>
              <p className="text-xs text-slate-500 mt-0.5">Submit new employee enrolments without uploading a full CSV file.</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setEmployeeItems([
                  ...employeeItems,
                  { name: '', email: '', phone: '', department: 'General', designation: 'Team Member', notes: '' },
                ])
              }
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another</span>
            </button>
          </div>

          <form onSubmit={handleSubmitEmployees} className="space-y-4">
            <div className="space-y-3">
              {employeeItems.map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Employee #{idx + 1}</span>
                    {employeeItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setEmployeeItems(employeeItems.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                    <input
                      type="text"
                      placeholder="Full Name *"
                      required
                      value={item.name}
                      onChange={(e) => {
                        const copy = [...employeeItems];
                        copy[idx].name = e.target.value;
                        setEmployeeItems(copy);
                      }}
                      className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-blue-600"
                    />
                    <input
                      type="email"
                      placeholder="Corporate Email *"
                      required
                      value={item.email}
                      onChange={(e) => {
                        const copy = [...employeeItems];
                        copy[idx].email = e.target.value;
                        setEmployeeItems(copy);
                      }}
                      className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-blue-600"
                    />
                    <input
                      type="tel"
                      placeholder="Phone / Mobile"
                      value={item.phone}
                      onChange={(e) => {
                        const copy = [...employeeItems];
                        copy[idx].phone = e.target.value;
                        setEmployeeItems(copy);
                      }}
                      className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-blue-600"
                    />
                    <input
                      type="text"
                      placeholder="Department"
                      value={item.department}
                      onChange={(e) => {
                        const copy = [...employeeItems];
                        copy[idx].department = e.target.value;
                        setEmployeeItems(copy);
                      }}
                      className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-blue-600"
                    />
                    <input
                      type="text"
                      placeholder="Designation"
                      value={item.designation}
                      onChange={(e) => {
                        const copy = [...employeeItems];
                        copy[idx].designation = e.target.value;
                        setEmployeeItems(copy);
                      }}
                      className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-blue-600"
                    />
                  </div>
                </div>
              ))}
            </div>

            {employeeError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{employeeError}</span>
              </div>
            )}

            {employeeSuccessMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{employeeSuccessMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submittingEmployees}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              {submittingEmployees ? <span>Submitting...</span> : <span>Submit Employee Request</span>}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: SUBMIT CORPORATE CONCERN */}
      {activeTab === 'concern' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Submit Corporate Concern or Request</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct line to Super Admin for statutory queries, IC advocate appointments, or account support.
            </p>
          </div>

          <form onSubmit={handleSubmitConcern} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Subject / Topic *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Need external legal counsel profile for IC panel"
                  value={concernTitle}
                  onChange={(e) => setConcernTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Priority Level</label>
                <select
                  value={concernPriority}
                  onChange={(e) => setConcernPriority(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-900 font-semibold focus:outline-hidden focus:border-blue-600"
                >
                  <option value="NORMAL">Normal Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="URGENT">Urgent Statutory Review</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Category</label>
              <select
                value={concernCategory}
                onChange={(e) => setConcernCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-900 font-semibold focus:outline-hidden focus:border-blue-600"
              >
                <option value="ENROLLMENT">Employee Roster &amp; Learner Enrollment</option>
                <option value="GRIEVANCE_ASSISTANCE">Internal Committee &amp; Grievance Redressal</option>
                <option value="BILLING">Seat Credits &amp; Plan Invoicing</option>
                <option value="STATUTORY_REPORTING">Annual Section 21 Statutory Report Advice</option>
                <option value="GENERAL">General Operational Query</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Details &amp; Description *</label>
              <textarea
                rows={4}
                required
                placeholder="Explain your operational question, compliance concern, or required action..."
                value={concernDesc}
                onChange={(e) => setConcernDesc(e.target.value)}
                className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-blue-600"
              />
            </div>

            {concernError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{concernError}</span>
              </div>
            )}

            {concernSuccessMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{concernSuccessMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submittingConcern}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              {submittingConcern ? <span>Transmitting...</span> : <span>Send Concern to Super Admin</span>}
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: REQUEST HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Client Service Requests Log</h3>
              <p className="text-xs text-slate-500 mt-0.5">Track CSV rosters and inquiries submitted to Super Admin.</p>
            </div>
            <button
              onClick={fetchCreditsAndRequests}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
              title="Refresh requests"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {requestsHistory.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-xs">No service requests yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Submitted CSVs and concerns will appear here.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Title &amp; Summary</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Admin Response</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {requestsHistory.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                            req.request_type === 'CSV_ROSTER_UPLOAD'
                              ? 'bg-blue-100 text-blue-700'
                              : req.request_type === 'EMPLOYEE_ADDITION'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-teal-100 text-teal-700'
                          }`}
                        >
                          {req.request_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{req.title}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{req.description}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                        {req.created_at ? new Date(req.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                            req.status === 'APPROVED' || req.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : req.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-600">
                        {req.admin_notes || <span className="text-slate-400 italic">Under Review</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {req.file_url && (
                          <a
                            href={req.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold text-xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download CSV</span>
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Razorpay Top-Up Modal */}
      <RazorpayCheckoutModal
        isOpen={isRazorpayModalOpen}
        onClose={() => setIsRazorpayModalOpen(false)}
        companyId={companyId}
        companyName={companyName}
        currentQuota={creditInfo.credits_total}
        usedCredits={creditInfo.credits_used}
        onSuccess={(added) => {
          fetchCreditsAndRequests();
          if (onRefreshData) onRefreshData();
        }}
      />
    </div>
  );
};
