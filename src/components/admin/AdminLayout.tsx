import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  BookOpen,
  BarChart3,
  Settings,
  ArrowLeft,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import { PreciousMark } from '../PreciousMark.js';
import { AdminOverview } from './AdminOverview.js';
import { AdminUsers } from './AdminUsers.js';
import { AdminConversations } from './AdminConversations.js';
import { AdminKnowledgeHub } from './AdminKnowledgeHub.js';
import { AdminAnalytics } from './AdminAnalytics.js';
import { AdminSettings } from './AdminSettings.js';

interface AdminLayoutProps {
  adminToken: string;
  onExitAdmin: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onLogout?: () => void;
}

export type AdminTab =
  | 'overview'
  | 'users'
  | 'conversations'
  | 'knowledge'
  | 'analytics'
  | 'settings';

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  adminToken,
  onExitAdmin,
  theme,
  onToggleTheme,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  const navTabs: Array<{
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'conversations', label: 'Conversations', icon: MessageSquare },
    { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50/50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 transition-colors">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 h-14">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg brand-accent-bg shadow-2xs">
              <PreciousMark className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Precious AI
              </span>
              <span className="rounded-md border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
                Admin
              </span>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1">
            {navTabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? 'brand-nav-selected shadow-2xs'
                      : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
                title="Toggle appearance"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}

            <button
              onClick={onExitAdmin}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/80 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Exit to Chat</span>
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition-colors"
                title="Sign out administrator"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Horizontal Sub-Navbar */}
        <div className="flex md:hidden overflow-x-auto border-t border-zinc-100 dark:border-zinc-800/80 px-2 py-1.5 scrollbar-none gap-1">
          {navTabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'brand-nav-selected shadow-2xs'
                    : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-12">
        {activeTab === 'overview' && (
          <AdminOverview
            adminToken={adminToken}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}
        {activeTab === 'users' && <AdminUsers adminToken={adminToken} />}
        {activeTab === 'conversations' && <AdminConversations adminToken={adminToken} />}
        {activeTab === 'knowledge' && <AdminKnowledgeHub adminToken={adminToken} />}
        {activeTab === 'analytics' && <AdminAnalytics adminToken={adminToken} />}
        {activeTab === 'settings' && <AdminSettings adminToken={adminToken} />}
      </main>
    </div>
  );
};
