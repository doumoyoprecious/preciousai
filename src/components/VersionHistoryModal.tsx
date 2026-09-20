import React, { useEffect, useState } from 'react';
import { X, History, Clock, User, ArrowRight } from 'lucide-react';
import type { KnowledgeVersion } from '../types.js';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  knowledgeId: string;
  knowledgeTitle: string;
  adminToken: string;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  knowledgeId,
  knowledgeTitle,
  adminToken,
}) => {
  const [versions, setVersions] = useState<KnowledgeVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !knowledgeId) return;
    setLoading(true);
    fetch(`/api/admin/knowledge/${knowledgeId}/versions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setVersions(data);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [isOpen, knowledgeId, adminToken]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Knowledge Version History</h3>
              <p className="text-xs text-slate-500">
                Auditable changelog for: <span className="font-medium text-slate-800">{knowledgeTitle}</span>
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

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {loading ? (
            <div className="flex justify-center py-8 text-sm text-slate-500">Loading version logs...</div>
          ) : versions.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No previous version entries logged yet.
            </div>
          ) : (
            versions.map((ver, idx) => (
              <div
                key={ver.id}
                className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 transition-all"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-800">
                      v{ver.version}
                    </span>
                    <span className="font-medium text-slate-700">{ver.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {ver.changed_by}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(ver.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="rounded border border-slate-200 bg-white p-3 text-sm text-slate-800 mb-2">
                  {ver.content}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <div>
                    <span className="font-medium text-slate-700">Reason: </span>
                    {ver.change_summary || 'Standard update'}
                  </div>
                  <div className="capitalize">
                    Status: <span className="font-medium text-slate-700">{ver.status}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
