import React from 'react';
import { Sun, Moon, PanelLeft, SquarePen, Settings, ShieldCheck, LogOut, ArrowLeft } from 'lucide-react';
import { PreciousMark } from './PreciousMark.js';

interface HeaderProps {
  currentMode: 'public' | 'admin';
  isAdminAuthenticated: boolean;
  onSwitchMode: (mode: 'public' | 'admin') => void;
  onAdminLogout: () => void;
  onOpenLogin: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onToggleSidebar?: () => void;
  onNewChat?: () => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  isAdminAuthenticated,
  onSwitchMode,
  onAdminLogout,
  onOpenLogin,
  theme,
  onToggleTheme,
  onToggleSidebar,
  onNewChat,
  onOpenSettings,
}) => {
  return (
    <header className="sticky top-0 z-30 h-13 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md transition-colors dark:border-zinc-800/80 dark:bg-zinc-950/90">
      <div className="mx-auto flex h-full items-center justify-between px-3 sm:px-4">
        {/* Left: Sidebar toggle + Brand mark + Name */}
        <div className="flex items-center gap-2 sm:gap-3">
          {currentMode === 'public' && onToggleSidebar && (
            <button
              id="sidebar-toggle-btn"
              type="button"
              onClick={onToggleSidebar}
              aria-label="Toggle navigation sidebar"
              title="Toggle sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md brand-accent-bg">
              <PreciousMark className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Precious AI
            </span>
            {currentMode === 'admin' && (
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                Admin
              </span>
            )}
          </div>
        </div>

        {/* Right: Essential minimalist controls */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {currentMode === 'public' ? (
            <>
              {onNewChat && (
                <button
                  id="header-new-chat-btn"
                  type="button"
                  onClick={onNewChat}
                  aria-label="Start new chat"
                  title="New chat"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors"
                >
                  <SquarePen className="h-4 w-4" />
                </button>
              )}

              <button
                id="theme-switcher-btn"
                type="button"
                onClick={onToggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-zinc-300" />
                ) : (
                  <Moon className="h-4 w-4 text-zinc-600" />
                )}
              </button>

              {onOpenSettings && (
                <button
                  id="settings-btn"
                  type="button"
                  onClick={onOpenSettings}
                  aria-label="Open settings"
                  title="Settings"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => onSwitchMode('public')}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Exit to Chat</span>
              </button>
              <button
                onClick={onAdminLogout}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-rose-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-rose-400 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
