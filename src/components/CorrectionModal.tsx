import React, { useState } from 'react';
import { X, Check, BookOpen, Brain, Sparkles } from 'lucide-react';
import type { KnowledgeCategory, PersonalityCategory } from '../types.js';

interface CorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userMessage: string;
  assistantResponse: string;
  onSaveCorrection: (data: {
    correction: string;
    saveAsTraining: boolean;
    saveAsKnowledge: boolean;
    category: KnowledgeCategory;
    knowledgeTitle?: string;
  }) => Promise<void>;
}

export const CorrectionModal: React.FC<CorrectionModalProps> = ({
  isOpen,
  onClose,
  userMessage,
  assistantResponse,
  onSaveCorrection,
}) => {
  const [correction, setCorrection] = useState('');
  const [saveAsTraining, setSaveAsTraining] = useState(true);
  const [saveAsKnowledge, setSaveAsKnowledge] = useState(false);
  const [category, setCategory] = useState<KnowledgeCategory>('Profile');
  const [knowledgeTitle, setKnowledgeTitle] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correction.trim()) return;
    setLoading(true);
    try {
      await onSaveCorrection({
        correction: correction.trim(),
        saveAsTraining,
        saveAsKnowledge,
        category,
        knowledgeTitle: knowledgeTitle.trim() || `Correction: ${userMessage.slice(0, 30)}`,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800 font-semibold">
              ✏️
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Correct AI Response</h3>
              <p className="text-xs text-slate-500">
                Teach Precious AI what response it should have produced
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              User Question / Prompt
            </label>
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-800 border border-slate-200">
              "{userMessage}"
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              AI Output (What needs correction)
            </label>
            <div className="rounded-lg bg-rose-50/60 p-3 text-sm text-slate-700 border border-rose-200 line-clamp-3">
              {assistantResponse}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Accurate Preferred Response <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={correction}
              onChange={(e) => setCorrection(e.target.value)}
              required
              rows={4}
              placeholder="Enter the precise, approved information Precious AI should communicate..."
              className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as KnowledgeCategory)}
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-800 focus:border-indigo-600 focus:outline-none"
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

            {saveAsKnowledge && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Knowledge Title
                </label>
                <input
                  type="text"
                  value={knowledgeTitle}
                  onChange={(e) => setKnowledgeTitle(e.target.value)}
                  placeholder="e.g. Current Career Focus"
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-800 focus:border-indigo-600 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
            <label className="flex items-center gap-2.5 text-sm font-medium text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={saveAsTraining}
                onChange={(e) => setSaveAsTraining(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <Brain className="h-4 w-4 text-indigo-600" />
              Save as Approved Training Example (Influence future similar queries)
            </label>

            <label className="flex items-center gap-2.5 text-sm font-medium text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={saveAsKnowledge}
                onChange={(e) => setSaveAsKnowledge(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <BookOpen className="h-4 w-4 text-emerald-600" />
              Save as Permanent Knowledge Record (Priority 1 in RAG)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !correction.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save & Teach AI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
