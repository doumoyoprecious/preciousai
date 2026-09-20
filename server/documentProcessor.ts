import { GoogleGenAI } from '@google/genai';
import * as pdfModule from 'pdf-parse';
import { db } from './db.js';
import { getEmbedding } from './rag.js';
import type { KnowledgeCategory, KnowledgeStatus, KnowledgeItem } from '../src/types.js';

const PDFParse = (pdfModule as any).PDFParse || (pdfModule as any).default || pdfModule;

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export const VALID_CATEGORIES: KnowledgeCategory[] = [
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

export interface ExtractedChunk {
  title: string;
  category: KnowledgeCategory;
  tags: string[];
  content: string;
  source: string;
  status: KnowledgeStatus;
}

export interface ProcessDocumentOptions {
  fileName: string;
  fileType: string;
  base64Data?: string;
  rawText?: string;
  processingMode?: 'ai_smart' | 'semantic_chunking';
  defaultCategory?: KnowledgeCategory;
  defaultStatus?: KnowledgeStatus;
  maxChunkSize?: number;
  chunkOverlap?: number;
}

export interface ProcessDocumentResult {
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  extractedTextLength: number;
  textSnippet: string;
  chunks: ExtractedChunk[];
  extractionMethod: string;
}

/**
 * Extract raw text from text or PDF document
 */
export async function extractText(
  fileName: string,
  fileType: string,
  base64Data?: string,
  rawText?: string
): Promise<{ text: string; method: string }> {
  // If raw text provided directly
  if (rawText && rawText.trim().length > 0) {
    return { text: rawText.trim(), method: 'direct_text' };
  }

  if (!base64Data) {
    throw new Error('No document content or base64 data provided');
  }

  const isPdf =
    fileType === 'application/pdf' ||
    fileName.toLowerCase().endsWith('.pdf') ||
    base64Data.startsWith('JVBERi0');

  if (isPdf) {
    const buffer = Buffer.from(base64Data, 'base64');

    // 1. Try local PDF parser first
    try {
      if (typeof PDFParse === 'function') {
        const parser = new PDFParse({ data: buffer });
        if (typeof parser.load === 'function') {
          await parser.load();
        }
        if (typeof parser.getText === 'function') {
          const extracted = await parser.getText();
          if (extracted && extracted.trim().length > 30) {
            return { text: extracted.trim(), method: 'pdf_local_parser' };
          }
        }
      }
    } catch (parseErr) {
      console.warn('Local PDF extraction note:', parseErr);
    }

    // 2. Multimodal Gemini fallback for scanned or complex layout PDFs
    const ai = getAi();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: base64Data,
              },
            },
            {
              text: 'Extract and transcribe all readable text, headings, data tables, and sections from this document thoroughly and accurately.',
            },
          ],
        });
        const geminiExtracted = response.text?.trim();
        if (geminiExtracted && geminiExtracted.length > 20) {
          return { text: geminiExtracted, method: 'gemini_multimodal_ocr' };
        }
      } catch (geminiErr) {
        console.warn('Gemini PDF multimodal fallback note:', geminiErr);
      }
    }

    throw new Error(
      'Could not extract text from the PDF. The file may be empty, encrypted, or password-protected.'
    );
  }

  // Text/Markdown/JSON/CSV/Code
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const text = buffer.toString('utf-8').trim();
    return { text, method: 'utf8_text_decoder' };
  } catch (err: any) {
    throw new Error(`Failed to decode text document: ${err.message}`);
  }
}

/**
 * Split text using semantic markdown headings, paragraphs, and bounded lengths
 */
