import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';
import type {
  KnowledgeItem,
  TrainingExample,
  PersonalityExample,
} from '../src/types.js';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
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

// Tokenizer and cosine similarity helper
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

// Cosine similarity for embedding vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(vecA.length, vecB.length);
  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Semantic keyword & synonym mapping for concepts mentioned in prompt
const SYNONYM_MAP: Record<string, string[]> = {
  data: ['analytics', 'cisco', 'dataset', 'statistics', 'analysis', 'analyzing'],
  analyzing: ['data', 'analytics', 'cisco', 'essentials', 'statistics'],
  formal: ['certification', 'academy', 'degree', 'cisco', 'certificate', 'education'],
  pursuing: ['career', 'focus', 'direction', 'direction', 'specializing', 'currently'],
  specialize: ['focus', 'focused', 'competencies', 'skills', 'ai', 'data'],
  study: ['degree', 'education', 'computer', 'science', 'informatics', 'bachelor'],
  studied: ['degree', 'education', 'computer', 'science', 'informatics', 'bachelor'],
  certifications: ['cisco', 'codesignal', 'credentials', 'essentials', 'ethics'],
  certificates: ['cisco', 'codesignal', 'credentials', 'essentials', 'ethics'],
  projects: ['precious ai', 'architecture', 'portfolio', 'evaluations'],
  crypto: ['blockchain', 'web3', 'smart contract'],
  web3: ['blockchain', 'decentralized', 'smart contract'],
  ai: ['training', 'evaluation', 'prompt engineering', 'responsible ai', 'llm'],
};

export function computeLexicalRelevance(query: string, documentText: string): number {
  const queryWords = tokenize(query);
  const docWords = tokenize(documentText);
  if (queryWords.size === 0 || docWords.size === 0) return 0;

  let matches = 0;
  let synonymMatches = 0;

  for (const qWord of queryWords) {
    if (docWords.has(qWord)) {
      matches += 1;
    } else {
      const synonyms = SYNONYM_MAP[qWord] || [];
      for (const syn of synonyms) {
        if (docWords.has(syn)) {
          synonymMatches += 0.75;
          break;
        }
      }
    }
  }

  const queryCoverage = (matches + synonymMatches) / queryWords.size;
  return Math.min(1.0, queryCoverage);
}

// Embedding cache
const embeddingCache = new Map<string, number[]>();

export async function getEmbedding(text: string): Promise<number[] | null> {
  const trimmed = text.slice(0, 1000).trim();
  if (embeddingCache.has(trimmed)) {
    return embeddingCache.get(trimmed)!;
  }

  const ai = getAiClient();
  if (!ai || !process.env.GEMINI_API_KEY) return null;

  try {
    const embedPromise = ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: trimmed,
    });

    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 2500)
    );

    const response = await Promise.race([embedPromise, timeoutPromise]);
    if (!response) return null;

    const rawRes = response as any;
    const embedding = rawRes.embedding?.values || rawRes.embeddings?.[0]?.values || null;
    if (embedding) {
      embeddingCache.set(trimmed, embedding);
    }
    return embedding;
  } catch (err) {
    // If embedding API fails or is throttled, fallback seamlessly to fast lexical & token scoring
    return null;
  }
}

export interface RetrievedKnowledge {
  id: string;
  title: string;
  content: string;
  category: string;
  source: string;
  score: number;
}

export interface RetrievedTraining {
  id: string;
  category: string;
  user_message: string;
  assistant_response: string;
  correction?: string;
  score: number;
}

export interface RetrievedPersonality {
  id: string;
  category: string;
  question: string;
  preferred_response: string;
  score: number;
}

export interface RagResult {
  knowledge: RetrievedKnowledge[];
  trainingExamples: RetrievedTraining[];
  personalityExamples: RetrievedPersonality[];
  sourcesUsed: string[];
}

export async function retrieveRelevantContext(
  query: string,
  limit = 4
): Promise<RagResult> {
  const allKnowledge = db.getKnowledge(false); // only approved / published
  const allTraining = db.getTrainingExamples(true); // only approved
  const allPersonality = db.getPersonalityExamples(true); // only approved

  let queryEmbedding: number[] | null = null;
  try {
    queryEmbedding = await getEmbedding(query);
  } catch (e) {
    // Graceful fallback
  }

  // 1. Score Knowledge
  const scoredKnowledge: RetrievedKnowledge[] = [];
  for (const item of allKnowledge) {
    const docText = `${item.title} ${item.content} ${item.category} ${item.tags.join(' ')}`;
    const lexicalScore = computeLexicalRelevance(query, docText);
    let vectorScore = 0;

    if (queryEmbedding && item.embedding) {
      vectorScore = cosineSimilarity(queryEmbedding, item.embedding);
    }

    const combinedScore = queryEmbedding && item.embedding
      ? 0.4 * lexicalScore + 0.6 * vectorScore
      : lexicalScore;

    if (combinedScore > 0.12 || lexicalScore > 0.15) {
      scoredKnowledge.push({
        id: item.id,
        title: item.title,
        content: item.content,
        category: item.category,
        source: item.source,
        score: combinedScore,
      });
    }
  }

  // 2. Score Training Examples
  const scoredTraining: RetrievedTraining[] = [];
  for (const item of allTraining) {
    const docText = `${item.user_message} ${item.correction || item.assistant_response} ${item.category}`;
    const lexicalScore = computeLexicalRelevance(query, docText);
    if (lexicalScore > 0.15) {
      scoredTraining.push({
        id: item.id,
        category: item.category,
        user_message: item.user_message,
        assistant_response: item.assistant_response,
        correction: item.correction,
        score: lexicalScore,
      });
    }
  }

  // 3. Score Personality Examples
  const scoredPersonality: RetrievedPersonality[] = [];
  for (const item of allPersonality) {
    const docText = `${item.question} ${item.category} ${item.preferred_response}`;
    const lexicalScore = computeLexicalRelevance(query, docText);
    if (lexicalScore > 0.12) {
      scoredPersonality.push({
        id: item.id,
        category: item.category,
        question: item.question,
        preferred_response: item.preferred_response,
        score: lexicalScore,
      });
    }
  }

  scoredKnowledge.sort((a, b) => b.score - a.score);
  scoredTraining.sort((a, b) => b.score - a.score);
  scoredPersonality.sort((a, b) => b.score - a.score);

  const topKnowledge = scoredKnowledge.slice(0, limit);
  const topTraining = scoredTraining.slice(0, 3);
  const topPersonality = scoredPersonality.slice(0, 2);

  const sourcesUsed = topKnowledge.map((k) => `[${k.category}] ${k.title}`);

  return {
    knowledge: topKnowledge,
    trainingExamples: topTraining,
    personalityExamples: topPersonality,
    sourcesUsed,
  };
}

// Prompt injection detector
export function detectPromptInjection(userInput: string): boolean {
  const suspiciousPatterns = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
    /system\s+prompt/i,
    /reveal\s+(your\s+)?database/i,
    /dump\s+(the\s+)?database/i,
    /show\s+secret\s+keys/i,
    /drop\s+table/i,
    /pretend\s+you\s+are\s+dan/i,
    /override\s+system\s+rules/i,
    /you\s+are\s+now\s+in\s+developer\s+mode/i,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(userInput));
}
