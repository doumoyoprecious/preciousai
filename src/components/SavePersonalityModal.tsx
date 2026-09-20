import React, { useState } from 'react';
import { X, Sparkles, Check } from 'lucide-react';
import type { PersonalityCategory } from '../types.js';

interface SavePersonalityModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuestion?: string;
  initialResponse?: string;
  onSave: (data: {
    category: PersonalityCategory;
    question: string;
    preferred_response: string;
    notes?: string;
  }) => Promise<void>;
}

export const SavePersonalityModal: React.FC<SavePersonalityModalProps> = ({
  isOpen,
  onClose,
  initialQuestion = '',
  initialResponse = '',
  onSave,
}) => {
  const [category, setCategory] = useState<PersonalityCategory>('Greeting');
  const [question, setQuestion] = useState(initialQuestion);
  const [preferredResponse, setPreferredResponse] = useState(initialResponse);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (initialQuestion) setQuestion(initialQuestion);
    if (initialResponse) setPreferredResponse(initialResponse);
  }, [initialQuestion, initialResponse, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !preferredResponse.trim()) return;
    setLoading(true);
    try {
      await onSave({
        category,
        question: question.trim(),
        preferred_response: preferredResponse.trim(),
        notes: notes.trim(),
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Save as Personality Example</h3>
              <p className="text-xs text-slate-500">
                Teach Precious AI voice, tone, and communication style
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
              Personality Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as PersonalityCategory)}
              className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 focus:border-purple-600 focus:outline-none"
            >
              <option value="Greeting">Greeting</option>
              <option value="Professional communication">Professional communication</option>
              <option value="Casual communication">Casual communication</option>
              <option value="Explanation style">Explanation style</option>
              <option value="Response length">Response length</option>
              <option value="Vocabulary">Vocabulary</option>
              <option value="Emoji usage">Emoji usage</option>
              <option value="Nigerian English preferences">Nigerian English preferences</option>
              <option value="International professional English">International professional English</option>
              <option value="Humor">Humor</option>
              <option value="Refusal style">Refusal style</option>
              <option value="Unknown-answer style">Unknown-answer style</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Trigger Scenario / Question
            </label>
            <input
              type="text"
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Tell me about yourself."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-purple-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Preferred Response & Tone
            </label>
            <textarea
              required
              rows={4}
              value={preferredResponse}
              onChange={(e) => setPreferredResponse(e.target.value)}
              placeholder="e.g. I'm Precious AI, an AI assistant representing Precious Doumoyo..."
              className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 focus:border-purple-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Admin Notes (Optional guidance)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Demonstrates respectful tone with authentic identity disclaimer"
              className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900 focus:border-purple-600 focus:outline-none"
            />
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
              disabled={loading || !question.trim() || !preferredResponse.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Style Example'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
