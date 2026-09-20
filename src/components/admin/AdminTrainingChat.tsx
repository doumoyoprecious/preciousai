import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  User,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  BookOpen,
  Brain,
  Sparkles,
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  History,
  Plus,
  Search,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { PreciousMark } from '../PreciousMark.js';
import type { ChatMessage, Conversation, InteractionReviewStatus } from '../../types.js';
import { CorrectionModal } from '../CorrectionModal.js';
import { SaveKnowledgeModal } from '../SaveKnowledgeModal.js';
import { SavePersonalityModal } from '../SavePersonalityModal.js';

interface AdminTrainingChatProps {
  adminToken: string;
}

export const AdminTrainingChat: React.FC<AdminTrainingChatProps> = ({ adminToken }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState('');

  // Modals state
  const [correctionModalData, setCorrectionModalData] = useState<{
    isOpen: boolean;
    userMessage: string;
    assistantResponse: string;
    messageId: string;
  }>({
    isOpen: false,
    userMessage: '',
    assistantResponse: '',
    messageId: '',
  });

  const [knowledgeModalData, setKnowledgeModalData] = useState<{
    isOpen: boolean;
    initialContent: string;
  }>({
    isOpen: false,
    initialContent: '',
  });

  const [personalityModalData, setPersonalityModalData] = useState<{
    isOpen: boolean;
    initialQuestion: string;
    initialResponse: string;
  }>({
    isOpen: false,
    initialQuestion: '',
    initialResponse: '',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load conversations list
  const loadConversations = async () => {
    try {
      const res = await fetch('/api/admin/training/conversations', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      const convList: Conversation[] = Array.isArray(data) ? data : [];
      setConversations(convList);
      if (convList.length > 0 && !activeConversationId) {
        setActiveConversationId(convList[0].id);
        loadMessages(convList[0].id);
      } else if (convList.length === 0) {
        handleNewSession();
      }
    } catch (e) {
      console.error(e);
      setConversations([]);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/admin/conversations/${convId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
    } catch (e) {
      console.error(e);
      setMessages([]);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [adminToken]);

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    loadMessages(id);
  };

  const handleNewSession = async () => {
    try {
      const res = await fetch('/api/admin/training/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ title: 'New Training Session' }),
      });
      const newConv = await res.json();
      if (newConv && newConv.id) {
        setConversations((prev) => [newConv, ...(Array.isArray(prev) ? prev : [])]);
        setActiveConversationId(newConv.id);
        setMessages([
          {
            id: `init-${Date.now()}`,
            conversation_id: newConv.id,
            sender: 'assistant',
            text: "Ready for training. You can talk to me naturally, test responses about Precious Doumoyo, and use the review actions below each response to correct, approve, or convert insights into RAG knowledge.",
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSession = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/admin/training/conversations/${convId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const currentList = Array.isArray(conversations) ? conversations : [];
      const updatedList = currentList.filter((c) => c.id !== convId);
      setConversations(updatedList);
      if (activeConversationId === convId) {
        if (updatedList.length > 0) {
          setActiveConversationId(updatedList[0].id);
          loadMessages(updatedList[0].id);
        } else {
          handleNewSession();
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || loading || !activeConversationId) return;

    setInputText('');
    const tempAdminMsg: ChatMessage = {
      id: `temp-admin-${Date.now()}`,
      conversation_id: activeConversationId,
      sender: 'admin',
      text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempAdminMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/training/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          message: text,
          conversation_id: activeConversationId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate training response');

      const assistantMsg: ChatMessage = {
        id: data.message.id,
        conversation_id: data.conversation_id,
        sender: 'assistant',
        text: data.message.text,
        sources_used: data.evaluation?.sources_used || [],
        training_examples_used: data.evaluation?.training_examples_used || [],
        review_status: 'pending',
        created_at: data.message.created_at,
        metadata: {
          latency_ms: data.evaluation?.latency_ms,
          intent: data.evaluation?.rag_tier_applied,
        },
      };

      setMessages((prev) => [...prev, assistantMsg]);
      loadConversations(); // refresh title if updated
    } catch (err: any) {
      console.error(err);
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        conversation_id: activeConversationId,
        sender: 'assistant',
        text: `Error processing training message: ${err.message}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Update Review Status
  const handleUpdateStatus = async (
    messageId: string,
    status: InteractionReviewStatus,
    correction?: string
  ) => {
    try {
      await fetch('/api/admin/training/review-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          message_id: messageId,
          review_status: status,
          correction,
        }),
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, review_status: status, correction } : m
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  // Save as Training Example
  const handleSaveAsTrainingExample = async (
    userMsgText: string,
    assistantText: string,
    correctionText?: string,
    categoryName = 'Profile',
    messageIdToMark?: string
  ) => {
    try {
      await fetch('/api/admin/training/save-example', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          user_message: userMsgText,
          assistant_response: assistantText,
          correction: correctionText,
          category: categoryName,
          source: 'Admin Training Chat',
          approved: true,
        }),
      });

      if (messageIdToMark) {
        handleUpdateStatus(messageIdToMark, 'training_example', correctionText);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save as Knowledge directly
  const handleSaveKnowledge = async (data: any) => {
    try {
      await fetch('/api/admin/training/save-knowledge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(data),
      });
      if (correctionModalData.messageId) {
        handleUpdateStatus(correctionModalData.messageId, 'knowledge');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredConversations = (Array.isArray(conversations) ? conversations : []).filter((c) =>
    (c?.title || '').toLowerCase().includes(searchHistory.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-125px)] bg-slate-100 overflow-hidden">
      {/* Training Sessions Sidebar */}
      <div className="hidden md:flex w-72 flex-col border-r border-slate-200 bg-white">
        <div className="p-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <History className="h-3.5 w-3.5 text-indigo-600" />
            <span>Training Sessions</span>
          </div>
          <button
            onClick={handleNewSession}
            className="flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
        </div>

        <div className="p-2 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchHistory}
              onChange={(e) => setSearchHistory(e.target.value)}
              placeholder="Search sessions..."
              className="w-full rounded-md border border-slate-200 py-1.5 pl-8 pr-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredConversations.map((c) => (
            <div
              key={c.id}
              onClick={() => handleSelectConversation(c.id)}
              className={`group flex items-center justify-between rounded-lg p-2.5 text-left text-xs transition-all cursor-pointer ${
                activeConversationId === c.id
                  ? 'bg-indigo-50 font-semibold text-indigo-900 border border-indigo-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="truncate flex-1 pr-1">
                <div className="truncate text-slate-900">{c.title}</div>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                  <span>{new Date(c.updated_at).toLocaleDateString()}</span>
                  {c.message_count !== undefined && <span>• {c.message_count} msgs</span>}
                </div>
              </div>
              <button
                onClick={(e) => handleDeleteSession(c.id, e)}
                title="Delete session"
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-opacity"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Training Chat Area */}
      <div className="flex flex-1 flex-col bg-slate-50">
        {/* Banner with Training Instructions */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-amber-50/60 px-4 py-2 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            <span>
              <strong>Human-In-The-Loop Training Chat:</strong> Responses in this mode do not automatically become permanent knowledge until approved.
            </span>
          </div>
          <span className="hidden sm:inline font-mono text-[11px] text-amber-700">
            Priority 1: Knowledge • Priority 2: Training Examples
          </span>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="mx-auto max-w-4xl space-y-6">
            {messages.map((msg, idx) => {
              const isAdmin = msg.sender === 'admin';
              const isUser = msg.sender === 'user';
              const prevPrompt =
                idx > 0 && messages[idx - 1].sender !== 'assistant' ? messages[idx - 1].text : '';

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isAdmin || isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isAdmin && !isUser && (
                    <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs">
                      <PreciousMark className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`relative max-w-[90%] rounded-2xl px-4 py-3.5 text-sm leading-relaxed shadow-xs sm:max-w-[85%] ${
                      isAdmin
                        ? 'bg-slate-900 text-white rounded-br-xs'
                        : isUser
                        ? 'bg-indigo-600 text-white rounded-br-xs'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                    }`}
                  >
                    {isAdmin || isUser ? (
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    ) : (
                      <div className="space-y-3">
                        <div className="markdown-body prose prose-sm prose-slate max-w-none prose-p:leading-relaxed">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>

                        {/* Correction display if saved */}
                        {msg.correction && (
                          <div className="rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-900 border border-emerald-200">
                            <span className="font-semibold text-emerald-800">
                              Approved Admin Correction:{' '}
                            </span>
                            {msg.correction}
                          </div>
                        )}

                        {/* Review Status Badge */}
                        <div className="flex items-center gap-2 border-t border-slate-100 pt-2 text-xs">
                          <span className="text-[11px] text-slate-400 font-medium">
                            Interaction Status:
                          </span>
                          {msg.review_status === 'approved' && (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                              <CheckCircle2 className="h-3 w-3" /> Approved
                            </span>
                          )}
                          {msg.review_status === 'correction' && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                              ✏️ Corrected
                            </span>
                          )}
                          {msg.review_status === 'training_example' && (
                            <span className="inline-flex items-center gap-1 rounded bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-800">
                              <Brain className="h-3 w-3" /> Training Example
                            </span>
                          )}
                          {msg.review_status === 'knowledge' && (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                              <BookOpen className="h-3 w-3" /> Saved as Knowledge
                            </span>
                          )}
                          {msg.review_status === 'personality_example' && (
                            <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-800">
                              <Sparkles className="h-3 w-3" /> Personality Example
                            </span>
                          )}
                          {msg.review_status === 'do_not_use' && (
                            <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
                              <Ban className="h-3 w-3" /> Do Not Use
                            </span>
                          )}
                          {(!msg.review_status || msg.review_status === 'pending') && (
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                              Pending Review
                            </span>
                          )}
                        </div>

                        {/* Interactive Admin Training Action Controls */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
                          <button
                            onClick={() => handleUpdateStatus(msg.id, 'approved')}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors shadow-2xs"
                          >
                            <ThumbsUp className="h-3 w-3 text-emerald-600" />
                            <span>Approved</span>
                          </button>

                          <button
                            onClick={() => handleUpdateStatus(msg.id, 'correction')}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-colors shadow-2xs"
                          >
                            <ThumbsDown className="h-3 w-3 text-amber-600" />
                            <span>Incorrect</span>
                          </button>

                          <button
                            onClick={() =>
                              setCorrectionModalData({
                                isOpen: true,
                                userMessage: prevPrompt,
                                assistantResponse: msg.text,
                                messageId: msg.id,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-600 transition-colors shadow-2xs"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Correct Response</span>
                          </button>

                          <button
                            onClick={() =>
                              setKnowledgeModalData({
                                isOpen: true,
                                initialContent: msg.correction || msg.text,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
                          >
                            <BookOpen className="h-3 w-3 text-emerald-700" />
                            <span>Save to Knowledge</span>
                          </button>

                          <button
                            onClick={() =>
                              handleSaveAsTrainingExample(
                                prevPrompt,
                                msg.text,
                                msg.correction,
                                'Profile',
                                msg.id
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-800 hover:bg-indigo-100 transition-colors shadow-2xs"
                          >
                            <Brain className="h-3 w-3 text-indigo-700" />
                            <span>Save as Training Example</span>
                          </button>

                          <button
                            onClick={() =>
                              setPersonalityModalData({
                                isOpen: true,
                                initialQuestion: prevPrompt,
                                initialResponse: msg.text,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-800 hover:bg-purple-100 transition-colors shadow-2xs"
                          >
                            <Sparkles className="h-3 w-3 text-purple-700" />
                            <span>Personality Example</span>
                          </button>

                          <button
                            onClick={() => handleUpdateStatus(msg.id, 'do_not_use')}
                            className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors shadow-2xs"
                          >
                            <Ban className="h-3 w-3" />
                            <span>Do Not Use</span>
                          </button>
                        </div>

                        {/* Collapsible RAG Trace Inspection */}
                        <div className="pt-1">
                          <button
                            onClick={() =>
                              setExpandedTraceId(expandedTraceId === msg.id ? null : msg.id)
                            }
                            className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900"
                          >
                            <span>Inspect RAG Sources & Metrics</span>
                            {expandedTraceId === msg.id ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </button>

                          {expandedTraceId === msg.id && (
                            <div className="mt-2 rounded-lg bg-slate-900 p-3 text-xs text-slate-200 space-y-2 font-mono">
                              <div>
                                <span className="text-slate-400">RAG Tier: </span>
                                <span className="text-amber-400">
                                  {msg.metadata?.intent || 'Tier 1 (Approved Knowledge)'}
                                </span>
                              </div>
                              {msg.metadata?.latency_ms && (
                                <div>
                                  <span className="text-slate-400">Inference Latency: </span>
                                  <span className="text-emerald-400">
                                    {msg.metadata.latency_ms} ms
                                  </span>
                                </div>
                              )}
                              <div>
                                <span className="text-slate-400">Retrieved Knowledge: </span>
                                {msg.sources_used && msg.sources_used.length > 0 ? (
                                  <ul className="list-disc pl-4 text-slate-300 mt-1">
                                    {msg.sources_used.map((s, sIdx) => (
                                      <li key={sIdx}>
                                        {s.title} ({s.category})
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-slate-500">None</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl bg-slate-900 text-white">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                  <PreciousMark className="h-4 w-4 animate-pulse" />
                </div>
                <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3 text-xs text-slate-500 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-pulse" />
                  <span>Evaluating context and running RAG retrieval...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick Test Prompt Starters */}
        <div className="border-t border-slate-200 bg-slate-50/80 px-4 py-2">
          <div className="mx-auto flex max-w-4xl items-center gap-1.5 overflow-x-auto text-[11px] text-slate-600">
            <span className="shrink-0 font-medium text-slate-400">Quick tests:</span>
            {[
              "What is Precious Doumoyo's background?",
              "What technical stack does Precious use?",
              "How can I contact Precious for a consultation?",
              "What is Precious's philosophy on AI agents?",
            ].map((q, qIdx) => (
              <button
                key={qIdx}
                type="button"
                onClick={() => setInputText(q)}
                disabled={loading}
                className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 hover:border-indigo-300 hover:text-indigo-600 transition-colors whitespace-nowrap"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="border-t border-slate-200 bg-white p-4">
          <form onSubmit={handleSendMessage} className="mx-auto flex max-w-4xl items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loading}
              placeholder="Interact with Precious AI to test and train (e.g. 'Tell me about Precious', 'What does he do?')..."
              className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 shadow-sm"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Modals */}
      <CorrectionModal
        isOpen={correctionModalData.isOpen}
        onClose={() => setCorrectionModalData((prev) => ({ ...prev, isOpen: false }))}
        userMessage={correctionModalData.userMessage}
        assistantResponse={correctionModalData.assistantResponse}
        onSaveCorrection={async ({
          correction,
          saveAsTraining,
          saveAsKnowledge,
          category,
          knowledgeTitle,
        }) => {
          if (saveAsTraining) {
            await handleSaveAsTrainingExample(
              correctionModalData.userMessage,
              correctionModalData.assistantResponse,
              correction,
              category,
              correctionModalData.messageId
            );
          }
          if (saveAsKnowledge) {
            await handleSaveKnowledge({
              title: knowledgeTitle,
              content: correction,
              category,
              source: 'Admin Direct Correction',
              status: 'published',
            });
          }
        }}
      />

      <SaveKnowledgeModal
        isOpen={knowledgeModalData.isOpen}
        onClose={() => setKnowledgeModalData((prev) => ({ ...prev, isOpen: false }))}
        initialContent={knowledgeModalData.initialContent}
        onSave={handleSaveKnowledge}
      />

      <SavePersonalityModal
        isOpen={personalityModalData.isOpen}
        onClose={() => setPersonalityModalData((prev) => ({ ...prev, isOpen: false }))}
        initialQuestion={personalityModalData.initialQuestion}
        initialResponse={personalityModalData.initialResponse}
        onSave={async (data) => {
          await fetch('/api/admin/training/save-personality', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify(data),
          });
        }}
      />
    </div>
  );
};
