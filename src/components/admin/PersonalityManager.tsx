import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, CheckCircle2, Trash2, Edit2, Play, MessageSquare } from 'lucide-react';
import type { PersonalityExample, PersonalityCategory } from '../../types.js';
import { SavePersonalityModal } from '../SavePersonalityModal.js';

interface PersonalityManagerProps {
  adminToken: string;
}

const CATEGORIES: PersonalityCategory[] = [
  'Greeting',
  'Professional communication',
  'Casual communication',
  'Explanation style',
  'Response length',
  'Vocabulary',
  'Emoji usage',
  'Nigerian English preferences',
  'International professional English',
  'Humor',
  'Refusal style',
  'Unknown-answer style',
];

export const PersonalityManager: React.FC<PersonalityManagerProps> = ({ adminToken }) => {
  const [examples, setExamples] = useState<PersonalityExample[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PersonalityExample | null>(null);

  // Quick test playground
  const [testQuestion, setTestQuestion] = useState('How are you doing today?');
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const loadExamples = async () => {
    try {
      const res = await fetch('/api/admin/personality-examples', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      setExamples(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setExamples([]);
    }
  };

  useEffect(() => {
    loadExamples();
  }, []);

  const handleSave = async (data: any) => {
    try {
      await fetch('/api/admin/personality-examples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(data),
      });
      loadExamples();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleApproved = async (id: string, current: boolean) => {
    try {
      await fetch(`/api/admin/personality-examples/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ approved: !current }),
      });
      loadExamples();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this personality example?')) return;
    try {
      await fetch(`/api/admin/personality-examples/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      loadExamples();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunTest = async () => {
    if (!testQuestion.trim() || testing) return;
    setTesting(true);
    setTestResponse(null);
    try {
      const res = await fetch('/api/admin/training/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ message: testQuestion }),
      });
      const data = await res.json();
      setTestResponse(data.message?.text || 'No response generated');
    } catch (e) {
      setTestResponse('Error running test.');
    } finally {
      setTesting(false);
    }
  };

  const filtered = (Array.isArray(examples) ? examples : []).filter((item) =>
    selectedCategory === 'all' ? true : item.category === selectedCategory
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Personality & Communication Style
          </h2>
          <p className="text-xs text-slate-500">
            Define Precious AI's tone, authentic phrasing, warmth, humor boundaries, and communication preferences.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Style Example
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            selectedCategory === 'all'
              ? 'bg-purple-100 font-semibold text-purple-900'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          All Categories ({examples.length})
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              selectedCategory === cat
                ? 'bg-purple-100 font-semibold text-purple-900'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid of Examples */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-2xs"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-800 border border-purple-200/60">
                  {item.category}
                </span>
                <button
                  onClick={() => handleToggleApproved(item.id, item.approved)}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    item.approved
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {item.approved ? 'Active' : 'Draft'}
                </button>
              </div>

              <div className="mb-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                  When Asked:
                </span>
                <p className="text-sm font-medium text-slate-900 bg-slate-50 p-2 rounded-lg border border-slate-200/70">
                  "{item.question}"
                </p>
              </div>

              <div className="mb-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                  Preferred Tone & Response:
                </span>
                <p className="text-sm text-slate-700 bg-purple-50/40 p-2.5 rounded-lg border border-purple-100 whitespace-pre-wrap">
                  {item.preferred_response}
                </p>
              </div>

              {item.notes && (
                <p className="text-xs text-slate-400 italic">Guideline: {item.notes}</p>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => handleDelete(item.id)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition-colors"
                title="Delete example"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Live Voice & Style Test Sandbox */}
      <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50/50 to-white p-5 shadow-2xs">
        <div className="flex items-center gap-2 mb-3">
          <Play className="h-4 w-4 text-purple-700" />
          <h3 className="text-sm font-bold text-slate-900">Test Personality & Tone</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            type="text"
            value={testQuestion}
            onChange={(e) => setTestQuestion(e.target.value)}
            placeholder="Type a greeting or question to inspect style..."
            className="flex-1 rounded-lg border border-slate-300 p-2.5 text-sm bg-white"
          />
          <button
            onClick={handleRunTest}
            disabled={testing || !testQuestion.trim()}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {testing ? 'Testing...' : 'Test Response'}
          </button>
        </div>

        {testResponse && (
          <div className="rounded-lg border border-purple-200 bg-white p-4 text-sm text-slate-800">
            <span className="font-semibold text-purple-800 block text-xs mb-1">
              Generated Personality Output:
            </span>
            {testResponse}
          </div>
        )}
      </div>

      <SavePersonalityModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
};
