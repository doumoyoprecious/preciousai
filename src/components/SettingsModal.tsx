import React from 'react';
import { X, Sun, Moon, Trash2, Sparkles } from 'lucide-react';
import { PreciousMark } from './PreciousMark.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onClearHistory: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onToggleTheme,
  onClearHistory,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3.5 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              <PreciousMark className="h-4 w-4" />
            </div>
            <div>
              <h3 id="settings-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Settings
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Precious AI Preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Options List */}
        <div className="space-y-4 text-sm">
          {/* Theme Row */}
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">Appearance</span>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Toggle light or dark theme</p>
            </div>
            <button
              onClick={onToggleTheme}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              {theme === 'dark' ? (
                <>
                  <Moon className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Dark</span>
                </>
              ) : (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-500" />
                  <span>Light</span>
                </>
              )}
            </button>
          </div>

          {/* Chat History */}
          <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/80 pt-3.5">
            <div>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">Chat History</span>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Clear stored conversation sessions</p>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Clear all conversation history?')) {
                  onClearHistory();
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100/70 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-900/40 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear all</span>
            </button>
          </div>

          {/* About Section */}
          <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-3.5 text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              <span>About Precious AI</span>
            </div>
            <p className="leading-relaxed">
              Ground-truth personal AI representing Precious Doumoyo, specializing in AI training, data analytics, prompt engineering, and Web3 development.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-zinc-100 dark:border-zinc-800/80 pt-3">
          <button
            onClick={onClose}
            className="rounded-lg bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
