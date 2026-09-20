import React, { useState, useEffect } from 'react';
import {
  Users,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowUpRight,
} from 'lucide-react';
import type { AnalyticsSummary } from '../../types.js';

interface AdminOverviewProps {
  adminToken: string;
  onNavigateTab: (tab: 'users' | 'conversations' | 'knowledge' | 'analytics' | 'settings') => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ adminToken, onNavigateTab }) => {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await fetch('/api/admin/analytics', {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to load overview data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, [adminToken]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
        Loading overview metrics...
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Users',
      value: data?.totalUsers ?? 0,
      sub: `${data?.activeUsers ?? 0} active`,
      icon: Users,
      action: () => onNavigateTab('users'),
    },
    {
      label: 'Conversations',
      value: data?.totalConversations ?? 0,
      sub: `${data?.publicConversations ?? 0} public / ${data?.adminConversations ?? 0} training`,
      icon: MessageSquare,
      action: () => onNavigateTab('conversations'),
    },
    {
      label: 'Total Messages',
      value: data?.totalMessages ?? 0,
      sub: `${data?.userMessages ?? 0} user inquiries`,
      icon: Sparkles,
      action: () => onNavigateTab('conversations'),
    },
    {
      label: 'Satisfaction Rate',
      value: `${data?.satisfactionRate ?? 100}%`,
      sub: `${data?.positiveFeedback ?? 0} positive ratings`,
      icon: TrendingUp,
      action: () => onNavigateTab('analytics'),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 sm:p-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Administrator Overview
        </h1>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Real-time summary of Precious AI operations, users, and conversations.
        </p>
      </div>

      {/* Compact Stat Blocks */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={idx}
              onClick={s.action}
              className="group relative flex cursor-pointer flex-col justify-between rounded-xl border border-zinc-200/80 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-2xs dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
              <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  {s.label}
                </span>
                <Icon className="h-4 w-4 text-zinc-400 group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-300 transition-colors" />
              </div>

              <div className="mt-3">
                <div className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {s.value}
                </div>
                <div className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                  {s.sub}
                </div>
              </div>

              <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors">
                <span>View</span>
                <ArrowUpRight className="h-3 w-3" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Operational Status & Top Knowledge */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* System Health */}
        <div className="rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800/80">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              System Health
            </h2>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Operational
            </span>
          </div>

          <div className="mt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">AI Model Runtime</span>
              <span className="font-mono text-[11px] font-medium text-zinc-800 dark:text-zinc-200">
                Gemini 2.5 Flash
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">RAG Context Engine</span>
              <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">Public Visitor Chat</span>
              <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Enabled
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">Avg Latency</span>
              <span className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                {data?.avgLatencyMs ?? 480} ms
              </span>
            </div>
          </div>
        </div>

        {/* Top Queried Categories */}
        <div className="rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800/80">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Knowledge Distribution
            </h2>
            <button
              onClick={() => onNavigateTab('knowledge')}
              className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Manage Knowledge →
            </button>
          </div>

          <div className="mt-4">
            {(!data?.topCategories || data.topCategories.length === 0) ? (
              <p className="text-xs text-zinc-400">No knowledge categories loaded.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {data.topCategories.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/70 px-3 py-2 text-xs dark:border-zinc-800/60 dark:bg-zinc-800/40"
                  >
                    <span className="truncate text-zinc-700 dark:text-zinc-300">{c.category}</span>
                    <span className="font-mono text-[11px] font-medium text-zinc-400 dark:text-zinc-500 ml-2">
                      {c.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Stream */}
      <div className="rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800/80">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Recent System Activity
          </h2>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">Live feed</span>
        </div>

        <div className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
          {(!data?.recentActivity || data.recentActivity.length === 0) ? (
            <div className="py-6 text-center text-zinc-400 dark:text-zinc-500">
              No recent activity recorded.
            </div>
          ) : (
            data.recentActivity.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2.5 transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 px-2 rounded-lg"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {item.type === 'conversation' && <MessageSquare className="h-3 w-3" />}
                    {item.type === 'feedback' && <TrendingUp className="h-3 w-3" />}
                    {item.type === 'user' && <Users className="h-3 w-3" />}
                  </div>
                  <div className="truncate">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      {item.title}
                    </span>
                    {item.detail && (
                      <span className="ml-2 text-zinc-400 dark:text-zinc-500 truncate hidden sm:inline">
                        {item.detail}
                      </span>
                    )}
                  </div>
                </div>

                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 shrink-0 ml-3">
                  {new Date(item.timestamp).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
