import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  KnowledgeItem,
  KnowledgeVersion,
  TrainingExample,
  PersonalityExample,
  ChatMessage,
  Conversation,
  ResponseFeedback,
  AISettings,
  AppUser,
  AnalyticsSummary,
  ProjectItem,
  ProjectStatus,
} from '../src/types.js';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  password_salt: string;
  role: 'admin';
  updated_at: string;
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.pbkdf2Sync(password, s, 100000, 64, 'sha512');
  return { hash: derivedKey.toString('hex'), salt: s };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
    const derivedHex = derivedKey.toString('hex');
    return crypto.timingSafeEqual(Buffer.from(derivedHex), Buffer.from(hash));
  } catch {
    return false;
  }
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'precious_ai.json');

export interface DatabaseSchema {
  settings: AISettings;
  admin_user: AdminUser;
  users: AppUser[];
  knowledge: KnowledgeItem[];
  knowledge_versions: KnowledgeVersion[];
  training_examples: TrainingExample[];
  personality_examples: PersonalityExample[];
  conversations: Conversation[];
  messages: ChatMessage[];
  response_feedback: ResponseFeedback[];
  admin_notes: Array<{
    id: string;
    title: string;
    note: string;
    category: string;
    created_at: string;
  }>;
}

const defaultSettings: AISettings = {
  ai_name: 'Precious AI',
  assistant_title: 'Personal AI Assistant representing Precious Doumoyo',
  description: 'A trainable personal AI assistant that accurately represents Precious Doumoyo in professional and technical communications.',
  tone: 'professional',
  response_length: 'balanced',
  emoji_usage: 'minimal',
  greeting_message: "Hello! I'm Precious AI, the personal AI assistant for Precious Doumoyo. I can answer questions about Precious's background in AI training & evaluation, data analytics, blockchain, certifications, and projects. How can I assist you today?",
  unknown_answer_fallback: "I don't have that information in Precious's approved profile yet. As a verified assistant, I only share facts that have been directly confirmed by Precious.",
  public_chat_enabled: true,
  retrieval_limit: 4,
  temperature: 0.3,
  enable_rag: true,
  enable_training_examples: true,
  enable_memory: true,
  primary_color: '#18181b',
  favicon_url: '/api/favicon',
  favicon_version: 1,
  custom_favicon: null,
};

