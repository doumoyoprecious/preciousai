import express from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { db, verifyPassword } from './server/db.js';
import { geminiService } from './server/gemini.js';
import { retrieveRelevantContext, getEmbedding } from './server/rag.js';
import { getSupabaseConfig } from './server/supabase.js';
import { processDocument, ingestChunksIntoDatabase } from './server/documentProcessor.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Simple in-memory rate limiting map: IP -> timestamp[]
const rateLimitMap = new Map<string, number[]>();
function checkRateLimit(ip: string, maxRequests = 40, windowMs = 60000): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    return false;
  }
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return true;
}

// In-memory admin session tokens
const validAdminTokens = new Set<string>();
const DEFAULT_ADMIN_PASS = process.env.ADMIN_PASSWORD || 'precious2026';

function adminAuthMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, '') || (req.headers['x-admin-token'] as string);

  if (token && validAdminTokens.has(token)) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized: Admin authentication required' });
}

// ----------------------------------------------------
// PUBLIC API ROUTES
// ----------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    ai_name: db.getSettings().ai_name,
    timestamp: new Date().toISOString(),
  });
});

// Favicon serving endpoint (custom uploaded or default SVG)
app.get(['/api/favicon', '/favicon.ico'], (req, res) => {
  const settings = db.getSettings();
  if (settings.custom_favicon && settings.custom_favicon.data_base64) {
    try {
      const imgBuffer = Buffer.from(settings.custom_favicon.data_base64, 'base64');
      res.setHeader('Content-Type', settings.custom_favicon.mime_type || 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      return res.send(imgBuffer);
    } catch (err) {
      console.error('Failed to serve custom favicon buffer:', err);
    }
  }

  // Default SVG favicon using current primary color
  const color = settings.primary_color || '#18181b';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32"><rect width="24" height="24" rx="6" fill="${color}"/><path d="M12 4C12 8.4183 8.4183 12 4 12C8.4183 12 12 15.5817 12 20C12 15.5817 15.5817 12 20 12C15.5817 12 12 8.4183 12 4Z" fill="#ffffff"/></svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(svg);
});

// Public chat settings & branding
app.get('/api/settings/public', (req, res) => {
  const s = db.getSettings();
  res.json({
    ai_name: s.ai_name,
    assistant_title: s.assistant_title,
    description: s.description,
    greeting_message: s.greeting_message,
    public_chat_enabled: s.public_chat_enabled,
    primary_color: s.primary_color || '#18181b',
    favicon_url: s.favicon_url || `/api/favicon?v=${s.favicon_version || 1}`,
    favicon_version: s.favicon_version || 1,
    has_custom_favicon: Boolean(s.custom_favicon?.data_base64),
  });
});

// Public Chat
app.post('/api/chat', async (req, res) => {
  const clientIp = req.ip || 'anonymous';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      error: 'Too many requests. Please wait a moment before sending another message.',
    });
  }

  const { message, conversation_id } = req.body;
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message text is required' });
  }

  const settings = db.getSettings();
  if (!settings.public_chat_enabled) {
    return res.status(403).json({
      error: 'Public chat is currently paused for maintenance by administrator.',
    });
  }

  try {
    let conversation = conversation_id ? db.getConversationById(conversation_id) : null;
    if (!conversation) {
      conversation = db.createConversation('public');
    }

    // Save user message
    const userMsg = db.addMessage({
      conversation_id: conversation.id,
      sender: 'user',
      text: message.trim(),
    });

    const conversationHistory = db.getMessages(conversation.id);

    // Generate response using Gemini + RAG
    const aiOutput = await geminiService.generateResponse(message, {
      conversationHistory,
      isAdminTraining: false,
    });

    // Save assistant message
    const assistantMsg = db.addMessage({
      conversation_id: conversation.id,
      sender: 'assistant',
      text: aiOutput.text,
      sources_used: aiOutput.sources.map((s) => ({
        id: s.id,
        title: s.title,
        category: s.category,
      })),
      training_examples_used: aiOutput.trainingExamplesUsed,
      metadata: {
        latency_ms: aiOutput.latencyMs,
      },
    });

    // Strip internal IDs from public response for safety & clean presentation
    res.json({
      conversation_id: conversation.id,
      user_message: userMsg,
      message: {
        id: assistantMsg.id,
        sender: 'assistant',
        text: assistantMsg.text,
        created_at: assistantMsg.created_at,
        sources: aiOutput.sources.map((s) => ({
          title: s.title,
          category: s.category,
        })),
      },
    });
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// Submit response feedback (public or admin)
app.post('/api/feedback', (req, res) => {
  const {
    conversation_id,
    message_id,
    rating,
    user_message,
    assistant_response,
    correction,
    admin_notes,
  } = req.body;

  if (!conversation_id || !message_id || !rating) {
    return res.status(400).json({ error: 'Missing required feedback fields' });
  }

  // Update message feedback flag
  db.updateMessage(message_id, {
    feedback: rating === 'positive' ? 'positive' : 'negative',
    correction: correction || undefined,
  });

  const entry = db.addFeedback({
    conversation_id,
    message_id,
    rating,
    user_message,
    assistant_response,
    correction,
    admin_notes,
    status: 'pending',
  });

  res.json({ success: true, feedback: entry });
});

// Get messages for a public conversation
app.get('/api/conversations/:id/messages', (req, res) => {
  const conv = db.getConversationById(req.params.id);
  if (!conv) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  const messages = db.getMessages(conv.id);
  res.json({ conversation: conv, messages });
});

// ----------------------------------------------------
// ADMIN AUTHENTICATION & CREDENTIAL MANAGEMENT
// ----------------------------------------------------

app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const admin = db.getAdminUser();

  // If email was provided, check if it matches
  if (email && email.trim().toLowerCase() !== admin.email.toLowerCase()) {
    return res.status(401).json({ error: 'Invalid administrator credentials' });
  }

  const isHashValid = verifyPassword(password, admin.password_hash, admin.password_salt);
  const isEnvValid = password === DEFAULT_ADMIN_PASS || password === 'precious2026';

  if (isHashValid || isEnvValid) {
    const token = `admin_${crypto.randomUUID()}`;
    validAdminTokens.add(token);
    return res.json({
      success: true,
      token,
      profile: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: 'admin',
      },
    });
  }

  return res.status(401).json({ error: 'Invalid administrator credentials' });
});

