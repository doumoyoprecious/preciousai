import React, { useState, useEffect } from 'react';
import {
  ListFilter,
  CheckCircle2,
  XCircle,
  Edit3,
  BookOpen,
  Brain,
  ThumbsDown,
  ThumbsUp,
  Clock,
  MessageSquare,
} from 'lucide-react';
import type { ResponseFeedback } from '../../types.js';

interface TrainingQueueProps {
  adminToken: string;
}

export const TrainingQueue: React.FC<TrainingQueueProps> = ({ adminToken }) => {
  const [queueItems, setQueueItems] = useState<ResponseFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCorrection, setEditCorrection] = useState('');

  const loadQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/queue', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      setQueueItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setQueueItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleAction = async (
    id: string,
    action: 'approve' | 'edit' | 'save_knowledge' | 'save_training' | 'reject',
    correctionText?: string
  ) => {
    try {
      await fetch(`/api/admin/queue/${id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          action,
          correction: correctionText,
        }),
      });
      setEditingId(null);
      loadQueue();
    } catch (e) {
      console.error(e);
    }
  };

  const safeQueueItems = Array.isArray(queueItems) ? queueItems : [];

  const filtered = safeQueueItems.filter((item) => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ListFilter className="h-5 w-5 text-indigo-600" />
            Training Queue & Corrections Review
          </h2>
          <p className="text-xs text-slate-500">
            Audit visitor feedback, downvoted outputs, and pending training corrections before approving them into RAG memory.
          </p>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 p-1 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-md px-3 py-1.5 font-medium transition-all ${
              filter === 'all' ? 'bg-white font-semibold text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            All ({safeQueueItems.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`rounded-md px-3 py-1.5 font-medium transition-all ${
              filter === 'pending'
                ? 'bg-white font-semibold text-amber-700 shadow-xs'
                : 'text-slate-600'
            }`}
          >
            Pending ({safeQueueItems.filter((q) => q.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`rounded-md px-3 py-1.5 font-medium transition-all ${
              filter === 'resolved'
                ? 'bg-white font-semibold text-emerald-700 shadow-xs'
                : 'text-slate-600'
            }`}
          >
            Resolved ({safeQueueItems.filter((q) => q.status === 'resolved').length})
          </button>
          <button
            onClick={() => setFilter('dismissed')}
            className={`rounded-md px-3 py-1.5 font-medium transition-all ${
              filter === 'dismissed'
                ? 'bg-white font-semibold text-slate-700 shadow-xs'
                : 'text-slate-600'
            }`}
          >
            Dismissed ({safeQueueItems.filter((q) => q.status === 'dismissed').length})
          </button>
        </div>
      </div>

      {/* Queue Items */}
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading training queue...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
          <p className="text-sm font-medium text-slate-800">Training Queue is Clear</p>
          <p className="text-xs text-slate-500 mt-1">
            No pending corrections require attention right now.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                      item.rating === 'negative'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {item.rating === 'negative' ? (
                      <ThumbsDown className="h-3 w-3" />
                    ) : (
                      <ThumbsUp className="h-3 w-3" />
                    )}
                    {item.rating === 'negative' ? 'Needs Review / Downvoted' : 'Positive Feedback'}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 font-semibold capitalize ${
                      item.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : item.status === 'resolved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                </div>
              </div>

              {item.user_message && (
                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-800 border border-slate-200">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                    User Question:
                  </span>
                  {item.user_message}
                </div>
              )}

              {item.assistant_response && (
                <div className="rounded-lg bg-slate-50/70 p-3 text-xs text-slate-700 border border-slate-200">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                    AI Response Given:
                  </span>
                  {item.assistant_response}
                </div>
              )}

              {/* Correction Box */}
              {editingId === item.id ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50/40 p-3 space-y-2">
                  <label className="block text-xs font-semibold text-amber-900">
                    Enter Approved Correction:
                  </label>
                  <textarea
                    rows={3}
                    value={editCorrection}
                    onChange={(e) => setEditCorrection(e.target.value)}
                    className="w-full rounded-md border border-slate-300 p-2 text-xs bg-white text-slate-900"
                    placeholder="Enter what the AI should have said..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(item.id, 'approve', editCorrection)}
                      className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Save Correction
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : item.correction ? (
                <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900 border border-emerald-200">
                  <span className="font-semibold text-emerald-800 uppercase tracking-wider block mb-0.5">
                    Proposed / Approved Correction:
                  </span>
                  {item.correction}
                </div>
              ) : null}

              {/* Queue Action Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingId(item.id);
                      setEditCorrection(item.correction || '');
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    <Edit3 className="h-3 w-3 text-amber-600" />
                    <span>Edit Correction</span>
                  </button>

                  <button
                    onClick={() => handleAction(item.id, 'save_training', item.correction)}
                    className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-indigo-700 hover:bg-indigo-100 font-medium border border-indigo-200"
                  >
                    <Brain className="h-3 w-3" />
                    <span>Save as Training Example</span>
                  </button>

                  <button
                    onClick={() => handleAction(item.id, 'save_knowledge', item.correction)}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-emerald-700 hover:bg-emerald-100 font-medium border border-emerald-200"
                  >
                    <BookOpen className="h-3 w-3" />
                    <span>Save to Knowledge Base</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleAction(item.id, 'approve', item.correction)}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1 font-semibold text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => handleAction(item.id, 'reject')}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-slate-600 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <XCircle className="h-3 w-3" />
                    <span>Dismiss</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
