export type ProjectStatus = 'Completed' | 'In Progress' | 'Planned' | 'Archived';

export interface ProjectItem {
  id: string;
  name: string;
  short_description: string;
  full_description?: string;
  category: string;
  categories?: string[];
  technologies: string[];
  features?: string[];
  role?: string;
  status: ProjectStatus;
  year?: string;
  live_url?: string;
  github_url?: string;
  portfolio_url?: string;
  other_url?: string;
  image_url?: string;
  notes?: string;
  published: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  embedding?: number[];
}

export type KnowledgeCategory =
  | 'Profile'
  | 'Education'
  | 'Skills'
  | 'AI'
  | 'Prompt Engineering'
  | 'Responsible AI'
  | 'Data Analytics'
  | 'Blockchain'
  | 'Web3'
  | 'Certifications'
  | 'Projects'
  | 'Career'
  | 'Experience'
  | 'Services'
  | 'FAQs'
  | 'Contact'
  | 'Professional Preferences'
  | 'Communication Style';

export type KnowledgeStatus = 'draft' | 'approved' | 'published' | 'archived';

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  tags: string[];
  source: string;
  status: KnowledgeStatus;
  version: number;
  embedding?: number[];
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface KnowledgeVersion {
  id: string;
  knowledge_id: string;
  version: number;
  title: string;
  content: string;
  category: KnowledgeCategory;
  source: string;
  status: KnowledgeStatus;
  changed_by: string;
  change_summary: string;
  created_at: string;
}

export interface TrainingExample {
  id: string;
  category: KnowledgeCategory | string;
  user_message: string;
  assistant_response: string;
  correction?: string;
  approved: boolean;
  source: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type PersonalityCategory =
  | 'Greeting'
  | 'Professional communication'
  | 'Casual communication'
  | 'Explanation style'
  | 'Response length'
  | 'Vocabulary'
  | 'Emoji usage'
  | 'Nigerian English preferences'
  | 'International professional English'
  | 'Humor'
  | 'Refusal style'
  | 'Unknown-answer style';

export interface PersonalityExample {
  id: string;
  category: PersonalityCategory;
  question: string;
  preferred_response: string;
  notes?: string;
  approved: boolean;
  created_at: string;
  updated_at: string;
}

export type InteractionReviewStatus =
  | 'approved'
  | 'correction'
  | 'training_example'
  | 'knowledge'
  | 'personality_example'
  | 'do_not_use'
  | 'pending';

export interface MessageSource {
  id: string;
  title: string;
  category: string;
  sourceUrl?: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender: 'user' | 'assistant' | 'admin';
  text: string;
  sources_used?: MessageSource[];
  training_examples_used?: string[];
  suggested_follow_ups?: string[];
  project_links?: Array<{ title: string; url: string; type?: string }>;
  feedback?: 'positive' | 'negative';
  correction?: string;
  review_status?: InteractionReviewStatus;
  created_at: string;
  metadata?: {
    intent?: string;
    model?: string;
    latency_ms?: number;
    tokens?: number;
  };
}

export interface Conversation {
  id: string;
  mode: 'public' | 'admin_training';
  title: string;
  summary?: string;
  category?: string;
  is_approved?: boolean;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export interface ResponseFeedback {
  id: string;
  conversation_id: string;
  message_id: string;
  user_message?: string;
  assistant_response?: string;
  rating: 'positive' | 'negative';
  correction?: string;
  admin_notes?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface AISettings {
  ai_name: string;
  assistant_title: string;
  description: string;
  tone: 'professional' | 'friendly' | 'academic' | 'executive';
  response_length: 'concise' | 'balanced' | 'detailed';
  emoji_usage: 'none' | 'minimal' | 'moderate';
  greeting_message: string;
  unknown_answer_fallback: string;
  public_chat_enabled: boolean;
  retrieval_limit: number;
  temperature: number;
  enable_rag: boolean;
  enable_training_examples: boolean;
  enable_memory: boolean;
  admin_master_password?: string;
  primary_color?: string;
  favicon_url?: string;
  favicon_version?: number;
  custom_favicon?: {
    data_base64: string;
    mime_type: string;
    file_name: string;
    uploaded_at: string;
  } | null;
}

export interface EvaluationResult {
  question: string;
  answer: string;
  retrieved_knowledge: Array<{
    id: string;
    title: string;
    content: string;
    category: string;
    score: number;
    source: string;
  }>;
  retrieved_training: Array<{
    id: string;
    category: string;
    user_message: string;
    assistant_response: string;
    correction?: string;
    score: number;
  }>;
  retrieved_personality: Array<{
    id: string;
    category: string;
    question: string;
    preferred_response: string;
  }>;
  sources_used: string[];
  execution_time_ms: number;
  safety_passed: boolean;
  rag_tier_applied: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive' | 'suspended';
  last_active: string;
  created_at: string;
  conversations_count?: number;
}

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin';
}

export interface AnalyticsSummary {
  totalUsers: number;
  activeUsers: number;
  totalConversations: number;
  publicConversations: number;
  adminConversations: number;
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  satisfactionRate: number;
  avgLatencyMs: number;
  topCategories: Array<{ category: string; count: number }>;
  recentActivity: Array<{
    id: string;
    type: 'conversation' | 'feedback' | 'user';
    title: string;
    timestamp: string;
    detail?: string;
  }>;
}