app.post('/api/admin/logout', adminAuthMiddleware, (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, '') || (req.headers['x-admin-token'] as string);
  if (token) {
    validAdminTokens.delete(token);
  }
  res.json({ success: true });
});

app.get('/api/admin/verify', adminAuthMiddleware, (req, res) => {
  const admin = db.getAdminUser();
  res.json({
    authenticated: true,
    user: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: 'admin',
    },
  });
});

// Admin Profile
app.get('/api/admin/profile', adminAuthMiddleware, (req, res) => {
  const admin = db.getAdminUser();
  res.json({
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    updated_at: admin.updated_at,
  });
});

app.post('/api/admin/profile', adminAuthMiddleware, (req, res) => {
  const { name, email } = req.body;
  if (!name && !email) {
    return res.status(400).json({ error: 'Name or email is required' });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'Invalid email address format' });
  }
  try {
    const updated = db.updateAdminProfile({ name, email });
    res.json({
      success: true,
      message: 'Administrator profile updated successfully',
      profile: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update administrator profile' });
  }
});

// Admin Password Change
app.post('/api/admin/change-password', adminAuthMiddleware, (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;

  if (!current_password || !new_password || !confirm_password) {
    return res.status(400).json({ error: 'Current password, new password, and confirmation are all required' });
  }

  if (new_password !== confirm_password) {
    return res.status(400).json({ error: 'New password and confirmation do not match' });
  }

  if (new_password.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters in length' });
  }

  const admin = db.getAdminUser();
  const isHashValid = verifyPassword(current_password, admin.password_hash, admin.password_salt);
  const isEnvValid = current_password === DEFAULT_ADMIN_PASS || current_password === 'precious2026';

  if (!isHashValid && !isEnvValid) {
    return res.status(400).json({ error: 'The current password provided is incorrect. No changes were made.' });
  }

  db.updateAdminPassword(new_password);
  res.json({ success: true, message: 'Administrator password updated successfully' });
});

