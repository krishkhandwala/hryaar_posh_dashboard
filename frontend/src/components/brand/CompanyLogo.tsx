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

function resolveCuratedLogoPath(normalizedKey: string): string | null {
  if (normalizedKey.includes('nimbus') || normalizedKey.includes('acme')) {
    return '/logos/nimbus.svg';
  }
  if (normalizedKey.includes('crestline') || normalizedKey.includes('beta')) {
    return '/logos/crestline.svg';
  }
  if (normalizedKey.includes('synergia') || normalizedKey.includes('nexus') || normalizedKey.includes('bio')) {
    return '/logos/synergia.svg';
  }
  if (normalizedKey.includes('lexvantage') || normalizedKey.includes('talentpro')) {
    return '/logos/lexvantage.svg';
  }
  if (normalizedKey.includes('meridian') || normalizedKey.includes('apex')) {
    return '/logos/meridian.svg';
  }
  if (
    normalizedKey.includes('hryaar') ||
    normalizedKey.includes('master') ||
    normalizedKey.includes('creator') ||
    normalizedKey.includes('superadmin')
  ) {
    return '/logos/hryaar.svg';
  }
  return null;
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  name = 'Company',
  slug = '',
  logoUrl,
  primaryColor = '#2A62FF',
  size = 'md',
  className = '',
  showBorder = true,
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  const normalizedKey = `${slug} ${name}`.toLowerCase().replace(/[^a-z0-9]/g, '');
  const sizeClass = sizeMap[size] || sizeMap.md;
  const curatedLogo = resolveCuratedLogoPath(normalizedKey);

  // Prefer valid custom-uploaded image or curated internet SVG emblem
  const candidateSrc =
    logoUrl && !imageFailed
      ? logoUrl.startsWith('http') || logoUrl.startsWith('/')
        ? logoUrl
        : `/${logoUrl}`
      : curatedLogo;

  if (candidateSrc) {
    return (
      <div
        className={`${sizeClass} rounded-xl overflow-hidden flex items-center justify-center shrink-0 bg-white ${
          showBorder ? 'border border-slate-200/90 shadow-xs' : ''
        } ${className}`}
        title={name}
      >
        <img
          src={candidateSrc}
          alt={`${name} Logo`}
          onError={() => {
            if (!imageFailed && candidateSrc !== curatedLogo) {
              setImageFailed(true);
            }
          }}
          className="w-full h-full object-contain p-1.5"
        />
      </div>
    );
  }

  // Dynamic fallback initials shield for newly onboarded custom tenants
  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || 'CO';

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
