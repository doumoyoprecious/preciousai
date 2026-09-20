import React, { useState, useEffect, useRef } from 'react';
import {
  FileUp,
  UploadCloud,
  FileText,
  FileCode,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Layers,
  Database,
  Search,
  Trash2,
  RefreshCw,
  Eye,
  Sliders,
  Tag,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { KnowledgeCategory, KnowledgeStatus } from '../../types.js';

interface DocumentUploadManagerProps {
  adminToken: string;
  onNavigateToKnowledge?: () => void;
  onNavigateToTraining?: () => void;
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

interface ExtractedChunk {
  title: string;
  category: KnowledgeCategory;
  tags: string[];
  content: string;
  source: string;
  status: KnowledgeStatus;
  selected?: boolean;
}

interface IngestedDocSource {
  name: string;
  chunkCount: number;
  primaryCategory: string;
  latestDate: string;
}

export const DocumentUploadManager: React.FC<DocumentUploadManagerProps> = ({
  adminToken,
  onNavigateToKnowledge,
  onNavigateToTraining,
}) => {
  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [fileRawText, setFileRawText] = useState<string>('');

  // Processing configuration
  const [processingMode, setProcessingMode] = useState<'ai_smart' | 'semantic_chunking'>('ai_smart');
  const [defaultCategory, setDefaultCategory] = useState<KnowledgeCategory>('Profile');
  const [targetStatus, setTargetStatus] = useState<KnowledgeStatus>('published');
  const [maxChunkSize, setMaxChunkSize] = useState<number>(1000);
  const [chunkOverlap, setChunkOverlap] = useState<number>(120);

  // In-flight states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Extracted preview
  const [extractedSnippet, setExtractedSnippet] = useState<string>('');
  const [extractionMethod, setExtractionMethod] = useState<string>('');
  const [chunks, setChunks] = useState<ExtractedChunk[]>([]);
  const [expandedPreview, setExpandedPreview] = useState(false);

  // Stats & Ingestion history
  const [stats, setStats] = useState<{
    totalDocumentChunks: number;
    totalKnowledgeItems: number;
    distinctDocumentsCount: number;
    sources: IngestedDocSource[];
  } | null>(null);

  // Interactive Test Query
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState<any[] | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/documents/stats', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.warn('Failed to load document stats:', e);
    }
  };

  useEffect(() => {
    loadStats();
  }, [adminToken]);

  const handleFileSelection = (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setChunks([]);
    setExtractedSnippet('');
    setSelectedFile(file);

    const isTextFile =
      file.type.startsWith('text/') ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.json') ||
      file.name.endsWith('.csv');

    const reader = new FileReader();

    if (isTextFile) {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setFileRawText(text);
        setFileBase64(btoa(unescape(encodeURIComponent(text))));
      };
      reader.readAsText(file);
    } else {
      // PDF or binary
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // Strip data:application/pdf;base64, prefix
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        setFileBase64(base64);
        setFileRawText('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleProcessDocument = async () => {
    if (!selectedFile) {
      setErrorMsg('Please select a file to process');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/documents/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type || 'text/plain',
          base64Data: fileBase64,
          rawText: fileRawText,
          processingMode,
          defaultCategory,
          defaultStatus: targetStatus,
          maxChunkSize,
          chunkOverlap,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process document');
      }

      setExtractedSnippet(data.textSnippet || '');
      setExtractionMethod(data.extractionMethod || 'default');
      setChunks(
        (data.chunks || []).map((c: ExtractedChunk) => ({
          ...c,
          selected: true,
        }))
      );
      setSuccessMsg(
        `Successfully extracted and chunked ${data.chunks.length} knowledge items from "${selectedFile.name}" using ${data.extractionMethod}!`
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing document');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleIngestSelected = async () => {
    const selectedChunks = chunks.filter((c) => c.selected);
    if (selectedChunks.length === 0) {
      setErrorMsg('Please select at least one chunk to ingest into the knowledge base');
      return;
    }

    setIsIngesting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/documents/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          chunks: selectedChunks,
          author: 'Admin Document Uploader',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to ingest chunks');
      }

      setSuccessMsg(
        `Successfully ingested ${data.ingestedCount} chunks into Precious AI RAG knowledge base with vector embeddings!`
      );
      // Remove ingested chunks from staging
      setChunks([]);
      setSelectedFile(null);
      setFileBase64('');
      setFileRawText('');
      loadStats();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error ingesting chunks');
    } finally {
      setIsIngesting(false);
    }
  };

  const handleTestQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim()) return;

    setIsTesting(true);
    try {
      const res = await fetch('/api/admin/knowledge', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const all: any[] = await res.json();
      const q = testQuery.toLowerCase().trim();
      const matched = all
        .filter(
          (k) =>
            k.title.toLowerCase().includes(q) ||
            k.content.toLowerCase().includes(q) ||
            k.tags.some((t: string) => t.toLowerCase().includes(q))
        )
        .slice(0, 4);
      setTestResults(matched);
    } catch (err) {
      console.warn('Test query error:', err);
    } finally {
      setIsTesting(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-indigo-100 bg-linear-to-r from-indigo-50/70 via-white to-purple-50/60 p-6 shadow-2xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                <FileUp className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Document Ingestion & RAG Knowledge Builder
              </h1>
            </div>
            <p className="text-sm text-slate-600 max-w-2xl">
              Upload PDF documents, resumes, certifications, project documentation, or markdown notes to extract, chunk, and embed them directly into Precious AI's vector retrieval system.
            </p>
          </div>

          {/* Quick Stats Badges */}
          {stats && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-center shadow-2xs">
                <span className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Ingested Docs
                </span>
                <span className="text-base font-bold text-slate-900">
                  {stats.distinctDocumentsCount}
                </span>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3.5 py-2 text-center shadow-2xs">
                <span className="block text-[11px] font-medium text-emerald-800 uppercase tracking-wider">
                  Doc Chunks in RAG
                </span>
                <span className="text-base font-bold text-emerald-700">
                  {stats.totalDocumentChunks}
                </span>
              </div>
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 px-3.5 py-2 text-center shadow-2xs">
                <span className="block text-[11px] font-medium text-indigo-800 uppercase tracking-wider">
                  Total Knowledge Base
                </span>
                <span className="text-base font-bold text-indigo-700">
                  {stats.totalKnowledgeItems}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          {onNavigateToKnowledge && (
            <button
              onClick={onNavigateToKnowledge}
              className="flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
            >
              View in Knowledge Base <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload Zone & Configuration (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Upload Dropzone */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <UploadCloud className="h-4 w-4 text-indigo-600" />
              Upload Source Document
            </h2>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                  : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md,.markdown,.json,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileSelection(e.target.files[0]);
                  }
                }}
              />

              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 mb-3">
                <FileUp className="h-6 w-6" />
              </div>

              <p className="text-sm font-semibold text-slate-800">
                Click to upload or drag & drop document
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports PDF, TXT, Markdown, JSON, or CSV (up to 25MB)
              </p>
            </div>

            {/* Selected File Details */}
            {selectedFile && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {selectedFile.name.endsWith('.pdf') ? (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-700 font-bold text-xs">
                        PDF
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700 font-bold text-xs">
                        TXT
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatBytes(selectedFile.size)} • {selectedFile.type || 'Plain Text'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setFileBase64('');
                      setFileRawText('');
                      setChunks([]);
                      setExtractedSnippet('');
                    }}
                    className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-red-600 transition-colors"
                    title="Remove file"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {fileRawText && (
                  <button
                    onClick={() => setExpandedPreview(!expandedPreview)}
                    className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:underline"
                  >
                    <Eye className="h-3 w-3" />
                    {expandedPreview ? 'Hide File Content Preview' : 'Preview File Raw Text'}
                  </button>
                )}

                {expandedPreview && fileRawText && (
                  <div className="rounded bg-white p-3 border border-slate-200 text-xs font-mono text-slate-700 max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {fileRawText.slice(0, 1500)}
                    {fileRawText.length > 1500 && '... (truncated)'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Processing Configuration */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-indigo-600" />
              Ingestion & Chunking Strategy
            </h2>

            {/* Mode selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Extraction & Synthesis Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setProcessingMode('ai_smart')}
                  className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                    processingMode === 'ai_smart'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-1 ring-indigo-600'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-xs font-bold">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                    AI Smart Synthesis
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">
                    Gemini extracts semantic sections, titles, and auto-tags for optimal RAG retrieval.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setProcessingMode('semantic_chunking')}
                  className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                    processingMode === 'semantic_chunking'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-1 ring-indigo-600'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-xs font-bold">
                    <Layers className="h-3.5 w-3.5 text-indigo-600" />
                    Heading & Paragraph
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">
                    Splits by markdown headings, paragraphs, and bounded lengths with context overlap.
                  </span>
                </button>
              </div>
            </div>

            {/* Default Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Default Target Category
              </label>
              <select
                value={defaultCategory}
                onChange={(e) => setDefaultCategory(e.target.value as KnowledgeCategory)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Initial Knowledge Status
              </label>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="targetStatus"
                    value="published"
                    checked={targetStatus === 'published'}
                    onChange={() => setTargetStatus('published')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Published (Live in RAG immediately)</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="targetStatus"
                    value="draft"
                    checked={targetStatus === 'draft'}
                    onChange={() => setTargetStatus('draft')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Draft (Stage for review)</span>
                </label>
              </div>
            </div>

            {/* Semantic chunk size options */}
            {processingMode === 'semantic_chunking' && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block">
                    Max Chunk Size (chars)
                  </label>
                  <input
                    type="number"
                    min={300}
                    max={3000}
                    step={100}
                    value={maxChunkSize}
                    onChange={(e) => setMaxChunkSize(Number(e.target.value))}
                    className="mt-1 w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block">
                    Chunk Overlap (chars)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={400}
                    step={20}
                    value={chunkOverlap}
                    onChange={(e) => setChunkOverlap(Number(e.target.value))}
                    className="mt-1 w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800"
                  />
                </div>
              </div>
            )}

            {/* Process Action Button */}
            <button
              onClick={handleProcessDocument}
              disabled={!selectedFile || isProcessing}
              className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-all ${
                !selectedFile || isProcessing
                  ? 'bg-indigo-300 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99]'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Analyzing & Chunking Document...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Process Document & Preview Chunks</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Extracted Chunks & Ingestion Action (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Chunks Staging List */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Database className="h-4 w-4 text-emerald-600" />
                  Staged RAG Chunks ({chunks.length})
                </h2>
                {extractionMethod && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Extraction method: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">{extractionMethod}</code>
                  </p>
                )}
              </div>

              {chunks.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allSelected = chunks.every((c) => c.selected);
                      setChunks(chunks.map((c) => ({ ...c, selected: !allSelected })));
                    }}
                    className="text-xs font-medium text-slate-600 hover:text-indigo-600 px-2 py-1"
                  >
                    {chunks.every((c) => c.selected) ? 'Deselect All' : 'Select All'}
                  </button>

                  <button
                    type="button"
                    onClick={handleIngestSelected}
                    disabled={isIngesting || chunks.filter((c) => c.selected).length === 0}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed transition-all"
                  >
                    {isIngesting ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Ingesting & Embedding...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>
                          Ingest Selected ({chunks.filter((c) => c.selected).length})
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Empty state */}
            {chunks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                <FileText className="h-10 w-10 text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-600">
                  No document chunks staged yet
                </p>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Upload a PDF or text document on the left and click "Process Document" to generate structured RAG knowledge items.
                </p>
              </div>
            )}

            {/* Chunks List */}
            {chunks.length > 0 && (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {chunks.map((chunk, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl border p-4 space-y-2.5 transition-all ${
                      chunk.selected
                        ? 'border-indigo-200 bg-white shadow-2xs ring-1 ring-indigo-500/10'
                        : 'border-slate-200 bg-slate-50/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="checkbox"
                          checked={Boolean(chunk.selected)}
                          onChange={(e) => {
                            const updated = [...chunks];
                            updated[idx].selected = e.target.checked;
                            setChunks(updated);
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-0.5"
                        />
                        <input
                          type="text"
                          value={chunk.title}
                          onChange={(e) => {
                            const updated = [...chunks];
                            updated[idx].title = e.target.value;
                            setChunks(updated);
                          }}
                          className="flex-1 font-semibold text-xs text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent py-0.5"
                          placeholder="Chunk title..."
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={chunk.category}
                          onChange={(e) => {
                            const updated = [...chunks];
                            updated[idx].category = e.target.value as KnowledgeCategory;
                            setChunks(updated);
                          }}
                          className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                        >
                          {ALL_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            setChunks(chunks.filter((_, i) => i !== idx));
                          }}
                          className="rounded p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100"
                          title="Discard chunk"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={3}
                      value={chunk.content}
                      onChange={(e) => {
                        const updated = [...chunks];
                        updated[idx].content = e.target.value;
                        setChunks(updated);
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                    />

                    {/* Tags preview */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <Tag className="h-3 w-3 text-slate-400" />
                      {chunk.tags.map((t, tidx) => (
                        <span
                          key={tidx}
                          className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                        >
                          #{t}
                        </span>
                      ))}
                      <span className="text-[10px] text-slate-400 italic ml-auto">
                        {chunk.content.length} chars
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Test Assistant Knowledge Retrieval */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Search className="h-4 w-4 text-indigo-600" />
              Verify Document Retrieval in Knowledge Base
            </h2>

            <form onSubmit={handleTestQuery} className="flex gap-2">
              <input
                type="text"
                placeholder="Test query: e.g. Cisco certification, research background, Web3..."
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isTesting || !testQuery.trim()}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-all"
              >
                {isTesting ? 'Searching...' : 'Test Search'}
              </button>
            </form>

            {testResults && (
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Search Results ({testResults.length} matches):
                </span>
                {testResults.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    No matching items found for "{testQuery}". Try ingesting documents or refining keywords.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {testResults.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">{item.title}</span>
                          <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-slate-600 line-clamp-2">{item.content}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1">
                          <span>Source: {item.source}</span>
                          <span>•</span>
                          <span>Status: {item.status}</span>
                          {item.embedding && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-600 font-medium">Vector Embedded</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ingested Documents History */}
          {stats && stats.sources.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <FileCode className="h-4 w-4 text-slate-500" />
                Ingested Document Catalog ({stats.sources.length})
              </h2>

              <div className="divide-y divide-slate-100">
                {stats.sources.map((src, i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-800 block truncate max-w-xs sm:max-w-md">
                        {src.name}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Category: {src.primaryCategory} • Last updated:{' '}
                        {new Date(src.latestDate).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                        {src.chunkCount} RAG chunks
                      </span>

                      {onNavigateToKnowledge && (
                        <button
                          onClick={onNavigateToKnowledge}
                          className="text-indigo-600 hover:text-indigo-800 p-1"
                          title="View in Knowledge Base"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
