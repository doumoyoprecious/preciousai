import React, { useState } from 'react';
import { X, BookOpen, Check } from 'lucide-react';
import type { KnowledgeCategory, KnowledgeStatus } from '../types.js';

interface SaveKnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent?: string;
  initialCategory?: KnowledgeCategory;
  onSave: (data: {
    title: string;
    content: string;
    category: KnowledgeCategory;
    source: string;
    status: KnowledgeStatus;
    tags: string[];
  }) => Promise<void>;
}

export const SaveKnowledgeModal: React.FC<SaveKnowledgeModalProps> = ({
  isOpen,
  onClose,
  initialContent = '',
  initialCategory = 'Profile',
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(initialContent);
  const [category, setCategory] = useState<KnowledgeCategory>(initialCategory);
  const [source, setSource] = useState('Admin Ingestion');
  const [status, setStatus] = useState<KnowledgeStatus>('published');
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync initial content if modal reopens
  React.useEffect(() => {
    if (initialContent) setContent(initialContent);
    if (initialCategory) setCategory(initialCategory);
  }, [initialContent, initialCategory, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    try {
      const tags = tagInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      await onSave({
        title: title.trim(),
        content: content.trim(),
        category,
        source: source.trim() || 'Admin Ingestion',
        status,
        tags,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Save to Knowledge Base</h3>
              <p className="text-xs text-slate-500">
                Permanent facts used as Priority 1 in Precious AI's RAG system
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. CodeSignal AI Ethics Credential"
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as KnowledgeCategory)}
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
              >
                <option value="Profile">Profile</option>
                <option value="Education">Education</option>
                <option value="Skills">Skills</option>
                <option value="AI">AI</option>
                <option value="Prompt Engineering">Prompt Engineering</option>
                <option value="Responsible AI">Responsible AI</option>
                <option value="Data Analytics">Data Analytics</option>
                <option value="Blockchain">Blockchain</option>
                <option value="Web3">Web3</option>
                <option value="Certifications">Certifications</option>
                <option value="Projects">Projects</option>
                <option value="Career">Career</option>
                <option value="Experience">Experience</option>
                <option value="Services">Services</option>
                <option value="FAQs">FAQs</option>
                <option value="Contact">Contact</option>
                <option value="Professional Preferences">Professional Preferences</option>
                <option value="Communication Style">Communication Style</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as KnowledgeStatus)}
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
              >
                <option value="published">Published (Live for Public AI)</option>
                <option value="approved">Approved (Verified internally)</option>
                <option value="draft">Draft (Private admin review)</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Knowledge Content <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter verified, accurate information about Precious Doumoyo..."
              className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Source Document / Citation
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. Cisco Certificate ID, Portfolio"
                className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Keywords / Tags
              </label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="cisco, data, analytics"
                className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || !content.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Knowledge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
