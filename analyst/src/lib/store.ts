import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings, ActiveTools, ChatSession, Document } from '@/types';

interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AppStore {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  activeTools: ActiveTools;
  toggleTool: (tool: keyof ActiveTools) => void;
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  sessions: ChatSession[];
  setSessions: (sessions: ChatSession[]) => void;
  addSession: (session: ChatSession) => void;
  removeSession: (id: string) => void;
  documents: Document[];
  setDocuments: (docs: Document[]) => void;
  addDocument: (doc: Document) => void;
  removeDocument: (id: string) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  // Message persistence per session
  sessionMessages: Record<string, StoredMessage[]>;
  setSessionMessages: (sessionId: string, messages: StoredMessage[]) => void;
  clearSessionMessages: (sessionId: string) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  modelId: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 2000,
  personality: 'professional',
  enableWebSearch: true,
  enableRAG: true,
  streamingEnabled: true,
  theme: 'system',
};

const DEFAULT_TOOLS: ActiveTools = {
  ragSearch: true,
  webSearch: true,
  generateReport: true,
  saveCitation: true,
  analyzeData: true,
  compareSources: true,
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
      activeTools: DEFAULT_TOOLS,
      toggleTool: (tool) =>
        set((s) => ({ activeTools: { ...s.activeTools, [tool]: !s.activeTools[tool] } })),
      currentSessionId: null,
      setCurrentSessionId: (id) => set({ currentSessionId: id }),
      sessions: [],
      setSessions: (sessions) => set({ sessions }),
      addSession: (session) =>
        set((s) => ({ sessions: [session, ...s.sessions] })),
      removeSession: (id) =>
        set((s) => ({ sessions: s.sessions.filter((s) => s.id !== id) })),
      documents: [],
      setDocuments: (docs) => set({ documents: docs }),
      addDocument: (doc) =>
        set((s) => ({ documents: [doc, ...s.documents] })),
      removeDocument: (id) =>
        set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),
      sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      activeTab: 'chat',
      setActiveTab: (tab) => set({ activeTab: tab }),
      sessionMessages: {},
      setSessionMessages: (sessionId, messages) =>
        set((s) => ({ sessionMessages: { ...s.sessionMessages, [sessionId]: messages } })),
      clearSessionMessages: (sessionId) =>
        set((s) => {
          const { [sessionId]: _, ...rest } = s.sessionMessages;
          return { sessionMessages: rest };
        }),
    }),
    {
      name: 'analyst-ai-store',
      partialize: (s) => ({
        settings: s.settings,
        activeTools: s.activeTools,
        sessionMessages: s.sessionMessages,
      }),
    }
  )
);
