import React from 'react';
import {
  SquarePen,
  MessageSquare,
  Trash2,
  Settings,
  PanelLeftClose,
  X,
} from 'lucide-react';
import { PreciousMark } from './PreciousMark.js';

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  conversations: ChatSession[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  onNewChat,
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onOpenSettings,
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-2xs transition-opacity lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-68 flex-col border-r border-zinc-200/80 bg-zinc-50/95 transition-transform duration-200 ease-in-out dark:border-zinc-800/80 dark:bg-zinc-900/95 lg:static lg:z-20 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:-translate-x-full lg:w-0 lg:border-none'
        }`}
      >
        {/* Top Bar: Brand & New Chat */}
        <div className="flex items-center justify-between border-b border-zinc-200/60 p-3.5 dark:border-zinc-800/60">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
              <PreciousMark className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Precious AI
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
              aria-label="Close sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            id="sidebar-new-chat-btn"
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 1024) onClose();
            }}
            className="flex w-full items-center justify-between rounded-xl border border-zinc-200/80 bg-white px-3 py-2 text-xs font-medium text-zinc-800 shadow-2xs hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700/80 dark:bg-zinc-800/80 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 transition-all"
          >
            <span className="flex items-center gap-2">
              <SquarePen className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
              <span>New chat</span>
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">⌘K</span>
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 scrollbar-thin">
          <div className="px-2 pb-1.5 pt-2 text-[11px] font-medium tracking-wider uppercase text-zinc-400 dark:text-zinc-500">
            Recent
          </div>

          {conversations.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
              No recent conversations
            </div>
          ) : (
            <div className="space-y-0.5">
              {conversations.map((chat) => {
                const isActive = chat.id === activeConversationId;
                return (
                  <div
                    key={chat.id}
                    onClick={() => {
                      onSelectConversation(chat.id);
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={`group relative flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors ${
                      isActive
                        ? 'bg-zinc-200/70 font-medium text-zinc-900 dark:bg-zinc-800/90 dark:text-white'
                        : 'text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden pr-5">
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                      <span className="truncate">{chat.title}</span>
                    </div>

                    <button
                      onClick={(e) => onDeleteConversation(chat.id, e)}
                      title="Delete chat"
                      className="opacity-0 group-hover:opacity-100 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Essentials: Settings */}
        <div className="border-t border-zinc-200/60 p-2 text-xs dark:border-zinc-800/60">
          <button
            onClick={() => {
              onOpenSettings();
              if (window.innerWidth < 1024) onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
          >
            <Settings className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
            <span>Settings</span>
          </button>
        </div>
      </aside>
    </>
  );
};
