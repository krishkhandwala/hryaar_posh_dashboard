export interface TenantBrand {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  sidebar_color: string;
  company_name: string;
  logo_url?: string | null;
  favicon_url?: string | null;
  welcome_message?: string | null;
}

export const DEFAULT_BRAND: TenantBrand = {
  primary_color: '#2A62FF',
  secondary_color: '#1D4ED8',
  accent_color: '#F59E0B',
  sidebar_color: '#061122',
  company_name: 'HRYAAR Digi-PoSH',
  welcome_message: 'Enterprise Prevention of Sexual Harassment Management',
};

export function applyTheme(brand?: Partial<TenantBrand>) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  const primary = brand?.primary_color || DEFAULT_BRAND.primary_color;
  const secondary = brand?.secondary_color || DEFAULT_BRAND.secondary_color;
  const accent = brand?.accent_color || DEFAULT_BRAND.accent_color;
  const sidebar = brand?.sidebar_color || DEFAULT_BRAND.sidebar_color;

  root.style.setProperty('--brand-primary', primary);
  root.style.setProperty('--brand-secondary', secondary);
  root.style.setProperty('--brand-accent', accent);
  root.style.setProperty('--brand-sidebar', sidebar);
}

