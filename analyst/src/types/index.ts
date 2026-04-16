// ─── AI Providers ────────────────────────────────────────────────────────────
export type AIProvider = 'openai' | 'anthropic' | 'google' | 'groq';

export interface ProviderModel {
  id: string;
  name: string;
  provider: AIProvider;
  contextWindow: number;
  supportsVision: boolean;
  costPer1kInput: number;
  costPer1kOutput: number;
}

export const PROVIDER_MODELS: ProviderModel[] = [
  { id: 'gpt-4o',           name: 'GPT-4o',           provider: 'openai',    contextWindow: 128000, supportsVision: true,  costPer1kInput: 0.005,  costPer1kOutput: 0.015  },
  { id: 'gpt-4o-mini',      name: 'GPT-4o Mini',      provider: 'openai',    contextWindow: 128000, supportsVision: true,  costPer1kInput: 0.00015,costPer1kOutput: 0.0006 },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic', contextWindow: 200000, supportsVision: true, costPer1kInput: 0.003,  costPer1kOutput: 0.015  },
  { id: 'claude-3-haiku-20240307',    name: 'Claude 3 Haiku',    provider: 'anthropic', contextWindow: 200000, supportsVision: true, costPer1kInput: 0.00025,costPer1kOutput: 0.00125},
  { id: 'gemini-1.5-pro',   name: 'Gemini 1.5 Pro',   provider: 'google',    contextWindow: 1000000,supportsVision: true,  costPer1kInput: 0.00125,costPer1kOutput: 0.005  },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google',    contextWindow: 1000000,supportsVision: true,  costPer1kInput: 0.000075,costPer1kOutput: 0.0003},
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.1 70B', provider: 'groq', contextWindow: 128000, supportsVision: false, costPer1kInput: 0.00059,costPer1kOutput: 0.00079},
  { id: 'llama-3.1-8b-instant',      name: 'Mixtral 8x7B', provider: 'groq',  contextWindow: 32768,  supportsVision: false, costPer1kInput: 0.00027,costPer1kOutput: 0.00027},
];

// ─── Chat ─────────────────────────────────────────────────────────────────────
export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
  tokenCount?: number;
  cost?: number;
  sources?: DocumentSource[];
  webSources?: WebSource[];
  feedback?: 'up' | 'down' | null;
  modelId?: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  modelId: string;
  temperature: number;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  totalTokens: number;
  totalCost: number;
}

// ─── Documents ────────────────────────────────────────────────────────────────
export type DocumentType = 'pdf' | 'txt' | 'md' | 'csv' | 'docx';

export interface Document {
  id: string;
  userId: string;
  name: string;
  type: DocumentType;
  size: number;
  storagePath: string;
  chunkCount: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  errorMessage?: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  embedding?: number[];
}

export interface DocumentSource {
  documentId: string;
  documentName: string;
  chunkContent: string;
  similarity: number;
}

// ─── Web Search ───────────────────────────────────────────────────────────────
export interface WebSource {
  url: string;
  title: string;
  snippet: string;
  publishedDate?: string;
}

// ─── Citations ────────────────────────────────────────────────────────────────
export type CitationFormat = 'apa' | 'mla' | 'chicago';

export interface Citation {
  id: string;
  userId: string;
  sessionId?: string;
  title: string;
  authors: string[];
  url?: string;
  publicationDate?: string;
  publisher?: string;
  journalName?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  source: 'document' | 'web' | 'manual';
  documentId?: string;
  createdAt: Date;
  formattedApa?: string;
  formattedMla?: string;
  formattedChicago?: string;
}

// ─── Reports ──────────────────────────────────────────────────────────────────
export interface Report {
  id: string;
  userId: string;
  sessionId?: string;
  title: string;
  content: string;
  format: 'docx' | 'pdf' | 'md';
  storagePath: string;
  createdAt: Date;
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export interface AnalyticsData {
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  messagesByDay: { date: string; count: number }[];
  tokensByModel: { model: string; tokens: number }[];
  topDocuments: { name: string; queries: number }[];
  feedbackBreakdown: { positive: number; negative: number; neutral: number };
}

// ─── UI / Store ───────────────────────────────────────────────────────────────
export interface AppSettings {
  modelId: string;
  temperature: number;
  maxTokens: number;
  personality: 'professional' | 'academic' | 'concise' | 'friendly';
  enableWebSearch: boolean;
  enableRAG: boolean;
  streamingEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
}

export interface ActiveTools {
  ragSearch: boolean;
  webSearch: boolean;
  generateReport: boolean;
  saveCitation: boolean;
  analyzeData: boolean;
  compareSources: boolean;
}
