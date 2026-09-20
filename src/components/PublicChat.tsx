import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  ArrowUp,
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { PreciousMark } from './PreciousMark.js';
import { TypingIndicator } from './TypingIndicator.js';
import type { ChatMessage } from '../types.js';

interface PublicChatProps {
  activeSessionId: string | null;
  onUpdateSession: (sessionId: string, messages: ChatMessage[]) => void;
  onNewSessionCreated: (session: { id: string; title: string; created_at: string; messages: ChatMessage[] }) => void;
}

const PRESET_QUESTIONS = [
  'What did Precious study and where?',
  'What are his key technical skills and expertise?',
  'Tell me about projects and Web3 experience',
  'What certifications does Precious hold?',
];

export const PublicChat: React.FC<PublicChatProps> = ({
  activeSessionId,
  onUpdateSession,
  onNewSessionCreated,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'positive' | 'negative'>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load session messages when activeSessionId changes
  useEffect(() => {
    setLoading(false);
    if (!activeSessionId) {
      setMessages([]);
      setConversationId(null);
      return;
    }

    try {
      const savedRaw = localStorage.getItem('precious_ai_chat_sessions');
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        const session = parsed.find((s: any) => s.id === activeSessionId);
        if (session && Array.isArray(session.messages)) {
          setMessages(session.messages);
          setConversationId(session.conversationId || activeSessionId);
        }
      }
    } catch (e) {
      console.error('Error loading session:', e);
    }
  }, [activeSessionId]);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputText]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const currentConvId = conversationId || (activeSessionId ? activeSessionId : null);

    const tempUserMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      conversation_id: currentConvId || 'pending',
      sender: 'user',
      text,
      created_at: new Date().toISOString(),
    };

    const updatedMessages = [...messages, tempUserMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversation_id: currentConvId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to get response');
      }

      const data = await res.json();
      const resolvedConvId = data.conversation_id || currentConvId || `conv-${Date.now()}`;
      setConversationId(resolvedConvId);

      const assistantMsg: ChatMessage = {
        id: data.message.id || `asst-${Date.now()}`,
        conversation_id: resolvedConvId,
        sender: 'assistant',
        text: data.message.text,
        sources_used: data.message.sources,
        created_at: data.message.created_at || new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);

      // Handle session tracking
      if (!activeSessionId) {
        // Create new session
        const newSession = {
          id: resolvedConvId,
          title: text.length > 34 ? `${text.slice(0, 32)}...` : text,
          created_at: new Date().toISOString(),
          conversationId: resolvedConvId,
          messages: finalMessages,
        };
        onNewSessionCreated(newSession);
      } else {
        onUpdateSession(activeSessionId, finalMessages);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        conversation_id: currentConvId || 'error',
        sender: 'assistant',
        text: `I encountered an issue while retrieving verified data: ${err.message || 'Please try again'}.`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedback = async (
    messageId: string,
    rating: 'positive' | 'negative',
    userQueryText?: string,
    responseContent?: string
  ) => {
    if (feedbackGiven[messageId]) return;

    setFeedbackGiven((prev) => ({ ...prev, [messageId]: rating }));

    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          message_id: messageId,
          rating,
          user_message: userQueryText,
          assistant_response: responseContent,
        }),
      });
    } catch (e) {
      console.error('Feedback submission error:', e);
    }
  };

  const getLastUserMessageBefore = (index: number): ChatMessage | undefined => {
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i].sender === 'user') return messages[i];
    }
    return undefined;
  };

  return (
    <div className="flex h-[calc(100vh-3.25rem)] flex-col bg-white dark:bg-zinc-950 transition-colors">
      {/* Scrollable Conversation Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          {/* Empty State */}
          {messages.length === 0 ? (
            <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
              {/* Minimal Brand Mark */}
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs">
                <PreciousMark className="h-6 w-6" />
              </div>

              {/* Title & Quiet Subtitle */}
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
                How can I help you today?
              </h1>
              <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                Ask anything about Precious Doumoyo's background, skills, or career.
              </p>

              {/* 4 Subtle Suggested Prompts */}
              <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2 text-left">
                {PRESET_QUESTIONS.map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(question)}
                    className="flex flex-col rounded-xl border border-zinc-200/90 bg-white p-3.5 text-xs text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/60 transition-all shadow-2xs"
                  >
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{question}</span>
                    <span className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">Ask verified profile</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-6">
              {messages.map((msg, index) => {
                const isUser = msg.sender === 'user';
                const priorUserMsg = isUser ? undefined : getLastUserMessageBefore(index);

                if (isUser) {
                  return (
                    <div key={msg.id || index} className="flex justify-end py-1">
                      <div className="max-w-[85%] rounded-2xl bg-zinc-100 px-4 py-2.5 text-[15px] leading-relaxed text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 sm:max-w-[75%] whitespace-pre-wrap break-words">
                        {msg.text}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id || index} className="group flex items-start gap-3.5 py-1">
                    {/* Minimal Avatar Mark */}
                    <div className="mt-1 flex h-6 w-6 shrink-0 select-none items-center justify-center rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                      <PreciousMark className="h-3.5 w-3.5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="markdown-body prose prose-zinc dark:prose-invert max-w-none text-[15px] leading-relaxed break-words">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>

                      {/* Verified Sources if present */}
                      {msg.sources_used && msg.sources_used.length > 0 && (
                        <div className="pt-2 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">Sources:</span>
                          {msg.sources_used.map((source, sIdx) => (
                            <span
                              key={sIdx}
                              className="inline-flex items-center rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:text-zinc-300"
                            >
                              {source.title}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Message Actions (Subtle on hover) */}
                      <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 sm:transition-opacity">
                        <button
                          onClick={() => handleCopy(msg.text, msg.id)}
                          title="Copy response"
                          className="flex items-center gap-1 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Copied</span>
                            </>
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>

                        {priorUserMsg && (
                          <button
                            onClick={() => handleSendMessage(priorUserMsg.text)}
                            title="Regenerate response"
                            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() =>
                            handleFeedback(msg.id, 'positive', priorUserMsg?.text, msg.text)
                          }
                          title="Good response"
                          className={`rounded-md p-1.5 transition-colors ${
                            feedbackGiven[msg.id] === 'positive'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
                          }`}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() =>
                            handleFeedback(msg.id, 'negative', priorUserMsg?.text, msg.text)
                          }
                          title="Poor response"
                          className={`rounded-md p-1.5 transition-colors ${
                            feedbackGiven[msg.id] === 'negative'
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
                          }`}
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Modern Minimalist Typing Indicator */}
              {loading && <TypingIndicator className="animate-in fade-in duration-150" />}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Floating Centered Message Composer */}
      <div className="border-t border-transparent bg-gradient-to-t from-white via-white to-transparent dark:from-zinc-950 dark:via-zinc-950 pt-2 pb-3 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="relative flex items-end rounded-2xl border border-zinc-200/90 bg-white p-2 pl-4 shadow-xs focus-within:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:focus-within:border-zinc-600 transition-all"
          >
            <textarea
              id="public-chat-input"
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder={loading ? 'Precious AI is responding...' : 'Message Precious AI...'}
              className="w-full resize-none bg-transparent py-1.5 text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500 min-h-[28px] max-h-36 disabled:text-zinc-400"
            />
            <button
              id="public-chat-send-btn"
              type="submit"
              disabled={loading || !inputText.trim()}
              title={loading ? 'Precious AI is generating a response...' : 'Send message'}
              className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full brand-btn-primary hover:opacity-90 disabled:bg-zinc-100 disabled:text-zinc-300 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600 transition-all shadow-2xs"
            >
              <ArrowUp className="h-4 w-4 stroke-[2.5]" />
            </button>
          </form>

          {/* Discreet Disclaimer */}
          <div className="mt-2 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
            Precious AI provides verified information about Precious Doumoyo.
          </div>
        </div>
      </div>
    </div>
  );
};
