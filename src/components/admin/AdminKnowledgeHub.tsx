import React, { useState } from 'react';
import {
  BookOpen,
  FileUp,
  Smile,
  ListTodo,
  CheckCircle2,
  Terminal,
} from 'lucide-react';
import { KnowledgeManager } from './KnowledgeManager.js';
import { DocumentUploadManager } from './DocumentUploadManager.js';
import { PersonalityManager } from './PersonalityManager.js';
import { TrainingQueue } from './TrainingQueue.js';
import { AIEvaluation } from './AIEvaluation.js';
import { AdminTrainingChat } from './AdminTrainingChat.js';

interface AdminKnowledgeHubProps {
  adminToken: string;
}

type SubTab = 'knowledge' | 'documents' | 'personality' | 'training' | 'evaluation' | 'chat';

export const AdminKnowledgeHub: React.FC<AdminKnowledgeHubProps> = ({ adminToken }) => {
  const [subTab, setSubTab] = useState<SubTab>('knowledge');

  const tabs: Array<{ id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
    { id: 'documents', label: 'Document Ingestion', icon: FileUp },
    { id: 'personality', label: 'Personality & Tone', icon: Smile },
    { id: 'training', label: 'Training Queue', icon: ListTodo },
    { id: 'evaluation', label: 'AI Evaluation', icon: CheckCircle2 },
    { id: 'chat', label: 'Training Chat', icon: Terminal },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 sm:p-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Knowledge & RAG Management
        </h1>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Manage ground-truth data, documents, response personality, and AI model alignment.
        </p>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex flex-wrap gap-1 border-b border-zinc-200/80 pb-2 dark:border-zinc-800">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-Tab Content */}
      <div className="pt-2">
        {subTab === 'knowledge' && (
          <KnowledgeManager
            adminToken={adminToken}
            onNavigateToDocuments={() => setSubTab('documents')}
          />
        )}
        {subTab === 'documents' && <DocumentUploadManager adminToken={adminToken} />}
        {subTab === 'personality' && <PersonalityManager adminToken={adminToken} />}
        {subTab === 'training' && <TrainingQueue adminToken={adminToken} />}
        {subTab === 'evaluation' && <AIEvaluation adminToken={adminToken} />}
        {subTab === 'chat' && <AdminTrainingChat adminToken={adminToken} />}
      </div>
    </div>
  );
};
