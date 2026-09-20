import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Sliders,
  Sparkles,
  Database,
  Lock,
  KeyRound,
  Check,
  Copy,
  Save,
  AlertTriangle,
  User,
  Mail,
  Shield,
  Eye,
  EyeOff,
  Upload,
  RotateCcw,
  Palette,
} from 'lucide-react';
import { useBranding } from '../../context/BrandingContext.js';
import type { AISettings } from '../../types.js';

interface AdminSettingsProps {
  adminToken: string;
}

type SettingsSection = 'general' | 'branding' | 'ai' | 'knowledge' | 'security' | 'account';

export const AdminSettings: React.FC<AdminSettingsProps> = ({ adminToken }) => {
  const [section, setSection] = useState<SettingsSection>('general');
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Branding state
  const branding = useBranding();
  const [primaryColorInput, setPrimaryColorInput] = useState<string>(branding.primaryColor);
  const [colorError, setColorError] = useState<string | null>(null);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingSuccess, setBrandingSuccess] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [faviconError, setFaviconError] = useState<string | null>(null);
  const [faviconSuccess, setFaviconSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize primary color input when branding data loads
  useEffect(() => {
    if (branding.primaryColor) {
      setPrimaryColorInput(branding.primaryColor);
    }
  }, [branding.primaryColor]);

  // Admin Account state
  const [adminProfile, setAdminProfile] = useState<{
    id?: string;
    name: string;
    email: string;
    role?: string;
  }>({ name: '', email: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Supabase state
  const [supabaseSQL, setSupabaseSQL] = useState('');
  const [copiedSQL, setCopiedSQL] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [settingsRes, sqlRes, statusRes, profileRes] = await Promise.all([
        fetch('/api/admin/settings', {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
        fetch('/api/admin/supabase-sql', {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
        fetch('/api/admin/supabase-status', {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
        fetch('/api/admin/profile', {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      ]);

      if (settingsRes.ok) setSettings(await settingsRes.json());
      if (sqlRes.ok) setSupabaseSQL(await sqlRes.text());
      if (statusRes.ok) setSupabaseStatus(await statusRes.json());
      if (profileRes.ok) {
        const prof = await profileRes.json();
        setAdminProfile({ name: prof.name, email: prof.email, id: prof.id, role: prof.role });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [adminToken]);

  const handleSaveAISettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setSavingProfile(true);

    try {
      const res = await fetch('/api/admin/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: adminProfile.name,
          email: adminProfile.email,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      setProfileSuccess('Administrator profile updated successfully');
      setTimeout(() => setProfileSuccess(null), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Error updating profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters in length');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');

      setPasswordSuccess('Password successfully updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err: any) {
      setPasswordError(err.message || 'Error changing password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(supabaseSQL);
    setCopiedSQL(true);
    setTimeout(() => setCopiedSQL(false), 3000);
  };

  // Branding handlers
  const handleColorChange = (newColor: string) => {
    setPrimaryColorInput(newColor);
    if (/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(newColor)) {
      setColorError(null);
      branding.applyLiveColorPreview(newColor);
    } else {
      setColorError('Please enter a valid HEX color code (e.g. #18181B or #6366F1)');
    }
  };

  const handleSaveBranding = async () => {
    if (!/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(primaryColorInput.trim())) {
      setColorError('Invalid HEX color format');
      return;
    }
    setBrandingSaving(true);
    setColorError(null);
    try {
      const res = await fetch('/api/admin/branding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ primary_color: primaryColorInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        branding.commitBranding(data.primary_color);
        setBrandingSuccess(true);
        setTimeout(() => setBrandingSuccess(false), 3000);
      } else {
        const err = await res.json();
        setColorError(err.error || 'Failed to update branding');
      }
    } catch (err: any) {
      setColorError(err.message || 'Error saving branding');
    } finally {
      setBrandingSaving(false);
    }
  };

  const handleResetBrandingToDefault = async () => {
    if (!confirm('Reset branding (primary color and favicon) to default?')) return;
    setBrandingSaving(true);
    setColorError(null);
    try {
      const res = await fetch('/api/admin/branding/reset', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setPrimaryColorInput('#18181b');
        branding.commitBranding('#18181b', data.favicon_url, false);
        setBrandingSuccess(true);
        setFaviconSuccess('Branding reset to default successfully');
        setTimeout(() => {
          setBrandingSuccess(false);
          setFaviconSuccess(null);
        }, 3000);
      }
    } catch (err: any) {
      setColorError(err.message || 'Failed to reset branding');
    } finally {
      setBrandingSaving(false);
    }
  };

  const handleFaviconFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFaviconError(null);
    setFaviconSuccess(null);

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setFaviconError('Favicon file must be less than 2MB');
      return;
    }

    // Validate type
    const validTypes = ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/svg+xml'];
    if (
      !validTypes.includes(file.type) &&
      !file.name.endsWith('.ico') &&
      !file.name.endsWith('.png') &&
      !file.name.endsWith('.svg')
    ) {
      setFaviconError('Unsupported format. Please upload a PNG, ICO, or SVG file.');
      return;
    }

    setFaviconUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          const mimeType =
            file.type || (file.name.endsWith('.ico') ? 'image/x-icon' : 'image/png');

          const res = await fetch('/api/admin/branding/favicon', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({
              data_base64: base64Data,
              file_name: file.name,
              mime_type: mimeType,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            branding.updateFaviconUrl(data.favicon_url, data.favicon_version, true);
            setFaviconSuccess('Favicon updated and applied to browser tab!');
            setTimeout(() => setFaviconSuccess(null), 3500);
          } else {
            const err = await res.json();
            setFaviconError(err.error || 'Failed to upload favicon');
          }
        } catch (err: any) {
          setFaviconError(err.message || 'Error processing favicon upload');
        } finally {
          setFaviconUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setFaviconError(err.message || 'Failed to read file');
      setFaviconUploading(false);
    }
  };

  const handleResetFavicon = async () => {
    setFaviconUploading(true);
    setFaviconError(null);
    try {
      const res = await fetch('/api/admin/branding/favicon-reset', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        branding.updateFaviconUrl(data.favicon_url, data.favicon_version, false);
        setFaviconSuccess('Favicon reset to default');
        setTimeout(() => setFaviconSuccess(null), 3000);
      }
    } catch (err: any) {
      setFaviconError(err.message || 'Failed to reset favicon');
    } finally {
      setFaviconUploading(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-zinc-400">
        Loading settings...
      </div>
    );
  }

  const sections: Array<{ id: SettingsSection; label: string }> = [
    { id: 'general', label: 'General' },
    { id: 'branding', label: 'Branding & Appearance' },
    { id: 'ai', label: 'AI Engine' },
    { id: 'knowledge', label: 'Knowledge' },
    { id: 'security', label: 'Security' },
    { id: 'account', label: 'Admin Account' },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 sm:p-8">
      {/* Title */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Settings & Credentials
        </h1>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Configure AI boundaries, visitor availability, and administrator account security.
        </p>
      </div>

      {/* Navigation Pills */}
      <div className="flex flex-wrap gap-1 border-b border-zinc-200/80 pb-2 dark:border-zinc-800">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              section === s.id
                ? 'brand-nav-selected shadow-2xs'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* GENERAL SETTINGS */}
      {section === 'general' && (
        <form onSubmit={handleSaveAISettings} className="space-y-5">
          <div className="rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              General Identity
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  AI Assistant Name
                </label>
                <input
                  type="text"
                  required
                  value={settings.ai_name}
                  onChange={(e) => setSettings({ ...settings, ai_name: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Assistant Subtitle / Tagline
                </label>
                <input
                  type="text"
                  required
                  value={settings.assistant_title}
                  onChange={(e) => setSettings({ ...settings, assistant_title: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Assistant Description
              </label>
              <textarea
                rows={2}
                value={settings.description}
                onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.public_chat_enabled}
                  onChange={(e) =>
                    setSettings({ ...settings, public_chat_enabled: e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-0 dark:border-zinc-700 dark:bg-zinc-800"
                />
                <div>
                  <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                    Public Visitor Chat Enabled
                  </span>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Allow visitors to converse with Precious AI in public mode. If disabled, a clean offline notice is displayed.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between">
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" /> Saved successfully
              </span>
            )}
            <button
              type="submit"
              disabled={savingSettings}
              className="ml-auto brand-btn-primary rounded-lg px-4 py-2 text-xs font-medium shadow-2xs disabled:opacity-50"
            >
              {savingSettings ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {/* BRANDING & APPEARANCE SETTINGS */}
      {section === 'branding' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 space-y-5">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Branding & Appearance
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Customize the Precious AI brand icon, primary accent color, and interface appearance.
              </p>
            </div>

            {/* 1. Brand Icon */}
            <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800/80 space-y-3">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                Brand Icon
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Current Favicon Preview */}
                <div className="flex items-center gap-3">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-200/90 bg-zinc-50 p-2 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800">
                    <img
                      key={branding.faviconUrl}
                      src={branding.faviconUrl}
                      alt="Current Favicon"
                      className="h-8 w-8 object-contain rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/api/favicon';
                      }}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <span>Current Favicon</span>
                      {branding.hasCustomFavicon ? (
                        <span className="rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50 px-1.5 py-0.5 text-[10px]">
                          Custom Upload
                        </span>
                      ) : (
                        <span className="rounded-md bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 text-[10px]">
                          Default Icon
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Supports PNG, ICO, and safe SVG (max 2MB).
                    </p>
                  </div>
                </div>

                {/* Upload & Reset Controls */}
                <div className="flex items-center gap-2 sm:ml-auto">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".png,.ico,.svg,image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml"
                    onChange={handleFaviconFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={faviconUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/90 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-colors shadow-2xs disabled:opacity-50"
                  >
                    <Upload className="h-3.5 w-3.5 text-zinc-500" />
                    <span>{faviconUploading ? 'Uploading...' : 'Change favicon'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={faviconUploading || !branding.hasCustomFavicon}
                    onClick={handleResetFavicon}
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-200/80 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors disabled:opacity-40"
                    title="Reset to default Precious AI favicon"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset to default</span>
                  </button>
                </div>
              </div>

              {faviconError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                  {faviconError}
                </div>
              )}

              {faviconSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-2 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  <span>{faviconSuccess}</span>
                </div>
              )}
            </div>

            {/* 2. Theme - Primary Color */}
            <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800/80 space-y-3">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                Theme — Primary Color
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {/* Native Color Picker */}
                <div className="relative flex items-center">
                  <input
                    type="color"
                    id="branding-color-picker"
                    value={primaryColorInput.startsWith('#') ? primaryColorInput : `#${primaryColorInput}`}
                    onChange={(e) => handleColorChange(e.target.value.toUpperCase())}
                    className="h-9 w-10 cursor-pointer rounded-lg border border-zinc-200 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-800"
                    title="Pick primary/accent color"
                  />
                </div>

                {/* HEX text input */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    id="branding-hex-input"
                    value={primaryColorInput}
                    onChange={(e) => handleColorChange(e.target.value.toUpperCase())}
                    maxLength={7}
                    placeholder="#18181B"
                    className="w-28 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-mono text-xs text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <span className="text-[11px] text-zinc-400">Presets:</span>
                  {[
                    { name: 'Default Dark', hex: '#18181B' },
                    { name: 'Indigo', hex: '#6366F1' },
                    { name: 'Emerald', hex: '#059669' },
                    { name: 'Violet', hex: '#7C3AED' },
                    { name: 'Blue', hex: '#2563EB' },
                  ].map((p) => (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => handleColorChange(p.hex)}
                      title={p.name}
                      style={{ backgroundColor: p.hex }}
                      className={`h-5 w-5 rounded-full border border-black/10 transition-transform hover:scale-110 ${
                        primaryColorInput.toUpperCase() === p.hex ? 'ring-2 ring-offset-1 ring-zinc-400' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>

              {colorError && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{colorError}</p>
              )}

              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Applied consistently to primary buttons, links, selected navigation tabs, and focus accents with automated WCAG contrast text.
              </p>
            </div>

            {/* 3. Live Preview */}
            <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                  Preview
                </label>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  Live interaction test
                </span>
              </div>

              <div className="rounded-xl border border-zinc-200/70 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  {/* Sample button */}
                  <button
                    type="button"
                    className="brand-btn-primary inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium shadow-2xs"
                  >
                    <span>Sample button</span>
                  </button>

                  {/* Sample link */}
                  <a
                    href="#preview"
                    onClick={(e) => e.preventDefault()}
                    className="brand-accent-text font-medium text-xs hover:underline cursor-pointer"
                  >
                    Sample link
                  </a>

                  {/* Selected navigation item */}
                  <div className="brand-nav-selected inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium shadow-2xs">
                    <Sliders className="h-3.5 w-3.5" />
                    <span>Selected navigation item</span>
                  </div>

                  {/* Accent icon */}
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg brand-accent-bg shadow-2xs">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Save and Reset */}
            <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800/80 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetBrandingToDefault}
                disabled={brandingSaving}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/80 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5 text-zinc-500" />
                <span>Reset to default</span>
              </button>

              <div className="flex items-center gap-2">
                {brandingSuccess && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5" /> Branding saved
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleSaveBranding()}
                  disabled={brandingSaving}
                  className="brand-btn-primary rounded-lg px-4 py-2 text-xs font-medium shadow-2xs disabled:opacity-50"
                >
                  {brandingSaving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>

          {/* Response Style & AI Tone (Preserved cleanly) */}
          <form onSubmit={handleSaveAISettings} className="space-y-4">
            <div className="rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Response Delivery & Persona
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Communication Tone
                  </label>
                  <select
                    value={settings.tone}
                    onChange={(e) =>
                      setSettings({ ...settings, tone: e.target.value as AISettings['tone'] })
                    }
                    className="w-full rounded-lg border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="professional">Professional & Grounded</option>
                    <option value="friendly">Friendly & Approachable</option>
                    <option value="academic">Academic & Analytical</option>
                    <option value="executive">Executive & Direct</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Response Length
                  </label>
                  <select
                    value={settings.response_length}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        response_length: e.target.value as AISettings['response_length'],
                      })
                    }
                    className="w-full rounded-lg border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="concise">Concise & Direct (1-2 paragraphs)</option>
                    <option value="balanced">Balanced (Structured with key details)</option>
                    <option value="detailed">Comprehensive (Deep technical breakdowns)</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1 text-xs">
                  Subtle Emoji Accents
                </label>
                <select
                  value={settings.emoji_usage}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      emoji_usage: e.target.value as AISettings['emoji_usage'],
                    })
                  }
                  className="w-full rounded-lg border border-zinc-200 bg-white p-2 text-xs text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="none">None (Purely professional plain text)</option>
                  <option value="minimal">Minimal (Rare, subtle contextual emojis)</option>
                  <option value="moderate">Moderate (Friendly conversational tone)</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-2">
                {saveSuccess && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5" /> Saved successfully
                  </span>
                )}
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="ml-auto brand-btn-primary rounded-lg px-4 py-2 text-xs font-medium shadow-2xs disabled:opacity-50"
                >
                  {savingSettings ? 'Saving...' : 'Save Response Preferences'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* AI ENGINE SETTINGS */}
      {section === 'ai' && (
        <form onSubmit={handleSaveAISettings} className="space-y-5">
          <div className="rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              AI Generation & Retrieval Limits
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Max Retrieval Chunks (Top-K)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={settings.retrieval_limit}
                  onChange={(e) =>
                    setSettings({ ...settings, retrieval_limit: parseInt(e.target.value) || 4 })
                  }
                  className="w-full rounded-lg border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Temperature ({settings.temperature})
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.temperature}
                  onChange={(e) =>
                    setSettings({ ...settings, temperature: parseFloat(e.target.value) })
                  }
                  className="w-full mt-2 accent-zinc-900 dark:accent-zinc-100"
                />
                <span className="text-[10px] text-zinc-400">Lower = strictly factual</span>
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Fallback Response (When no context matches)
              </label>
              <textarea
                rows={2}
                value={settings.unknown_answer_fallback}
                onChange={(e) => setSettings({ ...settings, unknown_answer_fallback: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" /> Saved successfully
              </span>
            )}
            <button
              type="submit"
              disabled={savingSettings}
              className="ml-auto rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {savingSettings ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {/* KNOWLEDGE SETTINGS */}
      {section === 'knowledge' && (
        <form onSubmit={handleSaveAISettings} className="space-y-5">
          <div className="rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              RAG & Attribution
            </h2>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enable_rag}
                  onChange={(e) => setSettings({ ...settings, enable_rag: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-0 dark:border-zinc-700 dark:bg-zinc-800"
                />
                <div>
                  <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                    Enable RAG (Retrieval-Augmented Generation)
                  </span>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Retrieves relevant knowledge base facts and documents to ground the AI responses.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
                <input
                  type="checkbox"
                  checked={settings.enable_training_examples}
                  onChange={(e) =>
                    setSettings({ ...settings, enable_training_examples: e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-0 dark:border-zinc-700 dark:bg-zinc-800"
                />
                <div>
                  <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                    Enable Training Examples & Few-Shot Alignment
                  </span>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Grounds responses with curated Q&A pairs and correction pairs.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between">
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" /> Saved successfully
              </span>
            )}
            <button
              type="submit"
              disabled={savingSettings}
              className="ml-auto rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {savingSettings ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {/* SECURITY SETTINGS */}
      {section === 'security' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800/80">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Supabase & PostgreSQL Integration
                </h2>
                <p className="mt-0.5 text-[11px] text-zinc-400">
                  Enterprise pgvector schema ready for external deployment.
                </p>
              </div>

              <button
                onClick={handleCopySQL}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                {copiedSQL ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Supabase SQL</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Environment Credentials</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {supabaseStatus?.configured ? 'Configured' : 'Local In-Memory DB Mode'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Auth Token Verification</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  Active (Admin Bearer / Header validation)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN ACCOUNT & CREDENTIALS */}
      {section === 'account' && (
        <div className="space-y-6">
          {/* Profile Details Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
              <div className="border-b border-zinc-100 pb-3 dark:border-zinc-800/80">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Administrator Profile
                </h2>
                <p className="mt-0.5 text-[11px] text-zinc-400">
                  Manage the primary administrator name and email credentials.
                </p>
              </div>

              {profileError && (
                <div className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60">
                  {profileError}
                </div>
              )}

              {profileSuccess && (
                <div className="rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {profileSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Administrator Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                    <input
                      type="text"
                      required
                      value={adminProfile.name}
                      onChange={(e) =>
                        setAdminProfile({ ...adminProfile, name: e.target.value })
                      }
                      className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-8 pr-3 text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Administrator Email / Username
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                    <input
                      type="email"
                      required
                      value={adminProfile.email}
                      onChange={(e) =>
                        setAdminProfile({ ...adminProfile, email: e.target.value })
                      }
                      className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-8 pr-3 text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  {savingProfile ? 'Updating...' : 'Update Profile'}
                </button>
              </div>
            </div>
          </form>

          {/* Password Management Form */}
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
              <div className="border-b border-zinc-100 pb-3 dark:border-zinc-800/80">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Change Administrator Password
                </h2>
                <p className="mt-0.5 text-[11px] text-zinc-400">
                  Ensure strong credentials. Passwords are securely hashed with PBKDF2 (SHA-512) and never stored in plaintext.
                </p>
              </div>

              {passwordError && (
                <div className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {passwordSuccess}
                </div>
              )}

              <div className="space-y-3.5 text-xs">
                {/* Current Password */}
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Current Password
                  </label>
                  <div className="relative max-w-md">
                    <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      required
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-8 pr-9 text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      {showCurrentPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* New Password & Confirmation */}
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 max-w-2xl">
                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      New Password (min 8 characters)
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        required
                        minLength={8}
                        placeholder="New strong password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-8 pr-9 text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      >
                        {showNewPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                      <input
                        type="password"
                        required
                        minLength={8}
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-8 pr-3 text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                <button
                  type="submit"
                  disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  {changingPassword ? 'Updating Password...' : 'Change Password'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