const initialKnowledge: KnowledgeItem[] = [
  {
    id: 'k-1',
    title: 'Professional Overview & Focus',
    content: 'Precious Doumoyo is a Computer Science and Informatics graduate. He is currently focused on AI training and evaluation, prompt engineering, data analytics, and blockchain/Web3 technologies. He combines rigorous technical analysis with responsible AI methodologies.',
    category: 'Profile',
    tags: ['profile', 'focus', 'overview', 'ai', 'data analytics', 'blockchain'],
    source: 'Precious Doumoyo Verified Bio',
    status: 'published',
    version: 1,
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'Precious Doumoyo',
  },
  {
    id: 'k-2',
    title: 'Academic Education',
    content: 'Precious Doumoyo holds a Bachelor of Science degree in Computer Science and Informatics. His academic coursework encompassed software architecture, relational databases, data structures, algorithms, information systems, and computer networks.',
    category: 'Education',
    tags: ['education', 'degree', 'computer science', 'informatics'],
    source: 'Academic Degree Records',
    status: 'published',
    version: 1,
    created_at: new Date(Date.now() - 86400000 * 9).toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'Precious Doumoyo',
  },
  {
    id: 'k-3',
    title: 'Cisco Data Analytics Essentials Certification',
    content: 'Precious completed the Data Analytics Essentials certification from Cisco Networking Academy. This credential validates expertise in exploratory data analysis, data transformation pipelines, statistical interpretation, data visualization, and identifying actionable business insights from complex datasets.',
    category: 'Certifications',
    tags: ['cisco', 'data analytics', 'certification', 'essentials'],
    source: 'Cisco Networking Academy',
    status: 'published',
    version: 1,
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'Precious Doumoyo',
  },
  {
    id: 'k-4',
    title: 'Responsible AI & AI Ethics Certification',
    content: 'Precious completed coursework and credentialing in Responsible AI, AI Ethics, and Model Evaluation. His training emphasizes bias mitigation, red-teaming, prompt injection defense, safety guardrails, factuality auditing, and transparent LLM governance.',
    category: 'Responsible AI',
    tags: ['ethics', 'responsible ai', 'evaluation', 'red teaming', 'safety'],
    source: 'CodeSignal / AI Safety Programs',
    status: 'published',
    version: 1,
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'Precious Doumoyo',
  },
  {
    id: 'k-5',
    title: 'Core Technical Skills',
    content: 'Key technical competencies include: AI & LLM training evaluation, prompt engineering, RAG architecture, Python, TypeScript, SQL/PostgreSQL, data analytics, exploratory data modeling, blockchain foundations, and smart contracts.',
    category: 'Skills',
    tags: ['skills', 'technical', 'python', 'sql', 'rag', 'llm'],
    source: 'Verified Skills Inventory',
    status: 'published',
    version: 1,
    created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'Precious Doumoyo',
  },
  {
    id: 'k-6',
    title: 'Precious AI Project Architecture',
    content: 'Precious architected and built Precious AI as a trainable personal AI assistant featuring multi-tier RAG retrieval, human-in-the-loop admin feedback loops, prompt injection protection, versioned knowledge audit logs, and personality alignment.',
    category: 'Projects',
    tags: ['projects', 'precious ai', 'architecture', 'rag'],
    source: 'Project Portfolio',
    status: 'published',
    version: 1,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'Precious Doumoyo',
  },
  {
    id: 'k-7',
    title: 'Professional Communication Style',
    content: 'Precious values clear, articulate communication that blends international corporate standards with warm, respectful African/Nigerian courtesy. He values intellectual honesty, admitting unknowns rather than guessing, and backing claims with verified evidence.',
    category: 'Communication Style',
    tags: ['communication', 'style', 'tone', 'etiquette'],
    source: 'Personal Brand Guide',
    status: 'published',
    version: 1,
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'Precious Doumoyo',
  },
  {
    id: 'k-8',
    title: 'Contact & Collaboration Preferences',
    content: 'Precious is open to select professional opportunities, technical advisory, AI evaluation projects, and Web3 data analytics collaborations. Inquiries can be submitted via email or professional networking platforms.',
    category: 'Contact',
    tags: ['contact', 'email', 'networking', 'opportunities'],
    source: 'Official Channels',
    status: 'published',
    version: 1,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'Precious Doumoyo',
  },
];

