import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  History,
  RotateCw,
  CheckCircle,
  Clock,
  Archive,
  FileText,
  AlertCircle,
  Tag,
  FileUp,
} from 'lucide-react';
import type { KnowledgeItem, KnowledgeCategory, KnowledgeStatus } from '../../types.js';
import { SaveKnowledgeModal } from '../SaveKnowledgeModal.js';
import { VersionHistoryModal } from '../VersionHistoryModal.js';

interface KnowledgeManagerProps {
  adminToken: string;
  onNavigateToDocuments?: () => void;
}

const ALL_CATEGORIES: KnowledgeCategory[] = [
  'Profile',
  'Education',
  'Skills',
  'AI',
  'Prompt Engineering',
  'Responsible AI',
  'Data Analytics',
  'Blockchain',
  'Web3',
  'Certifications',
  'Projects',
  'Career',
  'Experience',
  'Services',
  'FAQs',
  'Contact',
  'Professional Preferences',
  'Communication Style',
];

export const KnowledgeManager: React.FC<KnowledgeManagerProps> = ({
  adminToken,
  onNavigateToDocuments,
}) => {
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [editChangeSummary, setEditChangeSummary] = useState('');
  const [versionModalData, setVersionModalData] = useState<{
    isOpen: boolean;
    id: string;
    title: string;
  }>({
    isOpen: false,
    id: '',
    title: '',
  });

  const [reindexingId, setReindexingId] = useState<string | null>(null);

  const loadKnowledge = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/knowledge', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      setKnowledgeList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load knowledge:', e);
      setKnowledgeList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKnowledge();
  }, [adminToken]);

  const handleCreateKnowledge = async (data: any) => {
    try {
      const res = await fetch('/api/admin/knowledge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        loadKnowledge();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const res = await fetch(`/api/admin/knowledge/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          ...editingItem,
          change_summary: editChangeSummary || 'Admin update',
        }),
      });
      if (res.ok) {
        setEditingItem(null);
        setEditChangeSummary('');
        loadKnowledge();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete the knowledge record: "${title}"?`)) {
      return;
    }
    try {
      await fetch(`/api/admin/knowledge/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      loadKnowledge();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReindex = async (id: string) => {
    setReindexingId(id);
    try {
      await fetch(`/api/admin/knowledge/${id}/reindex`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      loadKnowledge();
    } catch (e) {
      console.error(e);
    } finally {
      setReindexingId(null);
    }
  };

  // Filter items
  const filtered = knowledgeList.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.tags && item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-600" />
            Knowledge Base & RAG Facts
          </h2>
          <p className="text-xs text-slate-500">
            Priority 1 authoritative source of truth. Structured into 18 categories with full version audit logging.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToDocuments && (
            <button
              onClick={onNavigateToDocuments}
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-300 bg-teal-50 px-3.5 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-100 transition-colors"
            >
              <FileUp className="h-4 w-4 text-teal-700" />
              Upload Documents (PDF/TXT)
            </button>
          )}

          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Knowledge Record
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, fact content, skills, or tags..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
          />
        </div>

        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none"
          >
            <option value="all">All Categories ({knowledgeList.length})</option>
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published (Live in RAG)</option>
            <option value="approved">Approved</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Knowledge Cards List */}
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading knowledge records...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-slate-400 mb-2" />
          <p className="text-sm font-medium text-slate-700">No knowledge records found</p>
          <p className="text-xs text-slate-500 mt-1">
            Try adjusting your search filters or click "Add Knowledge Record".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200/60 mb-1">
                      {item.category}
                    </span>
                    <h3 className="text-base font-semibold text-slate-900 leading-snug">
                      {item.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-medium capitalize ${
                        item.status === 'published'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'approved'
                          ? 'bg-blue-100 text-blue-800'
                          : item.status === 'draft'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.status}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
                      v{item.version}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed line-clamp-4 mb-3">
                  {item.content}
                </p>

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600"
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-500">
                <div className="truncate max-w-[200px]" title={item.source}>
                  Source: <span className="font-medium text-slate-700">{item.source}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReindex(item.id)}
                    title="Re-compute vector embedding"
                    disabled={reindexingId === item.id}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  >
                    <RotateCw
                      className={`h-4 w-4 ${reindexingId === item.id ? 'animate-spin text-emerald-600' : ''}`}
                    />
                  </button>

                  <button
                    onClick={() =>
                      setVersionModalData({
                        isOpen: true,
                        id: item.id,
                        title: item.title,
                      })
                    }
                    title="Audit version history"
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                  >
                    <History className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => {
                      setEditingItem(item);
                      setEditChangeSummary('');
                    }}
                    title="Edit record"
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-amber-600 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(item.id, item.title)}
                    title="Delete record"
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Knowledge Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Edit Knowledge Record (v{editingItem.version} → v{editingItem.version + 1})
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={editingItem.category}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        category: e.target.value as KnowledgeCategory,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm"
                  >
                    {ALL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editingItem.status}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        status: e.target.value as KnowledgeStatus,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm"
                  >
                    <option value="published">Published</option>
                    <option value="approved">Approved</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Content Fact
                </label>
                <textarea
                  required
                  rows={5}
                  value={editingItem.content}
                  onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Source Reference
                </label>
                <input
                  type="text"
                  value={editingItem.source}
                  onChange={(e) => setEditingItem({ ...editingItem, source: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Change Summary / Audit Note <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editChangeSummary}
                  onChange={(e) => setEditChangeSummary(e.target.value)}
                  placeholder="e.g. Added details about Google Cloud Data Analytics badge"
                  className="w-full rounded-lg border border-amber-300 bg-amber-50/40 p-2.5 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editChangeSummary.trim()}
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Save & Log Version
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <SaveKnowledgeModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSave={handleCreateKnowledge}
      />

      {/* Version History Modal */}
      <VersionHistoryModal
        isOpen={versionModalData.isOpen}
        onClose={() => setVersionModalData((prev) => ({ ...prev, isOpen: false }))}
        knowledgeId={versionModalData.id}
        knowledgeTitle={versionModalData.title}
        adminToken={adminToken}
      />
    </div>
  );
};