export function semanticSplit(
  text: string,
  fileName: string,
  defaultCategory: KnowledgeCategory = 'Profile',
  defaultStatus: KnowledgeStatus = 'published',
  maxChunkSize = 1000,
  overlap = 120
): ExtractedChunk[] {
  const clean = text.replace(/\r\n/g, '\n').trim();
  const chunks: ExtractedChunk[] = [];

  // Split by markdown headings or double newlines
  const sections = clean.split(/\n(?=#{1,4}\s+)/g);

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i].trim();
    if (!sec || sec.length < 20) continue;

    // Detect heading
    const firstLineMatch = sec.match(/^#{1,4}\s+(.+)$/m);
    let heading = firstLineMatch ? firstLineMatch[1].trim() : '';

    // If no heading, extract first 50 chars as title
    if (!heading) {
      const lines = sec.split('\n').map((l) => l.trim()).filter(Boolean);
      heading = lines[0]?.slice(0, 60) || `Section ${i + 1}`;
    }

    // Guess category from text content
    let category = defaultCategory;
    const lower = sec.toLowerCase();
    if (lower.includes('education') || lower.includes('degree') || lower.includes('university') || lower.includes('informatics')) {
      category = 'Education';
    } else if (lower.includes('certification') || lower.includes('cisco') || lower.includes('credential')) {
      category = 'Certifications';
    } else if (lower.includes('skill') || lower.includes('technologies') || lower.includes('stack') || lower.includes('programming')) {
      category = 'Skills';
    } else if (lower.includes('web3') || lower.includes('blockchain') || lower.includes('smart contract') || lower.includes('defi')) {
      category = 'Web3';
    } else if (lower.includes('data analytics') || lower.includes('dataset') || lower.includes('visualization') || lower.includes('bi')) {
      category = 'Data Analytics';
    } else if (lower.includes('responsible ai') || lower.includes('ethics') || lower.includes('safety') || lower.includes('alignment')) {
      category = 'Responsible AI';
    } else if (lower.includes('prompt engineering') || lower.includes('system prompt') || lower.includes('rag')) {
      category = 'Prompt Engineering';
    } else if (lower.includes('project') || lower.includes('portfolio') || lower.includes('built')) {
      category = 'Projects';
    } else if (lower.includes('experience') || lower.includes('role') || lower.includes('employment') || lower.includes('career')) {
      category = 'Experience';
    } else if (lower.includes('contact') || lower.includes('email') || lower.includes('reach') || lower.includes('github')) {
      category = 'Contact';
    }

    // If section exceeds maxChunkSize, subdivide with overlap
    if (sec.length > maxChunkSize) {
      let start = 0;
      let subIndex = 1;
      while (start < sec.length) {
        const end = Math.min(start + maxChunkSize, sec.length);
        const subChunkText = sec.slice(start, end).trim();
        if (subChunkText.length >= 30) {
          chunks.push({
            title: `${heading} (Part ${subIndex})`,
            category,
            tags: [fileName.replace(/\.[^/.]+$/, ''), category.toLowerCase(), 'document-ingestion'],
            content: subChunkText,
            source: `Document: ${fileName}`,
            status: defaultStatus,
          });
          subIndex++;
        }
        if (end >= sec.length) break;
        start = end - overlap;
      }
    } else {
      chunks.push({
        title: heading,
        category,
        tags: [fileName.replace(/\.[^/.]+$/, ''), category.toLowerCase(), 'document-ingestion'],
        content: sec,
        source: `Document: ${fileName}`,
        status: defaultStatus,
      });
    }
  }

  // Fallback if no sections were parsed
  if (chunks.length === 0 && clean.length > 0) {
    chunks.push({
      title: `${fileName} - Full Content`,
      category: defaultCategory,
      tags: [fileName.replace(/\.[^/.]+$/, ''), 'document-ingestion'],
      content: clean.slice(0, 1800),
      source: `Document: ${fileName}`,
      status: defaultStatus,
    });
  }

  return chunks;
}

/**
 * Intelligent synthesis into structured RAG knowledge chunks using Gemini
 */
export async function aiSmartChunk(
  text: string,
  fileName: string,
  defaultCategory: KnowledgeCategory = 'Profile',
  defaultStatus: KnowledgeStatus = 'published'
): Promise<ExtractedChunk[]> {
  const ai = getAi();
  if (!ai || !process.env.GEMINI_API_KEY) {
    return semanticSplit(text, fileName, defaultCategory, defaultStatus);
  }

  // Constrain text slice to fit prompt comfortably
  const constrainedText = text.slice(0, 16000);

  const prompt = `You are an expert RAG Knowledge Base Architect for Precious AI (the AI portfolio and knowledge assistant for Precious Doumoyo).

The user uploaded a document: "${fileName}".
Analyze the document text below, identify the distinct factual topics, credentials, projects, or background details, and synthesize them into clean, atomic, self-contained Knowledge Base chunks.

CRITICAL GUIDELINES:
1. Each chunk should cover ONE cohesive topic or section (e.g. A specific certification, education degree, technical skill set, project experience, or bio).
2. Write content in clear, factual language ready for retrieval.
3. Assign each chunk a concise, professional title.
4. Category MUST be exactly one of:
   ${VALID_CATEGORIES.map((c) => `"${c}"`).join(', ')}
5. Generate 2 to 4 relevant keyword tags per chunk.

Return ONLY a valid JSON object matching this schema:
{
  "chunks": [
    {
      "title": "Concise Descriptive Title",
      "category": "Profile | Education | Skills | ...",
      "tags": ["tag1", "tag2"],
      "content": "Detailed, factual content from the document..."
    }
  ]
}

Document Content:
${constrainedText}`;

  for (const model of ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite']) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      });

      const raw = response.text?.trim();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.chunks) && parsed.chunks.length > 0) {
          return parsed.chunks.map((c: any) => {
            const cat = VALID_CATEGORIES.includes(c.category) ? c.category : defaultCategory;
            return {
              title: String(c.title || 'Untitled Knowledge Section').trim(),
              category: cat,
              tags: Array.isArray(c.tags) && c.tags.length > 0
                ? c.tags.map((t: any) => String(t).trim().toLowerCase())
                : [fileName.replace(/\.[^/.]+$/, ''), cat.toLowerCase()],
              content: String(c.content || '').trim(),
              source: `Document: ${fileName}`,
              status: defaultStatus,
            };
          });
        }
      }
    } catch (err) {
      console.warn(`Smart chunking with ${model} note:`, err);
    }
  }

  // If AI generation fails or is throttled, fall back smoothly to semantic splitting
  return semanticSplit(text, fileName, defaultCategory, defaultStatus);
}