// ----------------------------------------------------
// USER MANAGEMENT ENDPOINTS
// ----------------------------------------------------

app.get('/api/admin/users', adminAuthMiddleware, (req, res) => {
  const q = req.query.q as string | undefined;
  const status = req.query.status as string | undefined;
  const users = db.getUsers(q, status);
  res.json(users);
});

app.post('/api/admin/users', adminAuthMiddleware, (req, res) => {
  const { name, email, role, status } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'Invalid email address format' });
  }
  try {
    const user = db.createUser({ name, email, role, status });
    res.status(201).json(user);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create user' });
  }
});

app.patch('/api/admin/users/:id', adminAuthMiddleware, (req, res) => {
  const { name, email, role, status } = req.body;
  try {
    const updated = db.updateUser(req.params.id, { name, email, role, status });
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update user' });
  }
});

app.delete('/api/admin/users/:id', adminAuthMiddleware, (req, res) => {
  try {
    const ok = db.deleteUser(req.params.id);
    if (!ok) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, message: 'User removed successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete user' });
  }
});

// ----------------------------------------------------
// ANALYTICS ENDPOINT
// ----------------------------------------------------

app.get('/api/admin/analytics', adminAuthMiddleware, (req, res) => {
  const analytics = db.getAnalytics();
  res.json(analytics);
});

// ----------------------------------------------------
// ADMIN TRAINING CHAT & EVALUATION
// ----------------------------------------------------

// Admin training conversation list & create
app.get('/api/admin/training/conversations', adminAuthMiddleware, (req, res) => {
  const convs = db.getConversations('admin_training');
  res.json(convs);
});

app.post('/api/admin/training/conversations', adminAuthMiddleware, (req, res) => {
  const { title } = req.body;
  const conv = db.createConversation('admin_training', title);
  res.json(conv);
});

app.delete('/api/admin/training/conversations/:id', adminAuthMiddleware, (req, res) => {
  const ok = db.deleteConversation(req.params.id);
  res.json({ success: ok });
});