const initialTrainingExamples: TrainingExample[] = [
  {
    id: 'te-1',
    category: 'Profile',
    user_message: 'What does Precious specialize in?',
    assistant_response: 'Precious specializes in general software engineering and website building.',
    correction: 'Precious is currently focused on AI training and evaluation, prompt engineering, data analytics, and blockchain/Web3 technologies. While having a computer science background, his primary focus is on AI safety, evaluation, data insights, and decentralized applications.',
    approved: true,
    source: 'Admin Training Session #1',
    notes: 'Approved core specialization definition.',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'te-2',
    category: 'Career',
    user_message: 'How should you describe Precious’s career direction?',
    assistant_response: 'Precious wants to work anywhere in tech.',
    correction: 'Precious is actively advancing his career in AI evaluation, data analytics, and blockchain systems. He brings rigorous analytical thinking, certified data skills, and ethical AI auditing to technical teams.',
    approved: true,
    source: 'Admin Training Session #2',
    notes: 'Clarifies strategic career alignment.',
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'te-3',
    category: 'Certifications',
    user_message: 'Does Precious have any formal training in analyzing data?',
    assistant_response: 'Yes, Precious has some certificates.',
    correction: 'Yes, Precious holds the Data Analytics Essentials certification from Cisco Networking Academy. This credential covers exploratory data analysis, data transformation, statistical interpretation, and turning datasets into actionable intelligence.',
    approved: true,
    source: 'Admin Training Session #3',
    notes: 'Direct semantic bridge for data analysis inquiries.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const initialPersonalityExamples: PersonalityExample[] = [
  {
    id: 'pe-1',
    category: 'Greeting',
    question: 'Tell me about yourself.',
    preferred_response: "I'm Precious AI, an AI assistant representing Precious Doumoyo. I'm here to provide accurate, verified information regarding Precious's background, education in Computer Science and Informatics, expertise in AI evaluation and data analytics, and projects.",
    notes: 'Authentic identity representation without falsely claiming to be the human.',
    approved: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'pe-2',
    category: 'Unknown-answer style',
    question: 'What is Precious’s home address and phone number?',
    preferred_response: "I don't have that personal contact information in Precious's approved profile, and I protect his personal privacy. If you would like to reach out professionally, you can connect via his official contact channels.",
    notes: 'Respectful refusal for private or unverified data.',
    approved: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'pe-3',
    category: 'Nigerian English preferences',
    question: 'How do you balance warmth and professional composure?',
    preferred_response: 'With warmth, genuine respect, and professional clarity. In Precious’s culture, greeting warmly and honoring people with sincere politeness is paramount, while keeping technical explanations crisp and objective.',
    notes: 'Cultural alignment example.',
    approved: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const defaultAdminPass = process.env.ADMIN_PASSWORD || 'precious2026';
const initialAdminHash = hashPassword(defaultAdminPass);

const initialAdminUser: AdminUser = {
  id: 'admin-primary',
  name: 'Precious Doumoyo',
  email: 'preciousdoumoyo@gmail.com',
  password_hash: initialAdminHash.hash,
  password_salt: initialAdminHash.salt,
  role: 'admin',
  updated_at: new Date().toISOString(),
};

const initialUsers: AppUser[] = [
  {
    id: 'usr-1',
    name: 'Precious Doumoyo',
    email: 'preciousdoumoyo@gmail.com',
    role: 'admin',
    status: 'active',
    last_active: new Date().toISOString(),
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    conversations_count: 12,
  },
  {
    id: 'usr-2',
    name: 'Technical Recruiter',
    email: 'talent@deeptech-ventures.com',
    role: 'user',
    status: 'active',
    last_active: new Date(Date.now() - 3600000 * 2).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    conversations_count: 4,
  },
  {
    id: 'usr-3',
    name: 'Web3 Protocol Auditor',
    email: 'audits@solidity-dao.eth',
    role: 'user',
    status: 'active',
    last_active: new Date(Date.now() - 86400000 * 1).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    conversations_count: 6,
  },
  {
    id: 'usr-4',
    name: 'AI Model Safety Evaluator',
    email: 'evals@responsible-ai-forum.org',
    role: 'user',
    status: 'active',
    last_active: new Date(Date.now() - 86400000 * 3).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
    conversations_count: 3,
  },
];

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          settings: { ...defaultSettings, ...(parsed.settings || {}) },
          admin_user: parsed.admin_user || initialAdminUser,
          users: parsed.users && parsed.users.length > 0 ? parsed.users : initialUsers,
          knowledge: parsed.knowledge || initialKnowledge,
          knowledge_versions: parsed.knowledge_versions || [],
          training_examples: parsed.training_examples || initialTrainingExamples,
          personality_examples: parsed.personality_examples || initialPersonalityExamples,
          conversations: parsed.conversations || [],
          messages: parsed.messages || [],
          response_feedback: parsed.response_feedback || [],
          admin_notes: parsed.admin_notes || [],
        };
      }
    } catch (e) {
      console.error('Error loading DB file, initializing fresh:', e);
    }

    const fresh: DatabaseSchema = {
      settings: defaultSettings,
      admin_user: initialAdminUser,
      users: initialUsers,
      knowledge: initialKnowledge,
      knowledge_versions: initialKnowledge.map((k) => ({
        id: crypto.randomUUID(),
        knowledge_id: k.id,
        version: 1,
        title: k.title,
        content: k.content,
        category: k.category,
        source: k.source,
        status: k.status,
        changed_by: 'System Seed',
        change_summary: 'Initial baseline knowledge',
        created_at: k.created_at,
      })),
      training_examples: initialTrainingExamples,
      personality_examples: initialPersonalityExamples,
      conversations: [],
      messages: [],
      response_feedback: [],
      admin_notes: [],
    };
    this.saveData(fresh);
    return fresh;
  }

  private saveData(data: DatabaseSchema): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  public getSettings(): AISettings {
    return this.data.settings;
  }

  public updateSettings(partial: Partial<AISettings>): AISettings {
    this.data.settings = { ...this.data.settings, ...partial };
    this.saveData(this.data);
    return this.data.settings;
  }

  // Knowledge operations
  public getKnowledge(includeUnpublished = false): KnowledgeItem[] {
    if (includeUnpublished) {
      return [...this.data.knowledge];
    }
    return this.data.knowledge.filter(
      (k) => k.status === 'published' || k.status === 'approved'
    );
  }

  public getKnowledgeById(id: string): KnowledgeItem | undefined {
    return this.data.knowledge.find((k) => k.id === id);
  }

  public createKnowledge(
    item: Omit<KnowledgeItem, 'id' | 'version' | 'created_at' | 'updated_at' | 'created_by'> & {
      created_by?: string;
    },
    author = 'Admin'
  ): KnowledgeItem {
    const id = `k-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const newItem: KnowledgeItem = {
      ...item,
      id,
      version: 1,
      created_at: now,
      updated_at: now,
      created_by: item.created_by || author,
    };
    this.data.knowledge.push(newItem);

    // Record version
    this.data.knowledge_versions.push({
      id: crypto.randomUUID(),
      knowledge_id: id,
      version: 1,
      title: newItem.title,
      content: newItem.content,
      category: newItem.category,
      source: newItem.source,
      status: newItem.status,
      changed_by: author,
      change_summary: 'Initial creation',
      created_at: now,
    });

    this.saveData(this.data);
    return newItem;
  }

  public updateKnowledge(
    id: string,
    updates: Partial<Omit<KnowledgeItem, 'id' | 'version' | 'created_at'>>,
    author = 'Admin',
    changeSummary = 'Updated content'
  ): KnowledgeItem | null {
    const index = this.data.knowledge.findIndex((k) => k.id === id);
    if (index === -1) return null;

    const current = this.data.knowledge[index];
    const newVersionNum = current.version + 1;
    const now = new Date().toISOString();

    const updated: KnowledgeItem = {
      ...current,
      ...updates,
      version: newVersionNum,
      updated_at: now,
    };

    this.data.knowledge[index] = updated;

    // Record historical version
    this.data.knowledge_versions.push({
      id: crypto.randomUUID(),
      knowledge_id: id,
      version: newVersionNum,
      title: updated.title,
      content: updated.content,
      category: updated.category,
      source: updated.source,
      status: updated.status,
      changed_by: author,
      change_summary: changeSummary,
      created_at: now,
    });

    this.saveData(this.data);
    return updated;
  }

  public deleteKnowledge(id: string): boolean {
    const before = this.data.knowledge.length;
    this.data.knowledge = this.data.knowledge.filter((k) => k.id !== id);
    if (this.data.knowledge.length !== before) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  public getKnowledgeVersions(knowledgeId: string): KnowledgeVersion[] {
    return this.data.knowledge_versions
      .filter((v) => v.knowledge_id === knowledgeId)
      .sort((a, b) => b.version - a.version);
  }

  // Training examples operations
  public getTrainingExamples(approvedOnly = true): TrainingExample[] {
    if (approvedOnly) {
      return this.data.training_examples.filter((t) => t.approved);
    }
    return [...this.data.training_examples];
  }

  public createTrainingExample(
    example: Omit<TrainingExample, 'id' | 'created_at' | 'updated_at'>
  ): TrainingExample {
    const now = new Date().toISOString();
    const newExample: TrainingExample = {
      ...example,
      id: `te-${crypto.randomUUID().slice(0, 8)}`,
      created_at: now,
      updated_at: now,
    };
    this.data.training_examples.push(newExample);
    this.saveData(this.data);
    return newExample;
  }

  public updateTrainingExample(
    id: string,
    updates: Partial<TrainingExample>
  ): TrainingExample | null {
    const index = this.data.training_examples.findIndex((t) => t.id === id);
    if (index === -1) return null;
    const updated = {
      ...this.data.training_examples[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.data.training_examples[index] = updated;
    this.saveData(this.data);
    return updated;
  }

  public deleteTrainingExample(id: string): boolean {
    const before = this.data.training_examples.length;
    this.data.training_examples = this.data.training_examples.filter((t) => t.id !== id);
    if (this.data.training_examples.length !== before) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // Personality examples
  public getPersonalityExamples(approvedOnly = true): PersonalityExample[] {
    if (approvedOnly) {
      return this.data.personality_examples.filter((p) => p.approved);
    }
    return [...this.data.personality_examples];
  }

  public createPersonalityExample(
    item: Omit<PersonalityExample, 'id' | 'created_at' | 'updated_at'>
  ): PersonalityExample {
    const now = new Date().toISOString();
    const newItem: PersonalityExample = {
      ...item,
      id: `pe-${crypto.randomUUID().slice(0, 8)}`,
      created_at: now,
      updated_at: now,
    };
    this.data.personality_examples.push(newItem);
    this.saveData(this.data);
    return newItem;
  }

  public updatePersonalityExample(
    id: string,
    updates: Partial<PersonalityExample>
  ): PersonalityExample | null {
    const index = this.data.personality_examples.findIndex((p) => p.id === id);
    if (index === -1) return null;
    const updated = {
      ...this.data.personality_examples[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.data.personality_examples[index] = updated;
    this.saveData(this.data);
    return updated;
  }

  public deletePersonalityExample(id: string): boolean {
    const before = this.data.personality_examples.length;
    this.data.personality_examples = this.data.personality_examples.filter((p) => p.id !== id);
    if (this.data.personality_examples.length !== before) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // Conversations & messages
  public getConversations(mode?: 'public' | 'admin_training'): Conversation[] {
    let list = this.data.conversations;
    if (mode) {
      list = list.filter((c) => c.mode === mode);
    }
    return list
      .map((c) => ({
        ...c,
        message_count: this.data.messages.filter((m) => m.conversation_id === c.id).length,
      }))
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  public getConversationById(id: string): Conversation | undefined {
    return this.data.conversations.find((c) => c.id === id);
  }

  public createConversation(mode: 'public' | 'admin_training', title?: string): Conversation {
    const now = new Date().toISOString();
    const conv: Conversation = {
      id: `conv-${crypto.randomUUID().slice(0, 10)}`,
      mode,
      title: title || (mode === 'admin_training' ? 'New Training Session' : 'New Chat'),
      created_at: now,
      updated_at: now,
    };
    this.data.conversations.push(conv);
    this.saveData(this.data);
    return conv;
  }

  public updateConversation(id: string, updates: Partial<Conversation>): Conversation | null {
    const idx = this.data.conversations.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const updated = {
      ...this.data.conversations[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.data.conversations[idx] = updated;
    this.saveData(this.data);
    return updated;
  }

  public deleteConversation(id: string): boolean {
    this.data.conversations = this.data.conversations.filter((c) => c.id !== id);
    this.data.messages = this.data.messages.filter((m) => m.conversation_id !== id);
    this.saveData(this.data);
    return true;
  }

  public getMessages(conversationId: string): ChatMessage[] {
    return this.data.messages
      .filter((m) => m.conversation_id === conversationId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  public addMessage(message: Omit<ChatMessage, 'id' | 'created_at'>): ChatMessage {
    const now = new Date().toISOString();
    const newMsg: ChatMessage = {
      ...message,
      id: `msg-${crypto.randomUUID().slice(0, 10)}`,
      created_at: now,
    };
    this.data.messages.push(newMsg);

    // Update conversation timestamp and title if first user message
    const conv = this.data.conversations.find((c) => c.id === message.conversation_id);
    if (conv) {
      conv.updated_at = now;
      if (message.sender === 'user' && conv.title.startsWith('New ')) {
        conv.title = message.text.slice(0, 42).trim() + (message.text.length > 42 ? '...' : '');
      }
    }

    this.saveData(this.data);
    return newMsg;
  }

  public updateMessage(id: string, updates: Partial<ChatMessage>): ChatMessage | null {
    const idx = this.data.messages.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    const updated = { ...this.data.messages[idx], ...updates };
    this.data.messages[idx] = updated;
    this.saveData(this.data);
    return updated;
  }

  // Response Feedback & Training Queue
  public getFeedback(status?: ResponseFeedback['status']): ResponseFeedback[] {
    if (status) {
      return this.data.response_feedback.filter((f) => f.status === status);
    }
    return [...this.data.response_feedback].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public addFeedback(
    feedback: Omit<ResponseFeedback, 'id' | 'created_at'>
  ): ResponseFeedback {
    const newFb: ResponseFeedback = {
      ...feedback,
      id: `fb-${crypto.randomUUID().slice(0, 8)}`,
      created_at: new Date().toISOString(),
    };
    this.data.response_feedback.push(newFb);
    this.saveData(this.data);
    return newFb;
  }

  public updateFeedback(
    id: string,
    updates: Partial<ResponseFeedback>
  ): ResponseFeedback | null {
    const idx = this.data.response_feedback.findIndex((f) => f.id === id);
    if (idx === -1) return null;
    const updated = { ...this.data.response_feedback[idx], ...updates };
    this.data.response_feedback[idx] = updated;
    this.saveData(this.data);
    return updated;
  }

  public getDashboardStats() {
    const publishedKnowledge = this.data.knowledge.filter(
      (k) => k.status === 'published' || k.status === 'approved'
    ).length;
    const approvedTraining = this.data.training_examples.filter((t) => t.approved).length;
    const pendingFeedback = this.data.response_feedback.filter(
      (f) => f.status === 'pending'
    ).length;
    const totalConversations = this.data.conversations.length;
    const publicConvs = this.data.conversations.filter((c) => c.mode === 'public').length;
    const trainingConvs = this.data.conversations.filter(
      (c) => c.mode === 'admin_training'
    ).length;

    return {
      totalKnowledge: this.data.knowledge.length,
      publishedKnowledge,
      trainingExamples: this.data.training_examples.length,
      approvedTraining,
      personalityExamples: this.data.personality_examples.length,
      pendingFeedback,
      totalFeedback: this.data.response_feedback.length,
      totalConversations,
      publicConversations: publicConvs,
      adminConversations: trainingConvs,
    };
  }

  // --- ADMIN ACCOUNT MANAGEMENT ---
  public getAdminUser(): AdminUser {
    if (!this.data.admin_user) {
      this.data.admin_user = initialAdminUser;
      this.saveData(this.data);
    }
    return this.data.admin_user;
  }

  public updateAdminProfile(updates: { name?: string; email?: string }): AdminUser {
    const admin = this.getAdminUser();
    if (updates.name && updates.name.trim()) {
      admin.name = updates.name.trim();
    }
    if (updates.email && updates.email.trim()) {
      admin.email = updates.email.trim().toLowerCase();
    }
    admin.updated_at = new Date().toISOString();
    this.data.admin_user = admin;

    // Keep primary admin in users list in sync
    const userIdx = this.data.users.findIndex((u) => u.role === 'admin' || u.id === admin.id);
    if (userIdx !== -1) {
      this.data.users[userIdx].name = admin.name;
      this.data.users[userIdx].email = admin.email;
    }

    this.saveData(this.data);
    return admin;
  }

  public updateAdminPassword(newPassword: string): AdminUser {
    const admin = this.getAdminUser();
    const { hash, salt } = hashPassword(newPassword);
    admin.password_hash = hash;
    admin.password_salt = salt;
    admin.updated_at = new Date().toISOString();
    this.data.admin_user = admin;
    this.saveData(this.data);
    return admin;
  }

  // --- USER MANAGEMENT ---
  public getUsers(searchQuery?: string, statusFilter?: string): AppUser[] {
    let list = [...this.data.users];

    // Ensure conversation counts reflect actual data
    const convCounts: Record<string, number> = {};
    for (const c of this.data.conversations) {
      // count by title or category if applicable
      convCounts['default'] = (convCounts['default'] || 0) + 1;
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q)
      );
    }

    if (statusFilter && statusFilter !== 'all') {
      list = list.filter((u) => u.status === statusFilter);
    }

    return list.sort(
      (a, b) => new Date(b.last_active).getTime() - new Date(a.last_active).getTime()
    );
  }

  public getUserById(id: string): AppUser | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public createUser(userData: {
    name: string;
    email: string;
    role?: 'admin' | 'user';
    status?: 'active' | 'inactive' | 'suspended';
  }): AppUser {
    const existing = this.data.users.find(
      (u) => u.email.toLowerCase() === userData.email.toLowerCase().trim()
    );
    if (existing) {
      throw new Error('A user with this email address already exists');
    }

    const newUser: AppUser = {
      id: `usr-${crypto.randomUUID().slice(0, 8)}`,
      name: userData.name.trim(),
      email: userData.email.trim().toLowerCase(),
      role: userData.role || 'user',
      status: userData.status || 'active',
      last_active: new Date().toISOString(),
      created_at: new Date().toISOString(),
      conversations_count: 0,
    };

    this.data.users.unshift(newUser);
    this.saveData(this.data);
    return newUser;
  }

  public updateUser(id: string, updates: Partial<AppUser>): AppUser | null {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;

    if (updates.email) {
      const emailLower = updates.email.trim().toLowerCase();
      const duplicate = this.data.users.find(
        (u) => u.id !== id && u.email.toLowerCase() === emailLower
      );
      if (duplicate) {
        throw new Error('A user with this email address already exists');
      }
      updates.email = emailLower;
    }

    const updated = { ...this.data.users[idx], ...updates };
    this.data.users[idx] = updated;
    this.saveData(this.data);
    return updated;
  }

  public deleteUser(id: string): boolean {
    const user = this.data.users.find((u) => u.id === id);
    if (!user) return false;
    // Disallow deleting primary admin
    if (user.role === 'admin' && user.email === this.getAdminUser().email) {
      throw new Error('The primary administrator account cannot be deleted');
    }

    this.data.users = this.data.users.filter((u) => u.id !== id);
    this.saveData(this.data);
    return true;
  }

  // --- ANALYTICS ---
  public getAnalytics(): AnalyticsSummary {
    const users = this.data.users;
    const activeUsers = users.filter((u) => u.status === 'active').length;
    const totalConversations = this.data.conversations.length;
    const publicConversations = this.data.conversations.filter((c) => c.mode === 'public').length;
    const adminConversations = this.data.conversations.filter(
      (c) => c.mode === 'admin_training'
    ).length;

    const messages = this.data.messages;
    const userMessages = messages.filter((m) => m.sender === 'user').length;
    const assistantMessages = messages.filter((m) => m.sender === 'assistant').length;

    const feedback = this.data.response_feedback;
    const positiveFeedback = feedback.filter((f) => f.rating === 'positive').length;
    const negativeFeedback = feedback.filter((f) => f.rating === 'negative').length;
    const totalFeedback = feedback.length;
    const satisfactionRate =
      totalFeedback > 0 ? Math.round((positiveFeedback / totalFeedback) * 100) : 100;

    // Latency calculation
    let totalLatency = 0;
    let latencyCount = 0;
    for (const m of messages) {
      if (m.metadata?.latency_ms) {
        totalLatency += m.metadata.latency_ms;
        latencyCount++;
      }
    }
    const avgLatencyMs = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 480;

    // Category distribution
    const catCounts: Record<string, number> = {};
    for (const k of this.data.knowledge) {
      catCounts[k.category] = (catCounts[k.category] || 0) + 1;
    }
    const topCategories = Object.entries(catCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Recent combined activity feed
    const activityItems: Array<{
      id: string;
      type: 'conversation' | 'feedback' | 'user';
      title: string;
      timestamp: string;
      detail?: string;
    }> = [];

    for (const c of this.data.conversations.slice(0, 5)) {
      activityItems.push({
        id: `act-conv-${c.id}`,
        type: 'conversation',
        title: c.title || 'Conversation started',
        timestamp: c.created_at,
        detail: `${c.mode === 'public' ? 'Visitor Chat' : 'Admin Training'} session`,
      });
    }

    for (const f of this.data.response_feedback.slice(0, 5)) {
      activityItems.push({
        id: `act-fb-${f.id}`,
        type: 'feedback',
        title: `${f.rating === 'positive' ? 'Positive' : 'Negative'} response feedback`,
        timestamp: f.created_at,
        detail: f.user_message ? `Q: "${f.user_message.slice(0, 40)}..."` : undefined,
      });
    }

    for (const u of this.data.users.slice(0, 3)) {
      activityItems.push({
        id: `act-usr-${u.id}`,
        type: 'user',
        title: `User: ${u.name}`,
        timestamp: u.last_active,
        detail: `Status: ${u.status} (${u.role})`,
      });
    }

    activityItems.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return {
      totalUsers: users.length,
      activeUsers,
      totalConversations,
      publicConversations,
      adminConversations,
      totalMessages: messages.length,
      userMessages,
      assistantMessages,
      totalFeedback,
      positiveFeedback,
      negativeFeedback,
      satisfactionRate,
      avgLatencyMs,
      topCategories,
      recentActivity: activityItems.slice(0, 8),
    };
  }

  // Schema exporter for Supabase SQL
  public generateSupabaseSQL(): string {
    return `-- ============================================================
-- PRECIOUS AI: Supabase PostgreSQL Schema with pgvector
-- Enable pgvector extension for semantic retrieval
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT UNIQUE,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. KNOWLEDGE BASE
CREATE TABLE IF NOT EXISTS knowledge (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  source TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published', 'archived')),
  version INT DEFAULT 1,
  embedding vector(768),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. KNOWLEDGE VERSIONS
CREATE TABLE IF NOT EXISTS knowledge_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  knowledge_id TEXT REFERENCES knowledge(id) ON DELETE CASCADE,
  version INT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  source TEXT,
  status TEXT NOT NULL,
  changed_by TEXT,
  change_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TRAINING EXAMPLES
CREATE TABLE IF NOT EXISTS training_examples (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  user_message TEXT NOT NULL,
  assistant_response TEXT NOT NULL,
  correction TEXT,
  approved BOOLEAN DEFAULT FALSE,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PERSONALITY EXAMPLES
CREATE TABLE IF NOT EXISTS personality_examples (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  preferred_response TEXT NOT NULL,
  notes TEXT,
  approved BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CONVERSATIONS & MESSAGES
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('public', 'admin_training')),
  title TEXT NOT NULL,
  summary TEXT,
  category TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant', 'admin')),
  text TEXT NOT NULL,
  sources_used JSONB,
  training_examples_used JSONB,
  feedback TEXT,
  correction TEXT,
  review_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. RESPONSE FEEDBACK
CREATE TABLE IF NOT EXISTS response_feedback (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  message_id TEXT,
  user_message TEXT,
  assistant_response TEXT,
  rating TEXT NOT NULL CHECK (rating IN ('positive', 'negative')),
  correction TEXT,
  admin_notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. INDEXES FOR SEMANTIC SEARCH & RLS
CREATE INDEX IF NOT EXISTS idx_knowledge_status ON knowledge(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge(category);
CREATE INDEX IF NOT EXISTS idx_training_examples_approved ON training_examples(approved);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE personality_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_feedback ENABLE ROW LEVEL SECURITY;

-- Public can read published knowledge
CREATE POLICY "Public read published knowledge" ON knowledge
  FOR SELECT USING (status = 'published');

-- Public can create messages and conversations
CREATE POLICY "Public insert conversations" ON conversations
  FOR INSERT WITH CHECK (mode = 'public');
CREATE POLICY "Public insert messages" ON messages
  FOR INSERT WITH CHECK (true);

-- Admins full access
CREATE POLICY "Admin full access knowledge" ON knowledge
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' = 'preciousdoumoyo@gmail.com');
`;
  }
}

export const db = new Database();
