import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  MessageSquare,
  TrendingUp,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Layers,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import type { AnalyticsSummary } from '../../types.js';

interface AdminAnalyticsProps {
  adminToken: string;
}

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ adminToken }) => {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('/api/admin/analytics', {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to load analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [adminToken]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-zinc-400">
        Loading analytics metrics...
      </div>
    );
  }

  const satisfactionRate = data?.satisfactionRate ?? 100;
  const totalFeedback = data?.totalFeedback ?? 0;
  const positiveFeedback = data?.positiveFeedback ?? 0;
  const negativeFeedback = data?.negativeFeedback ?? 0;

  const totalConvs = data?.totalConversations ?? 0;
  const publicConvs = data?.publicConversations ?? 0;
  const adminConvs = data?.adminConversations ?? 0;

  const publicRatio = totalConvs > 0 ? Math.round((publicConvs / totalConvs) * 100) : 100;
  const adminRatio = 100 - publicRatio;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 sm:p-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Analytics & Performance
        </h1>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Essential metrics on chatbot utilization, response quality, and user satisfaction.
        </p>
      </div>

      {/* Primary 4 Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Total Messages */}
        <div className="rounded-xl border border-zinc-200/80 bg-white p-4.5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Total Messages
            </span>
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {data?.totalMessages ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
            {data?.userMessages ?? 0} from visitors
          </div>
        </div>

        {/* Total Conversations */}
        <div className="rounded-xl border border-zinc-200/80 bg-white p-4.5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Sessions
            </span>
            <MessageSquare className="h-4 w-4" />
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {totalConvs}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
            {publicConvs} visitor chats
          </div>
        </div>

        {/* Satisfaction Rate */}
        <div className="rounded-xl border border-zinc-200/80 bg-white p-4.5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              User Satisfaction
            </span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {satisfactionRate}%
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
            {positiveFeedback} of {totalFeedback} rated helpful
          </div>
        </div>

        {/* Avg Latency */}
        <div className="rounded-xl border border-zinc-200/80 bg-white p-4.5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Avg Latency
            </span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono">
            {data?.avgLatencyMs ?? 480}ms
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            Fast RAG retrieval
          </div>
        </div>
      </div>

      {/* Two Columns: Usage Trends & Feedback Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Session Distribution */}
        <div className="rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800/80">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Session Distribution
            </h2>
            <span className="text-xs text-zinc-400">{totalConvs} total</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Proportion Bar */}
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                style={{ width: `${publicRatio}%` }}
                className="bg-emerald-500 transition-all duration-500"
              />
              <div
                style={{ width: `${adminRatio}%` }}
                className="bg-indigo-500 transition-all duration-500"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-zinc-700 dark:text-zinc-300">Visitor Chats</span>
              </div>
              <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                {publicConvs} ({publicRatio}%)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                <span className="text-zinc-700 dark:text-zinc-300">Admin Training Sessions</span>
              </div>
              <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                {adminConvs} ({adminRatio}%)
              </span>
            </div>
          </div>
        </div>

        {/* Feedback Sentiment */}
        <div className="rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800/80">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Feedback Quality
            </h2>
            <span className="text-xs text-zinc-400">{totalFeedback} ratings logged</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3.5 dark:border-emerald-950/60 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <ThumbsUp className="h-4 w-4" />
                <span className="text-xs font-medium">Positive</span>
              </div>
              <div className="mt-2 text-xl font-semibold text-emerald-900 dark:text-emerald-200">
                {positiveFeedback}
              </div>
            </div>

            <div className="rounded-lg border border-rose-100 bg-rose-50/40 p-3.5 dark:border-rose-950/60 dark:bg-rose-950/20">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
                <ThumbsDown className="h-4 w-4" />
                <span className="text-xs font-medium">Flagged</span>
              </div>
              <div className="mt-2 text-xl font-semibold text-rose-900 dark:text-rose-200">
                {negativeFeedback}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Topics / Categories queried */}
      <div className="rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800/80">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Top Knowledge Domains
          </h2>
          <span className="text-xs text-zinc-400">Coverage & citations</span>
        </div>

        <div className="mt-4 space-y-2.5">
          {(!data?.topCategories || data.topCategories.length === 0) ? (
            <p className="text-xs text-zinc-400">No knowledge domains configured.</p>
          ) : (
            data.topCategories.map((item, idx) => {
              const maxCount = data.topCategories[0]?.count || 1;
              const pct = Math.round((item.count / maxCount) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {item.category}
                    </span>
                    <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                      {item.count} items
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full rounded-full bg-zinc-900 dark:bg-zinc-300"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
