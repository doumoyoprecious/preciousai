import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface BrandingState {
  primaryColor: string;
  faviconUrl: string;
  faviconVersion: number;
  hasCustomFavicon: boolean;
  applyLiveColorPreview: (color: string) => void;
  resetLiveColorPreview: () => void;
  commitBranding: (color: string, faviconUrl?: string, hasCustom?: boolean) => void;
  updateFaviconUrl: (url: string, version: number, hasCustom: boolean) => void;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingState | undefined>(undefined);

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function getContrastTextColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#ffffff';
  // Perceived relative luminance
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 165 ? '#09090b' : '#ffffff';
}

function shadeColor(color: string, percent: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent) / 100;
  const r = Math.round((t - rgb.r) * p) + rgb.r;
  const g = Math.round((t - rgb.g) * p) + rgb.g;
  const b = Math.round((t - rgb.b) * p) + rgb.b;
  return `#${(0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function applyBrandTheme(colorHex: string) {
  if (!colorHex || typeof window === 'undefined') return;
  const hex = colorHex.startsWith('#') ? colorHex : `#${colorHex}`;
  const rgb = hexToRgb(hex);
  if (!rgb) return;

  const textColor = getContrastTextColor(hex);
  const hoverColor = shadeColor(hex, textColor === '#ffffff' ? -12 : 12);
  const root = document.documentElement;

  root.style.setProperty('--brand-primary', hex);
  root.style.setProperty('--brand-primary-text', textColor);
  root.style.setProperty('--brand-primary-hover', hoverColor);
  root.style.setProperty('--brand-primary-subtle', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`);
  root.style.setProperty('--brand-primary-ring', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`);
  root.style.setProperty('--brand-primary-border', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`);
}

export function updateDocumentFavicon(url: string) {
  if (!url || typeof document === 'undefined') return;
  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.getElementsByTagName('head')[0].appendChild(link);
  }

  if (url.includes('.ico') || url.includes('image/x-icon')) {
    link.type = 'image/x-icon';
  } else if (url.includes('.png')) {
    link.type = 'image/png';
  } else {
    link.type = 'image/svg+xml';
  }

  link.href = url;
}

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [primaryColor, setPrimaryColor] = useState<string>('#18181b');
  const [persistedColor, setPersistedColor] = useState<string>('#18181b');
  const [faviconUrl, setFaviconUrl] = useState<string>('/api/favicon');
  const [faviconVersion, setFaviconVersion] = useState<number>(1);
  const [hasCustomFavicon, setHasCustomFavicon] = useState<boolean>(false);

  const fetchBranding = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/public');
      if (res.ok) {
        const data = await res.json();
        const col = data.primary_color || '#18181b';
        const fav = data.favicon_url || `/api/favicon?v=${data.favicon_version || 1}`;
        setPrimaryColor(col);
        setPersistedColor(col);
        setFaviconUrl(fav);
        setFaviconVersion(data.favicon_version || 1);
        setHasCustomFavicon(Boolean(data.has_custom_favicon));

        applyBrandTheme(col);
        updateDocumentFavicon(fav);
      }
    } catch (err) {
      console.error('Failed to load branding:', err);
    }
  }, []);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  const applyLiveColorPreview = useCallback((color: string) => {
    setPrimaryColor(color);
    applyBrandTheme(color);
  }, []);

  const resetLiveColorPreview = useCallback(() => {
    setPrimaryColor(persistedColor);
    applyBrandTheme(persistedColor);
  }, [persistedColor]);

  const commitBranding = useCallback((color: string, newFaviconUrl?: string, hasCustom?: boolean) => {
    setPrimaryColor(color);
    setPersistedColor(color);
    applyBrandTheme(color);
    if (newFaviconUrl) {
      setFaviconUrl(newFaviconUrl);
      updateDocumentFavicon(newFaviconUrl);
    }
    if (typeof hasCustom === 'boolean') {
      setHasCustomFavicon(hasCustom);
    }
  }, []);

  const updateFaviconUrl = useCallback((url: string, version: number, hasCustom: boolean) => {
    setFaviconUrl(url);
    setFaviconVersion(version);
    setHasCustomFavicon(hasCustom);
    updateDocumentFavicon(url);
  }, []);

  return (
    <BrandingContext.Provider
      value={{
        primaryColor,
        faviconUrl,
        faviconVersion,
        hasCustomFavicon,
        applyLiveColorPreview,
        resetLiveColorPreview,
        commitBranding,
        updateFaviconUrl,
        refreshBranding: fetchBranding,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = (): BrandingState => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};
