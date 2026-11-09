'use client';

import React, { useState } from 'react';
import { Palette, UploadCloud, CheckCircle2, AlertCircle, Sparkles, Building, Eye, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { applyTheme } from '@/lib/brand';
import { CompanyLogo } from '@/components/brand/CompanyLogo';

interface BrandingCustomizerViewProps {
  company: any;
  onRefresh: () => void;
}

const PRESET_PALETTES = [
  { name: 'Corporate Deep Navy', primary: '#142D50', secondary: '#2A62FF', accent: '#F2B632', sidebar: '#0B192E' },
  { name: 'Emerald Precision', primary: '#065F46', secondary: '#10B981', accent: '#F59E0B', sidebar: '#064E3B' },
  { name: 'Royal Violet Tech', primary: '#4C1D95', secondary: '#7C3AED', accent: '#EC4899', sidebar: '#2E1065' },
  { name: 'Midnight Charcoal', primary: '#0F172A', secondary: '#3B82F6', accent: '#06B6D4', sidebar: '#020617' },
  { name: 'Modern Crimson', primary: '#881337', secondary: '#E11D48', accent: '#F59E0B', sidebar: '#4C0519' },
];

export const BrandingCustomizerView: React.FC<BrandingCustomizerViewProps> = ({
  company,
  onRefresh,
}) => {
  const [primaryColor, setPrimaryColor] = useState(company?.primary_color || '#2A62FF');
  const [secondaryColor, setSecondaryColor] = useState(company?.secondary_color || '#1D4ED8');
  const [accentColor, setAccentColor] = useState(company?.accent_color || '#F59E0B');
  const [sidebarColor, setSidebarColor] = useState(company?.sidebar_color || '#061122');
  const [welcomeMessage, setWelcomeMessage] = useState(
    company?.welcome_message || `Welcome to ${company?.name || 'Company'} PoSH Portal`
  );

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(company?.logo_url || null);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setError('Logo file size must not exceed 5MB.');
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleApplyPreset = (preset: typeof PRESET_PALETTES[0]) => {
    setPrimaryColor(preset.primary);
    setSecondaryColor(preset.secondary);
    setAccentColor(preset.accent);
    setSidebarColor(preset.sidebar);
    applyTheme({
      primary_color: preset.primary,
      secondary_color: preset.secondary,
      accent_color: preset.accent,
      sidebar_color: preset.sidebar,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Upload logo if selected
      let uploadedLogoUrl = company?.logo_url;
      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);
        const uploadRes = await apiClient.post('/company/branding/logo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedLogoUrl = uploadRes.data.logo_url;
      }

      // 2. Update branding colors and text
      await apiClient.put('/company/branding', {
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
        sidebar_color: sidebarColor,
        welcome_message: welcomeMessage,
        logo_url: uploadedLogoUrl,
      });

      // 3. Immediately apply to DOM
      applyTheme({
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
        sidebar_color: sidebarColor,
      });

      setSuccess(true);
      onRefresh();
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update company branding.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#0A192F] tracking-tight">
              Dynamic Company Branding & White-Label Customization
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Personalize your corporate PoSH portal with custom logos, corporate theme colors, and custom greetings.
            </p>
          </div>
        </div>

        {success && (
          <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Company branding successfully saved and applied across your portal in real time!</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Logo & Colors */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
            {/* Logo Upload Section */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Corporate Brand Logo
              </label>
              <div className="flex items-center gap-5 p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                <CompanyLogo
                  name={company?.name}
                  slug={company?.slug}
                  logoUrl={logoPreview}
                  primaryColor={primaryColor}
                  size="xl"
                />
                <div className="flex-1">
                  <div className="text-xs font-bold text-[#0A192F] mb-1">Upload New Logo (PNG, JPG, SVG, WebP)</div>
                  <p className="text-[11px] text-slate-500 mb-2 font-medium">
                    Recommended dimensions: 300x80px or square transparent asset. Max 5MB.
                  </p>
                  <label className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer shadow-sm transition-all">
                    <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                    <span>Choose File</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                  {logoFile && (
                    <span className="ml-2 text-xs text-emerald-600 font-semibold">
                      Selected: {logoFile.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Color Palette Picker */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Corporate Color Scheme
                </label>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Hex Color Tokens</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Primary Color</label>
                  <div className="flex items-center gap-2 border border-slate-200 rounded-xl p-2 bg-slate-50">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-full text-xs font-mono font-bold text-slate-800 bg-transparent outline-none uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Secondary Color</label>
                  <div className="flex items-center gap-2 border border-slate-200 rounded-xl p-2 bg-slate-50">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-full text-xs font-mono font-bold text-slate-800 bg-transparent outline-none uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Accent Highlight</label>
                  <div className="flex items-center gap-2 border border-slate-200 rounded-xl p-2 bg-slate-50">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-full text-xs font-mono font-bold text-slate-800 bg-transparent outline-none uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Sidebar Theme</label>
                  <div className="flex items-center gap-2 border border-slate-200 rounded-xl p-2 bg-slate-50">
                    <input
                      type="color"
                      value={sidebarColor}
                      onChange={(e) => setSidebarColor(e.target.value)}
                      className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={sidebarColor}
                      onChange={(e) => setSidebarColor(e.target.value)}
                      className="w-full text-xs font-mono font-bold text-slate-800 bg-transparent outline-none uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Preset Color Themes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Quick Industry Palettes
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PRESET_PALETTES.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-white text-left transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="text-[11px] font-bold text-slate-800 group-hover:text-blue-600">
                        {preset.name}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.primary }} />
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.secondary }} />
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.accent }} />
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.sidebar }} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Welcome Message */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Portal Welcome Banner Greeting
              </label>
              <input
                type="text"
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Welcome message displayed to employees and administrators"
              />
            </div>

            {/* Submit */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
                style={{ backgroundColor: primaryColor }}
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Committing Brand Assets...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Save & Deploy Company Branding</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Live Interactive Brand Preview */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              <Eye className="w-4 h-4 text-blue-600" />
              <span>Live Portal Appearance Preview</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-4 font-medium">
              This card simulates how your sidebar, headers, and UI components dynamically render for your employees.
            </p>

            {/* Mock Dashboard Card */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm text-xs bg-slate-50">
              {/* Mock Header */}
              <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="h-6 object-contain" />
                  ) : (
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center font-black text-white text-[10px]"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {company?.name ? company.name.charAt(0) : 'C'}
                    </div>
                  )}
                  <span className="font-black text-[#0A192F] text-xs truncate max-w-[120px]">
                    {company?.name || 'Your Company'}
                  </span>
                </div>
                <span
                  className="px-2 py-0.5 rounded-full text-[9px] font-bold text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  POSH 2026
                </span>
              </div>

              {/* Mock Sidebar + Content Area */}
              <div className="flex h-36">
                <div
                  className="w-20 p-2 text-white flex flex-col justify-between"
                  style={{ backgroundColor: sidebarColor }}
                >
                  <div className="space-y-1">
                    <div
                      className="px-1.5 py-1 rounded text-[9px] font-bold text-white truncate"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Dashboard
                    </div>
                    <div className="px-1.5 py-1 text-[9px] text-slate-300 truncate">Registry</div>
                    <div className="px-1.5 py-1 text-[9px] text-slate-300 truncate">Filings</div>
                  </div>
                  <div className="text-[8px] text-slate-400 font-bold uppercase truncate">
                    {company?.name ? company.name.slice(0, 10) : 'Tenant'}
                  </div>
                </div>

                <div className="flex-1 p-3 space-y-2 overflow-hidden bg-slate-50">
                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <div className="text-[9px] font-bold text-slate-500 uppercase">Banner Message</div>
                    <div className="text-[10px] font-bold text-slate-800 truncate">{welcomeMessage}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="p-1.5 rounded-lg bg-white border border-slate-200">
                      <div className="text-[8px] text-slate-400 font-semibold uppercase">Trained</div>
                      <div className="text-xs font-black mono-numeric" style={{ color: primaryColor }}>
                        84.0%
                      </div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white border border-slate-200">
                      <div className="text-[8px] text-slate-400 font-semibold uppercase">Certificates</div>
                      <div className="text-xs font-black mono-numeric" style={{ color: secondaryColor }}>
                        1,020
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

