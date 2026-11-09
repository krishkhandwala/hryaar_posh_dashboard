'use client';

import React, { useState } from 'react';

export interface CompanyLogoProps {
  name?: string;
  slug?: string;
  logoUrl?: string | null;
  primaryColor?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBorder?: boolean;
  variant?: 'dark' | 'light';
}

const sizeMap = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

const iconSizeMap = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4.5 h-4.5',
  md: 'w-6 h-6',
  lg: 'w-7 h-7',
  xl: 'w-9 h-9',
};

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  name = 'Company',
  slug = '',
  logoUrl,
  primaryColor = '#2A62FF',
  size = 'md',
  className = '',
  showBorder = true,
  variant = 'light',
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  // Normalize slug / name to find matching preset
  const normalizedKey = (slug || name).toLowerCase().replace(/[^a-z0-9]/g, '');

  const sizeClass = sizeMap[size] || sizeMap.md;
  const iconClass = iconSizeMap[size] || iconSizeMap.md;

  // Render authentic uploaded image if present and hasn't errored
  if (logoUrl && !imageFailed) {
    // If relative path without slash or starting with /static, format cleanly
    const safeSrc = logoUrl.startsWith('http') || logoUrl.startsWith('/') ? logoUrl : `/${logoUrl}`;
    return (
      <div
        className={`${sizeClass} rounded-xl overflow-hidden flex items-center justify-center shrink-0 bg-white ${
          showBorder ? 'border border-slate-200/90 shadow-xs' : ''
        } ${className}`}
      >
        <img
          src={safeSrc}
          alt={`${name} Logo`}
          onError={() => setImageFailed(true)}
          className="w-full h-full object-contain p-1 rounded-xl"
        />
      </div>
    );
  }

  // Bespoke SVG Brand Emblems for Each Company
  // 1. Acme Corporation (Cloud Systems & Enterprise Tech)
  if (normalizedKey.includes('acme')) {
    return (
      <div
        className={`${sizeClass} rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 text-white shadow-xs ${
          showBorder ? 'border border-blue-400/40' : ''
        } ${className}`}
        title={`${name} — Enterprise Cloud Systems`}
      >
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Cloud Nodes & Tech Grid */}
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" fill="rgba(255,255,255,0.2)" />
          <circle cx="12" cy="13" r="2" fill="white" stroke="none" />
          <path d="M12 9v2M12 15v2M9 13H7M17 13h-2" stroke="white" strokeWidth="1.8" />
        </svg>
      </div>
    );
  }

  // 2. Beta Industries (Precision Automotive & Manufacturing)
  if (normalizedKey.includes('beta')) {
    return (
      <div
        className={`${sizeClass} rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-950 text-white shadow-xs ${
          showBorder ? 'border border-emerald-400/40' : ''
        } ${className}`}
        title={`${name} — Precision Automotive & Manufacturing`}
      >
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Precision Hexagon Gear Core */}
          <path
            d="m12 2 8 4.5v9L12 20l-8-4.5v-9L12 2Z"
            fill="rgba(16,185,129,0.25)"
            stroke="white"
            strokeWidth="1.7"
          />
          <circle cx="12" cy="11" r="3" fill="#F59E0B" stroke="white" strokeWidth="1.5" />
          <path d="M12 5v2M12 15v2M6.5 8l1.7 1M15.8 13l1.7 1M6.5 14l1.7-1M15.8 9l1.7-1" stroke="white" strokeWidth="1.5" />
        </svg>
      </div>
    );
  }

  // 3. Nexus BioHealth / BioSciences (Therapeutics & Clinical Biotech)
  if (normalizedKey.includes('nexus') || normalizedKey.includes('bio')) {
    return (
      <div
        className={`${sizeClass} rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-purple-700 via-violet-800 to-indigo-950 text-white shadow-xs ${
          showBorder ? 'border border-purple-400/40' : ''
        } ${className}`}
        title={`${name} — Clinical Therapeutics & BioSciences`}
      >
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Double Helix / Life Science Pulse */}
          <path d="m4 6 16 12M20 6 4 18" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
          <circle cx="4" cy="6" r="2.5" fill="#EC4899" stroke="white" strokeWidth="1.2" />
          <circle cx="20" cy="18" r="2.5" fill="#EC4899" stroke="white" strokeWidth="1.2" />
          <circle cx="20" cy="6" r="2.5" fill="#A78BFA" stroke="white" strokeWidth="1.2" />
          <circle cx="4" cy="18" r="2.5" fill="#A78BFA" stroke="white" strokeWidth="1.2" />
          <circle cx="12" cy="12" r="3" fill="white" stroke="#7C3AED" strokeWidth="1.5" />
        </svg>
      </div>
    );
  }

  // 4. TalentPro HR Advisory (Partner Middleman A: Legal & Compliance Shield)
  if (normalizedKey.includes('talentpro')) {
    return (
      <div
        className={`${sizeClass} rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-teal-700 via-emerald-800 to-teal-950 text-white shadow-xs ${
          showBorder ? 'border border-teal-400/40' : ''
        } ${className}`}
        title={`${name} — Statutory Legal & HR Advisory`}
      >
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Scales of Justice & Advisory Shield */}
          <path d="M12 2v20M5 7l7-3 7 3M4 14l2-7 2 7a2 2 0 0 1-4 0ZM16 14l2-7 2 7a2 2 0 0 1-4 0Z" stroke="white" strokeWidth="1.8" />
          <circle cx="12" cy="4" r="1.5" fill="#F59E0B" stroke="white" strokeWidth="1" />
        </svg>
      </div>
    );
  }

  // 5. Apex Corporate Compliance (Partner Middleman B: High Apex Monolith)
  if (normalizedKey.includes('apex')) {
    return (
      <div
        className={`${sizeClass} rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-amber-600 via-orange-700 to-slate-900 text-white shadow-xs ${
          showBorder ? 'border border-amber-400/40' : ''
        } ${className}`}
        title={`${name} — Enterprise Compliance Partners`}
      >
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Apex Monolith & Peak Shield */}
          <path d="M12 2 2 20h20L12 2Z" fill="rgba(245,158,11,0.3)" stroke="white" strokeWidth="1.8" />
          <path d="M12 7v13M8 15h8" stroke="#F59E0B" strokeWidth="2" />
        </svg>
      </div>
    );
  }

  // 6. Platform Creator (HRYAAR Super Admin Master)
  if (normalizedKey.includes('hryaar') || normalizedKey.includes('master') || normalizedKey.includes('creator') || normalizedKey.includes('superadmin')) {
    return (
      <div
        className={`${sizeClass} rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950 text-white shadow-xs ${
          showBorder ? 'border border-blue-400/50' : ''
        } ${className}`}
        title="HRYAAR — Platform Creator Master Console"
      >
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Sovereign Shield & Diamond Crown */}
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" fill="rgba(59,130,246,0.3)" stroke="white" strokeWidth="1.8" />
          <path d="m9 12 2 2 4-4" stroke="#60A5FA" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  // Dynamic Fallback: Custom Tenant Monogram with Primary Brand Color Shield
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || name.substring(0, 2).toUpperCase() || 'CO';

  return (
    <div
      className={`${sizeClass} rounded-xl flex items-center justify-center font-bold tracking-tight text-white shrink-0 shadow-xs ${
        showBorder ? 'border border-white/20' : ''
      } ${className}`}
      style={{
        background: `linear-gradient(135deg, ${primaryColor} 0%, #061122 100%)`,
      }}
      title={name}
    >
      <span>{initials}</span>
    </div>
  );
};