/**
 * Master document processor
 */
export async function processDocument(
  options: ProcessDocumentOptions
): Promise<ProcessDocumentResult> {
  const {
    fileName,
    fileType,
    base64Data,
    rawText,
    processingMode = 'ai_smart',
    defaultCategory = 'Profile',
    defaultStatus = 'published',
    maxChunkSize = 1000,
    chunkOverlap = 120,
  } = options;

  const { text, method } = await extractText(fileName, fileType, base64Data, rawText);

  let chunks: ExtractedChunk[] = [];
  if (processingMode === 'ai_smart') {
    chunks = await aiSmartChunk(text, fileName, defaultCategory, defaultStatus);
  } else {
    chunks = semanticSplit(text, fileName, defaultCategory, defaultStatus, maxChunkSize, chunkOverlap);
  }

  const fileSizeBytes = base64Data
    ? Math.round((base64Data.length * 3) / 4)
    : Buffer.byteLength(rawText || '', 'utf-8');

  return {
    fileName,
    fileType,
    fileSizeBytes,
    extractedTextLength: text.length,
    textSnippet: text.slice(0, 350) + (text.length > 350 ? '...' : ''),
    chunks,
    extractionMethod: method,
  };
}

/**
 * Ingests an array of approved chunks into the database and generates vector embeddings
 */
export async function ingestChunksIntoDatabase(
  chunks: ExtractedChunk[],
  author = 'Admin Document Ingestion'
): Promise<KnowledgeItem[]> {
  const ingestedItems: KnowledgeItem[] = [];

  for (const chunk of chunks) {
    if (!chunk.title || !chunk.content) continue;

    // Create knowledge item in DB
    const created = db.createKnowledge(
      {
        title: chunk.title.trim(),
        content: chunk.content.trim(),
        category: chunk.category,
        tags: chunk.tags || [],
        source: chunk.source || 'Document Ingestion',
        status: chunk.status || 'published',
      },
      author
    );

    // Compute embedding vector
    const textToEmbed = `${created.title} ${created.content} ${created.category} ${(created.tags || []).join(' ')}`;
    try {
      const embedding = await getEmbedding(textToEmbed);
      if (embedding) {
        db.updateKnowledge(
          created.id,
          { embedding },
          author,
          'Generated vector embedding from document upload'
        );
        created.embedding = embedding;
      }
    } catch (e) {
      console.warn(`Embedding computation note for ${created.id}:`, e);
    }

    ingestedItems.push(created);
  }

  return ingestedItems;
}
