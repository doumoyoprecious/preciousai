import React, { useState, useEffect } from 'react';
import {
  Search,
  MessageSquare,
  Trash2,
  Calendar,
  Sparkles,
  ArrowLeft,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { PreciousMark } from '../PreciousMark.js';
import type { Conversation, ChatMessage, MessageSource } from '../../types.js';

interface AdminConversationsProps {
  adminToken: string;
}

export const AdminConversations: React.FC<AdminConversationsProps> = ({ adminToken }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'public' | 'admin_training'>('all');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Mobile detail view toggle
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Delete confirmation
  const [deleteConfirmConv, setDeleteConfirmConv] = useState<Conversation | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const url = filterMode === 'all' 
        ? '/api/admin/conversations' 
        : `/api/admin/conversations?mode=${filterMode}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const list: Conversation[] = await res.json();
        setConversations(list);
        if (list.length > 0 && !selectedId) {
          setSelectedId(list[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [filterMode]);

  // Fetch messages when selectedId changes
  useEffect(() => {
    if (!selectedId) {
      setSelectedMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        setLoadingMessages(true);
        const res = await fetch(`/api/admin/conversations/${selectedId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSelectedMessages(data.messages || []);
        }
      } catch (err) {
        console.error('Failed to fetch messages', err);
      } finally {
        setLoadingMessages(false);
      }
    };
    fetchMessages();
  }, [selectedId]);

  const handleDeleteConversation = async () => {
    if (!deleteConfirmConv) return;

    try {
      const res = await fetch(`/api/admin/conversations/${deleteConfirmConv.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      if (res.ok) {
        const remaining = conversations.filter((c) => c.id !== deleteConfirmConv.id);
        setConversations(remaining);
        if (selectedId === deleteConfirmConv.id) {
          setSelectedId(remaining.length > 0 ? remaining[0].id : null);
          setMobileDetailOpen(false);
        }
        setDeleteConfirmConv(null);
      }
    } catch (err) {
      console.error('Failed to delete conversation', err);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredConversations = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (c.title || '').toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
  });

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Conversations
        </h1>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Inspect visitor chats and training sessions in a clean conversational layout.
        </p>
      </div>

      {/* Two-Column Split Layout */}
      <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-12 min-h-[640px] max-h-[780px]">
        {/* Left Column: Conversation List */}
        <div
          className={`flex flex-col border-r border-zinc-200/80 dark:border-zinc-800 md:col-span-4 lg:col-span-4 ${
            mobileDetailOpen ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search & Filter Bar */}
          <div className="border-b border-zinc-100 p-3.5 dark:border-zinc-800 space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-zinc-200/80 bg-zinc-50/50 py-1.5 pl-8 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1">
              {(['all', 'public', 'admin_training'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={`flex-1 rounded-md py-1 text-[11px] font-medium transition-colors ${
                    filterMode === mode
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  }`}
                >
                  {mode === 'all' ? 'All' : mode === 'public' ? 'Public' : 'Training'}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {loading ? (
              <div className="p-8 text-center text-xs text-zinc-400">Loading sessions...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">No conversations found.</div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = c.id === selectedId;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedId(c.id);
                      setMobileDetailOpen(true);
                    }}
                    className={`group flex cursor-pointer items-center justify-between p-3.5 transition-colors ${
                      isSelected
                        ? 'bg-zinc-100/80 dark:bg-zinc-800/60'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`truncate text-xs font-medium ${
                            isSelected
                              ? 'text-zinc-900 dark:text-zinc-100'
                              : 'text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {c.title || 'Untitled Session'}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400 dark:text-zinc-500">
                        <span
                          className={`rounded px-1.5 py-0.2 text-[9px] font-medium ${
                            c.mode === 'public'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                          }`}
                        >
                          {c.mode === 'public' ? 'Public' : 'Training'}
                        </span>
                        <span>
                          {new Date(c.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmConv(c);
                      }}
                      className="rounded p-1 text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-zinc-200 hover:text-rose-600 dark:hover:bg-zinc-700 dark:hover:text-rose-400 transition-all"
                      title="Delete conversation"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chatbot-Style Conversation View */}
        <div
          className={`flex flex-col md:col-span-8 lg:col-span-8 ${
            !mobileDetailOpen ? 'hidden md:flex' : 'flex'
          }`}
        >
          {selectedConversation ? (
            <>
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <button
                    onClick={() => setMobileDetailOpen(false)}
                    className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 md:hidden"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>

                  <div className="truncate">
                    <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {selectedConversation.title || 'Untitled Session'}
                    </h2>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      Started{' '}
                      {new Date(selectedConversation.created_at).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                      selectedConversation.mode === 'public'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                    }`}
                  >
                    {selectedConversation.mode === 'public' ? 'Public Visitor Chat' : 'Admin Training Session'}
                  </span>

                  <button
                    onClick={() => setDeleteConfirmConv(selectedConversation)}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition-colors"
                    title="Delete session"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Chat Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {loadingMessages ? (
                  <div className="flex h-48 items-center justify-center text-xs text-zinc-400">
                    Loading messages...
                  </div>
                ) : selectedMessages.length === 0 ? (
                  <div className="flex h-48 items-center justify-center text-xs text-zinc-400">
                    No messages in this session.
                  </div>
                ) : (
                  selectedMessages.map((msg, idx) => {
                    const isUser = msg.sender === 'user' || msg.sender === 'admin';

                    if (isUser) {
                      return (
                        <div key={msg.id || idx} className="flex justify-end py-1">
                          <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl bg-zinc-100 px-4 py-2.5 text-xs sm:text-[13px] leading-relaxed text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 whitespace-pre-wrap break-words">
                            {msg.text}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id || idx} className="group flex items-start gap-3 py-1">
                        {/* Minimal Avatar */}
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 select-none items-center justify-center rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                          <PreciousMark className="h-3.5 w-3.5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 space-y-2 min-w-0">
                          <div className="markdown-body prose prose-zinc dark:prose-invert max-w-none text-xs sm:text-[13px] leading-relaxed break-words">
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                          </div>

                          {/* Sources used */}
                          {msg.sources_used && msg.sources_used.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                              <span className="text-[10px] font-medium text-zinc-400">Sources:</span>
                              {msg.sources_used.map((source: MessageSource, sIdx: number) => (
                                <span
                                  key={sIdx}
                                  className="inline-flex items-center rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 dark:text-zinc-300"
                                >
                                  {source.title}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Metadata & Copy action */}
                          <div className="flex items-center gap-3 pt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                            {msg.metadata?.latency_ms && (
                              <span>Latency: {msg.metadata.latency_ms}ms</span>
                            )}
                            <button
                              onClick={() => handleCopy(msg.text, msg.id)}
                              className="inline-flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-500" />
                                  <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center text-xs text-zinc-400">
              Select a conversation from the list to view the full dialogue.
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Delete Conversation
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Are you sure you want to delete this session? All messages will be permanently removed.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800/80 text-xs">
              <button
                type="button"
                onClick={() => setDeleteConfirmConv(null)}
                className="rounded-lg px-3 py-1.5 font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConversation}
                className="rounded-lg bg-rose-600 px-3.5 py-1.5 font-medium text-white hover:bg-rose-700 transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
