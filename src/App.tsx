/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.js';
import { Sidebar, type ChatSession } from './components/Sidebar.js';
import { PublicChat } from './components/PublicChat.js';
import { AdminLayout } from './components/admin/AdminLayout.js';
import { AdminLoginPage } from './components/admin/AdminLoginPage.js';
import { SettingsModal } from './components/SettingsModal.js';
import { BrandingProvider } from './context/BrandingContext.js';
import type { ChatMessage } from './types.js';

function AppContent() {
  const [currentMode, setCurrentMode] = useState<'public' | 'admin'>('public');
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  // Chat sessions state
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('precious_theme') as 'light' | 'dark' | null;
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('precious_theme', next);
      return next;
    });
  };

  // Load chat sessions from localStorage
  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem('precious_ai_chat_sessions');
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (Array.isArray(parsed)) {
          setChatSessions(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load chat sessions:', e);
    }
  }, []);

  // Save admin token
  useEffect(() => {
    const savedToken = localStorage.getItem('precious_admin_token');
    if (savedToken) {
      setAdminToken(savedToken);
    }
  }, []);

  // URL route detection: /admin or #admin
  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path.startsWith('/admin') || hash === '#admin') {
        setCurrentMode('admin');
      } else if (currentMode === 'admin' && path === '/' && hash !== '#admin') {
        setCurrentMode('public');
      }
    };

    checkRoute();
    window.addEventListener('popstate', checkRoute);
    window.addEventListener('hashchange', checkRoute);
    return () => {
      window.removeEventListener('popstate', checkRoute);
      window.removeEventListener('hashchange', checkRoute);
    };
  }, []);

  // Keyboard shortcut: Cmd+K or Ctrl+K for New Chat in visitor mode
  // Keyboard shortcut: Ctrl+Alt+A / Cmd+Option+A for intentional Admin access
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleNewChat();
      }

      // Secure Administrative Shortcut: Ctrl+Alt+A or Cmd+Option+A
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (currentMode === 'public') {
          setCurrentMode('admin');
          window.history.pushState(null, '', '/admin');
        } else {
          setCurrentMode('public');
          window.history.pushState(null, '', '/');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMode]);

  const handleAdminLogout = async () => {
    if (adminToken) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      } catch (e) {
        console.error(e);
      }
    }
    localStorage.removeItem('precious_admin_token');
    setAdminToken(null);
    setCurrentMode('public');
    window.history.pushState(null, '', '/');
  };

  const handleExitAdmin = () => {
    setCurrentMode('public');
    window.history.pushState(null, '', '/');
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
  };

  const handleSelectConversation = (id: string) => {
    setActiveSessionId(id);
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = chatSessions.filter((s) => s.id !== id);
      setChatSessions(updated);
      localStorage.setItem('precious_ai_chat_sessions', JSON.stringify(updated));
      if (activeSessionId === id) {
        setActiveSessionId(null);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleClearHistory = () => {
    setChatSessions([]);
    localStorage.removeItem('precious_ai_chat_sessions');
    setActiveSessionId(null);
  };

  const handleNewSessionCreated = useCallback(
    (newSession: { id: string; title: string; created_at: string; messages: ChatMessage[] }) => {
      setChatSessions((prev) => {
        const updated = [newSession, ...prev.filter((s) => s.id !== newSession.id)];
        try {
          localStorage.setItem('precious_ai_chat_sessions', JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        return updated;
      });
      setActiveSessionId(newSession.id);
    },
    []
  );

  const handleUpdateSession = useCallback((sessionId: string, messages: ChatMessage[]) => {
    setChatSessions((prev) => {
      const updated = prev.map((s) => {
        if (s.id === sessionId) {
          return {
            ...s,
            messages,
          };
        }
        return s;
      });
      try {
        localStorage.setItem('precious_ai_chat_sessions', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  }, []);

  // ADMIN MODE (Dedicated view: Login Page if unauthenticated, Layout if authenticated)
  if (currentMode === 'admin') {
    if (!adminToken) {
      return (
        <AdminLoginPage
          onLoginSuccess={(token) => {
            setAdminToken(token);
          }}
          onExitToVisitorChat={handleExitAdmin}
        />
      );
    }

    return (
      <AdminLayout
        adminToken={adminToken}
        onExitAdmin={handleExitAdmin}
        onLogout={handleAdminLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    );
  }

  // VISITOR MODE: Pure, Clean, Minimalist AI Assistant interface
  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-900 font-sans antialiased transition-colors dark:bg-zinc-950 dark:text-zinc-100">
      {/* Top Application Header (Visitor only) */}
      <Header
        currentMode="public"
        isAdminAuthenticated={Boolean(adminToken)}
        onSwitchMode={(mode) => {
          if (mode === 'admin') {
            setCurrentMode('admin');
            window.history.pushState(null, '', '/admin');
          }
        }}
        onAdminLogout={handleAdminLogout}
        onOpenLogin={() => {
          setCurrentMode('admin');
          window.history.pushState(null, '', '/admin');
        }}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        onNewChat={handleNewChat}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main View Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Minimal Collapsible Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onNewChat={handleNewChat}
          conversations={chatSessions}
          activeConversationId={activeSessionId}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Public Chat Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <PublicChat
            activeSessionId={activeSessionId}
            onUpdateSession={handleUpdateSession}
            onNewSessionCreated={handleNewSessionCreated}
          />
        </main>
      </div>

      {/* Visitor Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onClearHistory={handleClearHistory}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrandingProvider>
      <AppContent />
    </BrandingProvider>
  );
}
