'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { PROVIDER_MODELS } from '@/types';
import type { ActiveTools, ChatSession, AppSettings } from '@/types';
import {
  MessageSquare, Plus, Trash2, Settings2, Globe,
  Database, FileText, BookOpen, BarChart2, GitCompare, LogOut,
  ChevronDown, ChevronUp, Terminal,
} from 'lucide-react';
import { createClient } from '@/lib/db/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils/cn';

const TOOL_ICONS: Record<keyof ActiveTools, React.ReactNode> = {
  ragSearch:      <Database size={11} />,
  webSearch:      <Globe size={11} />,
  generateReport: <FileText size={11} />,
  saveCitation:   <BookOpen size={11} />,
  analyzeData:    <BarChart2 size={11} />,
  compareSources: <GitCompare size={11} />,
};

const TOOL_LABELS: Record<keyof ActiveTools, string> = {
  ragSearch:      'Document search',
  webSearch:      'Web search',
  generateReport: 'Report generation',
  saveCitation:   'Citation saver',
  analyzeData:    'Data analysis',
  compareSources: 'Source compare',
};

interface SidebarProps {
  user: { email?: string; id: string } | null;
}

export default function Sidebar({ user }: SidebarProps) {
  const router = useRouter();
  const {
    settings, updateSettings, activeTools, toggleTool,
    currentSessionId, setCurrentSessionId,
    sessions, setSessions, addSession, removeSession,
  } = useAppStore();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toolsOpen, setToolsOpen]       = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    setLoadingSessions(true);
    fetch('/api/sessions')
      .then(r => r.json())
      .then(d => setSessions(d.sessions ?? []))
      .finally(() => setLoadingSessions(false));
  }, [setSessions]);

  async function createSession() {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New session', modelId: settings.modelId }),
    });
    const { session } = await res.json();
    addSession(session);
    setCurrentSessionId(session.id);
    useAppStore.getState().setSessionMessages(session.id, []);
  }

  async function deleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch('/api/sessions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: id }),
    });
    removeSession(id);
    if (currentSessionId === id) setCurrentSessionId(null);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/auth/login');
  }

  const modelsByProvider = PROVIDER_MODELS.reduce((acc, m) => {
    if (!acc[m.provider]) acc[m.provider] = [];
    acc[m.provider].push(m);
    return acc;
  }, {} as Record<string, typeof PROVIDER_MODELS>);

  const initials = user?.email?.[0]?.toUpperCase() ?? 'U';

  return (
    <div className="flex h-full w-[260px] min-w-[260px] flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080c14]">

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-slate-200 dark:border-slate-800">
        <div className="relative h-8 w-8 rounded-lg bg-sky-500/10 dark:bg-cyan-500/10 border border-sky-500/20 dark:border-cyan-500/20 flex items-center justify-center flex-shrink-0">
          <Terminal size={14} className="text-sky-600 dark:text-cyan-400" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 border-2 border-white dark:border-[#080c14]" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">Analyst AI</p>
          <p className="text-[9px] font-mono text-slate-400 dark:text-slate-400 tracking-wider">RESEARCH OS v2.0</p>
        </div>
      </div>

      {/* New session */}
      <div className="px-3 py-3">
        <button
          onClick={createSession}
          className="flex w-full items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:border-sky-300 dark:hover:border-cyan-500/30 px-3 py-2 text-xs font-mono text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all group"
        >
          <Plus size={13} className="text-sky-600 dark:text-cyan-400 group-hover:rotate-90 transition-transform duration-200" />
          new session
          <span className="ml-auto text-[9px] text-slate-400 dark:text-slate-500">⌘N</span>
        </button>
      </div>

      {/* Sessions */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <p className="px-2 py-1.5 text-[9px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-400">Sessions</p>

        {loadingSessions ? (
          <div className="space-y-1 px-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-7 rounded-md bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="px-2 text-[10px] font-mono text-slate-300 dark:text-slate-400 italic">no sessions yet</p>
        ) : (
          <div className="space-y-0.5">
            {sessions.map((session: ChatSession) => (
              <button
                key={session.id}
                onClick={() => useAppStore.getState().setCurrentSessionId(session.id)}
                className={cn(
                  'group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-all',
                  currentSessionId === session.id
                    ? 'bg-sky-500/10 dark:bg-cyan-500/10 text-sky-600 dark:text-cyan-400 border border-sky-500/20 dark:border-cyan-500/20'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300'
                )}
              >
                <MessageSquare size={11} className="flex-shrink-0" />
                <span className="flex-1 truncate text-[11px] font-mono">{session.title}</span>
                <Trash2
                  size={10}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                  onClick={(e) => deleteSession(session.id, e)}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Agent Tools */}
      <div className="border-t border-slate-200 dark:border-slate-800 px-3 py-2">
        <button
          onClick={() => setToolsOpen(!toolsOpen)}
          className="flex w-full items-center justify-between text-[9px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-500 py-1 transition-colors"
        >
          Agent Tools
          {toolsOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>

        {toolsOpen && (
          <div className="mt-1 space-y-0.5">
            {(Object.keys(activeTools) as (keyof ActiveTools)[]).map(tool => (
              <label
                key={tool}
                className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer transition-all group"
              >
                <div className={cn(
                  'h-3 w-3 rounded border transition-all flex items-center justify-center flex-shrink-0',
                  activeTools[tool]
                    ? 'bg-sky-500/20 dark:bg-cyan-500/20 border-sky-500/50 dark:border-cyan-500/50'
                    : 'border-slate-300 dark:border-slate-700 bg-transparent'
                )}>
                  {activeTools[tool] && <div className="h-1.5 w-1.5 rounded-sm bg-sky-600 dark:bg-cyan-400" />}
                </div>
                <input
                  type="checkbox"
                  checked={activeTools[tool]}
                  onChange={() => toggleTool(tool)}
                  className="sr-only"
                />
                <span className={cn(
                  'text-[10px] font-mono transition-colors',
                  activeTools[tool] ? 'text-slate-600 dark:text-slate-400' : 'text-slate-400 dark:text-slate-400'
                )}>
                  {TOOL_LABELS[tool]}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="border-t border-slate-200 dark:border-slate-800 px-3 py-2">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="flex w-full items-center justify-between text-[9px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-500 py-1 transition-colors"
        >
          <span className="flex items-center gap-1"><Settings2 size={9} /> Config</span>
          {settingsOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>

        {settingsOpen && (
          <div className="mt-2 space-y-3">
            {/* Model */}
            <div>
              <label className="text-[9px] font-mono text-slate-400 dark:text-slate-600 block mb-1 tracking-wider">MODEL</label>
              <select
                value={settings.modelId}
                onChange={e => updateSettings({ modelId: e.target.value })}
                className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1.5 text-[10px] font-mono focus:outline-none focus:border-sky-500 dark:focus:border-cyan-500/50"
              >
                {Object.entries(modelsByProvider).map(([provider, models]) => (
                  <optgroup key={provider} label={provider.toUpperCase()}>
                    {models.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Temperature */}
            <div>
              <label className="text-[9px] font-mono text-slate-400 dark:text-slate-600 flex justify-between mb-1 tracking-wider">
                <span>TEMPERATURE</span>
                <span className="text-sky-600 dark:text-cyan-500">{settings.temperature.toFixed(1)}</span>
              </label>
              <input
                type="range" min={0} max={1} step={0.1}
                value={settings.temperature}
                onChange={e => updateSettings({ temperature: parseFloat(e.target.value) })}
                className="w-full accent-sky-600 dark:accent-cyan-500 cursor-pointer"
              />
            </div>

            {/* Personality */}
            <div>
              <label className="text-[9px] font-mono text-slate-400 dark:text-slate-600 block mb-1 tracking-wider">PERSONA</label>
              <select
                value={settings.personality}
                onChange={e => updateSettings({ personality: e.target.value as AppSettings['personality'] })}
                className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1.5 text-[10px] font-mono focus:outline-none focus:border-sky-500 dark:focus:border-cyan-500/50"
              >
                <option value="professional">Professional</option>
                <option value="academic">Academic</option>
                <option value="concise">Concise</option>
                <option value="friendly">Friendly</option>
              </select>
            </div>

            {/* Theme */}
            <div>
              <label className="text-[9px] font-mono text-slate-400 dark:text-slate-600 block mb-1 tracking-wider">THEME</label>
              <div className="flex gap-1">
                {(['light', 'dark', 'system'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => {
                      updateSettings({ theme: t });
                      const dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                      document.documentElement.classList.toggle('dark', dark);
                      localStorage.setItem('theme', t);
                    }}
                    className={cn(
                      'flex-1 rounded-md py-1 text-[9px] font-mono capitalize transition-all',
                      settings.theme === t
                        ? 'bg-sky-600 dark:bg-cyan-500 text-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-600 border border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-slate-600'
                    )}
                  >{t}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User footer */}
      <div className="border-t border-slate-200 dark:border-slate-800 px-3 py-2.5 flex items-center gap-2">
        <div className="h-6 w-6 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold font-mono text-slate-500 dark:text-slate-400">{initials}</span>
        </div>
        <span className="flex-1 text-[10px] font-mono text-slate-400 dark:text-slate-600 truncate">{user?.email ?? 'user'}</span>
        <button
          onClick={signOut}
          className="text-slate-400 dark:text-slate-400 hover:text-red-500 rounded p-1 transition-all"
        >
          <LogOut size={12} />
        </button>
      </div>
    </div>
  );
}