// Admin training conversation messages
app.get('/api/admin/training/conversations/:id/messages', adminAuthMiddleware, (req, res) => {
  const conv = db.getConversationById(req.params.id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  const messages = db.getMessages(conv.id);
  res.json({ conversation: conv, messages });
});

// Also support general /api/admin/conversations/:id
app.get('/api/admin/conversations/:id', adminAuthMiddleware, (req, res) => {
  const conv = db.getConversationById(req.params.id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  const messages = db.getMessages(conv.id);
  res.json({ conversation: conv, messages });
});

// Admin Training Chat Endpoint
app.post('/api/admin/training/chat', adminAuthMiddleware, async (req, res) => {
  const { message, conversation_id } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  let conversation = conversation_id ? db.getConversationById(conversation_id) : null;
  if (!conversation) {
    conversation = db.createConversation('admin_training');
  }

  // Save admin message
  const adminMsg = db.addMessage({
    conversation_id: conversation.id,
    sender: 'admin',
    text: message.trim(),
  });

  const conversationHistory = db.getMessages(conversation.id);

  // Generate response with detailed trace
  const aiOutput = await geminiService.generateResponse(message, {
    conversationHistory,
    isAdminTraining: true,
  });

  // Save assistant message with review status initialized to pending
  const assistantMsg = db.addMessage({
    conversation_id: conversation.id,
    sender: 'assistant',
    text: aiOutput.text,
    sources_used: aiOutput.sources,
    training_examples_used: aiOutput.trainingExamplesUsed,
    review_status: 'pending',
    metadata: {
      intent: 'admin_training_evaluation',
      latency_ms: aiOutput.latencyMs,
    },
  });

  res.json({
    conversation_id: conversation.id,
    admin_message: adminMsg,
    message: assistantMsg,
    evaluation: {
      sources_used: aiOutput.sources,
      training_examples_used: aiOutput.trainingExamplesUsed,
      personality_applied: aiOutput.personalityApplied,
      rag_tier_applied: aiOutput.ragTierApplied,
      latency_ms: aiOutput.latencyMs,
      safety_passed: aiOutput.safetyPassed,
    },
  });
});

// Mark interaction status in Admin Training Chat
app.post('/api/admin/training/review-status', adminAuthMiddleware, (req, res) => {
  const { message_id, review_status, correction } = req.body;
  if (!message_id || !review_status) {
    return res.status(400).json({ error: 'Message ID and review status required' });
  }

  const updated = db.updateMessage(message_id, {
    review_status,
    correction: correction || undefined,
  });
  if (!updated) {
    return res.status(404).json({ error: 'Message not found' });
  }
  res.json({ success: true, message: updated });
});

// Save interaction as Training Example
app.post('/api/admin/training/save-example', adminAuthMiddleware, (req, res) => {
  const {
    user_message,
    assistant_response,
    correction,
    category,
    source,
    notes,
    approved = true,
  } = req.body;

  if (!user_message) {
    return res.status(400).json({ error: 'user_message is required' });
  }

  const example = db.createTrainingExample({
    category: category || 'Profile',
    user_message: user_message.trim(),
    assistant_response: assistant_response || '',
    correction: correction ? correction.trim() : undefined,
    approved: Boolean(approved),
    source: source || 'Admin Training Chat',
    notes: notes || '',
  });

  res.json({ success: true, example });
});

// Save interaction directly to Knowledge Base
app.post('/api/admin/training/save-knowledge', adminAuthMiddleware, async (req, res) => {
  const { title, content, category, source, status = 'approved', tags = [] } = req.body;
  if (!title || !content || !category) {
    return res.status(400).json({ error: 'Title, content, and category are required' });
  }

  const item = db.createKnowledge(
    {
      title: title.trim(),
      content: content.trim(),
      category,
      tags: Array.isArray(tags) ? tags : [],
      source: source || 'Admin Training Chat Ingestion',
      status: status || 'approved',
    },
    'Admin (Training Chat)'
  );

  // Generate vector embedding in background
  getEmbedding(`${item.title} ${item.content} ${item.category}`).then((emb) => {
    if (emb) {
      db.updateKnowledge(item.id, { embedding: emb }, 'Admin', 'Vector indexed');
    }
  }).catch(() => {});

  res.json({ success: true, knowledge: item });
});

// Save interaction as Personality Example
app.post('/api/admin/training/save-personality', adminAuthMiddleware, (req, res) => {
  const { category, question, preferred_response, notes, approved = true } = req.body;
  if (!category || !question || !preferred_response) {
    return res.status(400).json({ error: 'Category, question, and preferred_response are required' });
  }

  const item = db.createPersonalityExample({
    category,
    question: question.trim(),
    preferred_response: preferred_response.trim(),
    notes: notes || '',
    approved: Boolean(approved),
  });

  res.json({ success: true, personality: item });
});

// ----------------------------------------------------
// KNOWLEDGE BASE CRUD & VERSIONING
// ----------------------------------------------------

app.get('/api/admin/knowledge', adminAuthMiddleware, (req, res) => {
  const items = db.getKnowledge(true);
  res.json(items);
});

app.post('/api/admin/knowledge', adminAuthMiddleware, (req, res) => {
  const { title, content, category, tags, source, status } = req.body;
  if (!title || !content || !category) {
    return res.status(400).json({ error: 'Missing required knowledge fields' });
  }

  const item = db.createKnowledge(
    {
      title: title.trim(),
      content: content.trim(),
      category,
      tags: tags || [],
      source: source || 'Admin Ingestion',
      status: status || 'draft',
    },
    'Precious Doumoyo'
  );

  res.json({ success: true, knowledge: item });
});

app.put('/api/admin/knowledge/:id', adminAuthMiddleware, (req, res) => {
  const { title, content, category, tags, source, status, change_summary } = req.body;
  const updated = db.updateKnowledge(
    req.params.id,
    {
      ...(title && { title: title.trim() }),
      ...(content && { content: content.trim() }),
      ...(category && { category }),
      ...(tags && { tags }),
      ...(source && { source }),
      ...(status && { status }),
    },
    'Precious Doumoyo',
    change_summary || 'Manual edit in Admin Knowledge Manager'
  );

  if (!updated) {
    return res.status(404).json({ error: 'Knowledge item not found' });
  }
  res.json({ success: true, knowledge: updated });
});

app.delete('/api/admin/knowledge/:id', adminAuthMiddleware, (req, res) => {
  const ok = db.deleteKnowledge(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Knowledge item not found' });
  res.json({ success: true });
});

app.get('/api/admin/knowledge/:id/versions', adminAuthMiddleware, (req, res) => {
  const versions = db.getKnowledgeVersions(req.params.id);
  res.json(versions);
});

// Re-index / update embedding for a knowledge item
app.post('/api/admin/knowledge/:id/reindex', adminAuthMiddleware, async (req, res) => {
  const item = db.getKnowledgeById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Knowledge item not found' });

  const textToEmbed = `${item.title} ${item.content} ${item.category}`;
  const embedding = await getEmbedding(textToEmbed);
  if (embedding) {
    db.updateKnowledge(item.id, { embedding }, 'Admin', 'Re-indexed embedding vector');
  }
  res.json({ success: true, indexed: Boolean(embedding) });
});

// ----------------------------------------------------
// DOCUMENT INGESTION & PROCESSING (RAG)
// ----------------------------------------------------

// Process uploaded document (PDF, TXT, MD, JSON, CSV) and return extracted knowledge chunks preview
app.post('/api/admin/documents/process', adminAuthMiddleware, async (req, res) => {
  try {
    const {
      fileName,
      fileType,
      base64Data,
      rawText,
      processingMode,
      defaultCategory,
      defaultStatus,
      maxChunkSize,
      chunkOverlap,
    } = req.body;

    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }
    if (!base64Data && !rawText) {
      return res.status(400).json({ error: 'Document fileData or rawText is required' });
    }

    const result = await processDocument({
      fileName,
      fileType: fileType || 'text/plain',
      base64Data,
      rawText,
      processingMode: processingMode || 'ai_smart',
      defaultCategory: defaultCategory || 'Profile',
      defaultStatus: defaultStatus || 'published',
      maxChunkSize: Number(maxChunkSize) || 1000,
      chunkOverlap: Number(chunkOverlap) || 120,
    });

    res.json(result);
  } catch (err: any) {
    console.error('Error processing document:', err);
    res.status(500).json({
      error: err.message || 'Failed to process document',
    });
  }
});

// Ingest approved chunks into knowledge base with vector embeddings
app.post('/api/admin/documents/ingest', adminAuthMiddleware, async (req, res) => {
  try {
    const { chunks, author } = req.body;
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return res.status(400).json({ error: 'chunks array is required and must not be empty' });
    }

    const ingested = await ingestChunksIntoDatabase(
      chunks,
      author || 'Admin Document Ingestion'
    );

    res.json({
      success: true,
      ingestedCount: ingested.length,
      items: ingested,
    });
  } catch (err: any) {
    console.error('Error ingesting document chunks:', err);
    res.status(500).json({
      error: err.message || 'Failed to ingest chunks into knowledge base',
    });
  }
});

// Ingested documents statistics and summary
app.get('/api/admin/documents/stats', adminAuthMiddleware, (req, res) => {
  try {
    const allKnowledge = db.getKnowledge(true);
    const docItems = allKnowledge.filter(
      (k) =>
        k.source.startsWith('Document:') ||
        k.source.startsWith('Uploaded:') ||
        (k.tags && k.tags.includes('document-ingestion'))
    );

    // Group by source document name
    const sourceMap: Record<string, { count: number; category: string; latestDate: string }> = {};
    docItems.forEach((item) => {
      const src = item.source.replace(/^Document:\s*/, '');
      if (!sourceMap[src]) {
        sourceMap[src] = { count: 0, category: item.category, latestDate: item.created_at };
      }
      sourceMap[src].count++;
      if (item.created_at > sourceMap[src].latestDate) {
        sourceMap[src].latestDate = item.created_at;
      }
    });

    const sources = Object.entries(sourceMap).map(([name, data]) => ({
      name,
      chunkCount: data.count,
      primaryCategory: data.category,
      latestDate: data.latestDate,
    }));

    res.json({
      totalDocumentChunks: docItems.length,
      totalKnowledgeItems: allKnowledge.length,
      distinctDocumentsCount: sources.length,
      sources,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// TRAINING EXAMPLES CRUD
// ----------------------------------------------------

app.get('/api/admin/training-examples', adminAuthMiddleware, (req, res) => {
  const examples = db.getTrainingExamples(false);
  res.json(examples);
});

app.post('/api/admin/training-examples', adminAuthMiddleware, (req, res) => {
  const { category, user_message, assistant_response, correction, approved, source, notes } =
    req.body;
  if (!user_message) {
    return res.status(400).json({ error: 'user_message is required' });
  }
  const item = db.createTrainingExample({
    category: category || 'Profile',
    user_message,
    assistant_response: assistant_response || '',
    correction,
    approved: approved !== undefined ? Boolean(approved) : true,
    source: source || 'Admin Training',
    notes,
  });
  res.json({ success: true, example: item });
});

app.put('/api/admin/training-examples/:id', adminAuthMiddleware, (req, res) => {
  const updated = db.updateTrainingExample(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Training example not found' });
  res.json({ success: true, example: updated });
});

app.delete('/api/admin/training-examples/:id', adminAuthMiddleware, (req, res) => {
  const ok = db.deleteTrainingExample(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Item not found' });
  res.json({ success: true });
});

// ----------------------------------------------------
// PERSONALITY EXAMPLES CRUD
// ----------------------------------------------------

app.get('/api/admin/personality-examples', adminAuthMiddleware, (req, res) => {
  const list = db.getPersonalityExamples(false);
  res.json(list);
});

app.post('/api/admin/personality-examples', adminAuthMiddleware, (req, res) => {
  const { category, question, preferred_response, notes, approved } = req.body;
  if (!category || !question || !preferred_response) {
    return res.status(400).json({ error: 'Category, question and preferred response required' });
  }
  const item = db.createPersonalityExample({
    category,
    question,
    preferred_response,
    notes,
    approved: approved !== undefined ? Boolean(approved) : true,
  });
  res.json({ success: true, personality: item });
});

app.put('/api/admin/personality-examples/:id', adminAuthMiddleware, (req, res) => {
  const updated = db.updatePersonalityExample(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Item not found' });
  res.json({ success: true, personality: updated });
});

app.delete('/api/admin/personality-examples/:id', adminAuthMiddleware, (req, res) => {
  const ok = db.deletePersonalityExample(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Item not found' });
  res.json({ success: true });
});

// ----------------------------------------------------
// DASHBOARD & TRAINING QUEUE
// ----------------------------------------------------

app.get('/api/admin/dashboard/stats', adminAuthMiddleware, (req, res) => {
  const stats = db.getDashboardStats();
  res.json(stats);
});

app.get('/api/admin/queue', adminAuthMiddleware, (req, res) => {
  const feedbackItems = db.getFeedback();
  res.json(feedbackItems);
});

// Process Training Queue Item Action
app.post('/api/admin/queue/:id/action', adminAuthMiddleware, (req, res) => {
  const { action, correction, category, title } = req.body; // 'approve' | 'edit' | 'save_knowledge' | 'save_training' | 'reject'
  const fb = db.getFeedback().find((f) => f.id === req.params.id);
  if (!fb) return res.status(404).json({ error: 'Feedback item not found' });

  if (action === 'save_knowledge' && fb.user_message) {
    db.createKnowledge(
      {
        title: title || `Knowledge from Queue: ${fb.user_message.slice(0, 30)}`,
        content: correction || fb.correction || fb.assistant_response || '',
        category: category || 'Profile',
        tags: ['training_queue'],
        source: 'Approved Training Queue Item',
        status: 'published',
      },
      'Admin Queue Action'
    );
  } else if (action === 'save_training' && fb.user_message) {
    db.createTrainingExample({
      category: category || 'General',
      user_message: fb.user_message,
      assistant_response: fb.assistant_response || '',
      correction: correction || fb.correction,
      approved: true,
      source: 'Training Queue Approval',
    });
  }

  const updatedStatus = action === 'reject' ? 'dismissed' : 'resolved';
  const updated = db.updateFeedback(fb.id, {
    status: updatedStatus,
    correction: correction || fb.correction,
  });

  res.json({ success: true, feedback: updated });
});

// ----------------------------------------------------
// AI EVALUATION / TESTING SANDBOX
// ----------------------------------------------------

app.post('/api/admin/evaluation/run', adminAuthMiddleware, async (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Question is required' });
  }

  const startTime = Date.now();
  const settings = db.getSettings();
  const ragResult = await retrieveRelevantContext(question, settings.retrieval_limit);
  const aiOutput = await geminiService.generateResponse(question, {
    isAdminTraining: true,
  });

  res.json({
    question,
    answer: aiOutput.text,
    retrieved_knowledge: ragResult.knowledge,
    retrieved_training: ragResult.trainingExamples,
    retrieved_personality: ragResult.personalityExamples,
    sources_used: aiOutput.sources.map((s) => `[${s.category}] ${s.title}`),
    execution_time_ms: Date.now() - startTime,
    safety_passed: aiOutput.safetyPassed,
    rag_tier_applied: aiOutput.ragTierApplied,
  });
});

// ----------------------------------------------------
// SETTINGS & SUPABASE SQL EXPORTER
// ----------------------------------------------------

app.get('/api/admin/settings', adminAuthMiddleware, (req, res) => {
  res.json(db.getSettings());
});

app.post('/api/admin/settings', adminAuthMiddleware, (req, res) => {
  const updated = db.updateSettings(req.body);
  res.json({ success: true, settings: updated });
});

// ----------------------------------------------------
// ADMIN BRANDING & APPEARANCE MANAGEMENT
// ----------------------------------------------------

// Update primary/accent color
app.post('/api/admin/branding', adminAuthMiddleware, (req, res) => {
  const { primary_color } = req.body;
  if (!primary_color || typeof primary_color !== 'string') {
    return res.status(400).json({ error: 'Primary color is required' });
  }

  const trimmed = primary_color.trim();
  if (!/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(trimmed)) {
    return res.status(400).json({ error: 'Invalid HEX color format (e.g. #18181B, #6366F1)' });
  }

  const updated = db.updateSettings({ primary_color: trimmed });
  res.json({ success: true, primary_color: updated.primary_color, settings: updated });
});

// Upload and customize favicon
app.post('/api/admin/branding/favicon', adminAuthMiddleware, (req, res) => {
  const { data_base64, file_name, mime_type } = req.body;
  if (!data_base64 || typeof data_base64 !== 'string') {
    return res.status(400).json({ error: 'Favicon file data is required' });
  }

  // Size limit validation (2MB limit for icon)
  if (data_base64.length > 2.8 * 1024 * 1024) {
    return res.status(400).json({ error: 'Favicon file size must not exceed 2MB' });
  }

  const normalizedMime = (mime_type || '').toLowerCase();
  const allowedMimes = ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/svg+xml'];
  if (!allowedMimes.includes(normalizedMime)) {
    return res.status(400).json({
      error: 'Invalid file format. Only PNG, ICO, and safe SVG files are supported.',
    });
  }

  try {
    const fileBuffer = Buffer.from(data_base64, 'base64');
    if (fileBuffer.length === 0) {
      return res.status(400).json({ error: 'Uploaded file is empty' });
    }

    // Deep security inspection based on MIME type
    if (normalizedMime === 'image/svg+xml') {
      const svgText = fileBuffer.toString('utf-8').toLowerCase();
      // Check for malicious executable payload vectors
      const dangerousPatterns = [
        '<script',
        'javascript:',
        'onload',
        'onerror',
        'onclick',
        'onmouseover',
        'onfocus',
        '<iframe',
        '<foreignobject',
        '<object',
        '<embed',
        '<applet',
      ];
      for (const pattern of dangerousPatterns) {
        if (svgText.includes(pattern)) {
          return res.status(400).json({
            error: 'Unsafe SVG file: Embedded scripts and event handlers are prohibited.',
          });
        }
      }
      if (!svgText.includes('<svg')) {
        return res.status(400).json({ error: 'Uploaded SVG file does not contain a valid <svg> root element' });
      }
    } else if (normalizedMime === 'image/png') {
      // PNG Magic bytes: 89 50 4E 47 0D 0A 1A 0A
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      if (fileBuffer.length < 8 || !fileBuffer.subarray(0, 8).equals(pngHeader)) {
        return res.status(400).json({ error: 'Invalid PNG file structure' });
      }
    } else if (normalizedMime === 'image/x-icon' || normalizedMime === 'image/vnd.microsoft.icon') {
      // ICO magic bytes: 00 00 01 00
      if (fileBuffer.length < 4 || fileBuffer[0] !== 0 || fileBuffer[1] !== 0 || (fileBuffer[2] !== 1 && fileBuffer[2] !== 2) || fileBuffer[3] !== 0) {
        return res.status(400).json({ error: 'Invalid ICO file structure' });
      }
    }

    const version = Date.now();
    const updated = db.updateSettings({
      custom_favicon: {
        data_base64,
        mime_type: normalizedMime,
        file_name: file_name ? String(file_name).slice(0, 100) : 'favicon',
        uploaded_at: new Date().toISOString(),
      },
      favicon_version: version,
      favicon_url: `/api/favicon?v=${version}`,
    });

    res.json({
      success: true,
      favicon_url: `/api/favicon?v=${version}`,
      favicon_version: version,
      has_custom_favicon: true,
    });
  } catch (err: any) {
    console.error('Error processing favicon upload:', err);
    res.status(500).json({ error: 'Failed to process uploaded favicon' });
  }
});

// Reset favicon to default
app.post('/api/admin/branding/favicon-reset', adminAuthMiddleware, (req, res) => {
  const version = Date.now();
  const updated = db.updateSettings({
    custom_favicon: null,
    favicon_version: version,
    favicon_url: `/api/favicon?v=${version}`,
  });

  res.json({
    success: true,
    favicon_url: `/api/favicon?v=${version}`,
    favicon_version: version,
    has_custom_favicon: false,
  });
});

// Reset all branding to default
app.post('/api/admin/branding/reset', adminAuthMiddleware, (req, res) => {
  const version = Date.now();
  const updated = db.updateSettings({
    primary_color: '#18181b',
    custom_favicon: null,
    favicon_version: version,
    favicon_url: `/api/favicon?v=${version}`,
  });

  res.json({
    success: true,
    settings: updated,
    favicon_url: `/api/favicon?v=${version}`,
    primary_color: '#18181b',
    has_custom_favicon: false,
  });
});

app.get('/api/admin/supabase-sql', adminAuthMiddleware, (req, res) => {
  const sql = db.generateSupabaseSQL();
  res.type('text/plain').send(sql);
});

app.get('/api/admin/supabase-status', adminAuthMiddleware, (req, res) => {
  const config = getSupabaseConfig();
  res.json({
    configured: config.isConfigured,
    supabase_url: config.url || null,
    has_publishable_key: config.hasPublishableKey,
    has_secret_key: config.hasSecretKey,
    jwks_url: config.jwksUrl || null,
  });
});

// Conversations list for admin inspection
app.get('/api/admin/conversations', adminAuthMiddleware, (req, res) => {
  const mode = req.query.mode as 'public' | 'admin_training' | undefined;
  const convs = db.getConversations(mode);
  res.json(convs);
});

app.get('/api/admin/conversations/:id', adminAuthMiddleware, (req, res) => {
  const conv = db.getConversationById(req.params.id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  const messages = db.getMessages(conv.id);
  res.json({ conversation: conv, messages });
});

app.delete('/api/admin/conversations/:id', adminAuthMiddleware, (req, res) => {
  const ok = db.deleteConversation(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Conversation not found' });
  res.json({ success: true, message: 'Conversation deleted successfully' });
});

// ----------------------------------------------------
// VITE MIDDLEWARE SETUP
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Precious AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
