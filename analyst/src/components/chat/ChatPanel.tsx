'use client';

import { useChat } from 'ai/react';
import { useAppStore } from '@/lib/store';
import { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send, Square, Play, ThumbsUp, ThumbsDown, Copy, RotateCcw,
  Globe, Database, FileText, Sparkles, AlertCircle, Mic, MicOff,
  HelpCircle, Search, Brain, BarChart2, Loader2, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import OnboardingTour from '@/components/onboarding/OnboardingTour';
import SourcesPanel from '@/components/chat/SourcesPanel';

const TOOL_DISPLAY: Record<string, { icon: React.ReactNode; label: string }> = {
  ragSearch:        { icon: <Database size={11} />,  label: 'Searching documents...' },
  webSearch:        { icon: <Globe size={11} />,     label: 'Fetching web results...' },
  generateReport:   { icon: <FileText size={11} />,  label: 'Generating report...' },
  saveCitation:     { icon: <FileText size={11} />,  label: 'Saving citation...' },
  analyzeData:      { icon: <BarChart2 size={11} />, label: 'Analysing data...' },
  compareDocuments: { icon: <Search size={11} />,    label: 'Comparing documents...' },
};

function ThinkingSteps({ steps }: { steps: string[] }) {
  if (steps.length === 0) return null;
  return (
    <div className="mb-2 rounded-xl bg-indigo-50 dark:bg-[#12121e] border border-indigo-200 dark:border-[#2a2a3a] px-3 py-2.5 text-xs text-gray-500 space-y-1.5">
      <p className="text-[10px] text-indigo-400 font-medium uppercase tracking-wide flex items-center gap-1">
        <Brain size={10} className="text-brand-400" /> AI is working
      </p>
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2 animate-fade-in">
          <span className="h-1 w-1 rounded-full bg-sky-400 dark:bg-cyan-400 animate-pulse flex-shrink-0" />
          <span>{step}</span>
        </div>
      ))}
    </div>
  );
}

export default function ChatPanel() {
  const {
    settings, activeTools, currentSessionId, setCurrentSessionId,
    sessions, setSessions, sessionMessages, setSessionMessages,
  } = useAppStore();

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const hasRestoredRef = useRef<string | null>(null);

  const [feedback, setFeedback]             = useState<Record<string, 'up' | 'down'>>({});
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [thinkingSteps, setThinkingSteps]   = useState<string[]>([]);

  useEffect(() => {
    const seen = localStorage.getItem('analyst-ai-onboarded');
    if (!seen) setShowOnboarding(true);
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem('analyst-ai-onboarded', 'true');
    setShowOnboarding(false);
  };

  useEffect(() => {
    const stored = sessionMessages[currentSessionId ?? ''] ?? [];
    setMessages(stored as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId]);

  const { messages, input, handleInputChange, handleSubmit, isLoading, stop, reload, error, setMessages } = useChat({
    api: '/api/chat',
    body: {
      sessionId: currentSessionId,
      modelId: settings.modelId,
      temperature: settings.temperature,
      personality: settings.personality,
      activeTools,
      enableWebSearch: settings.enableWebSearch,
      enableRAG: settings.enableRAG,
    },
    onToolCall: ({ toolCall }: any) => {
      const display = TOOL_DISPLAY[toolCall.toolName];
      if (display) setThinkingSteps(prev => [...prev, display.label]);
    },
    onFinish: () => {
      setTimeout(() => setThinkingSteps([]), 2000);
      if (currentSessionId) {
        fetch('/api/sessions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: currentSessionId, _ping: true }),
        });
        fetch('/api/sessions').then(r => r.json()).then(d => {
          if (d.sessions) setSessions(d.sessions);
        });
      }
    },
  });

  useEffect(() => { if (!isLoading) setThinkingSteps([]); }, [isLoading]);

  const handleVoiceResult = useCallback((transcript: string) => {
    handleInputChange({ target: { value: transcript } } as React.ChangeEvent<HTMLTextAreaElement>);
    toast.success('Voice captured! Press Enter to send.', { icon: '🎤' });
  }, [handleInputChange]);

  const handleVoiceError = useCallback((err: string) => {
    if (err === 'not-allowed')    toast.error('Microphone access denied.');
    else if (err === 'no-speech') toast('No speech detected. Try again.', { icon: '🎤' });
    else toast.error('Voice error: ' + err);
  }, []);

  const { isListening, isSupported, startListening, stopListening } = useSpeechRecognition({
    onResult: handleVoiceResult,
    onError:  handleVoiceError,
  });

  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      const toStore = messages.map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
      setSessionMessages(currentSessionId, toStore);
    }
  }, [messages, currentSessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, thinkingSteps]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) handleSubmit(e as unknown as React.FormEvent);
    }
  }

  async function submitFeedback(messageId: string, type: 'up' | 'down') {
    setFeedback(prev => ({ ...prev, [messageId]: type }));
    await fetch('/api/sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, feedback: type }),
    });
  }

  const SUGGESTIONS = [
    'Summarise all uploaded documents',
    'Search the web for the latest AI research',
    'Generate a professional research report',
    'Compare sources on a specific topic',
  ];

  const hasMessages = messages.some(m => m.content);

  return (
    <>
      {showOnboarding && <OnboardingTour onComplete={handleOnboardingComplete} />}

      <div className="flex h-full overflow-hidden bg-[#f4f3ff] dark:bg-[#0d0d16]">

        {/* ── LEFT — Query Panel ── */}
        <div className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080c14] flex-col max-md:hidden" style={{display: undefined}}>

          <div className="px-4 py-3 border-b border-indigo-100 dark:border-[#1e1e2e]">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Research query</p>
          </div>

          <div className="p-3 flex-1 flex flex-col gap-3 overflow-y-auto">
            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? 'Listening… speak now' : 'Enter your research question...'}
                rows={4}
                className={cn(
                  'w-full resize-none rounded-xl border px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all text-gray-800 dark:text-gray-200',
                  isListening
                    ? 'border-red-400 bg-red-50 dark:bg-red-950/20 animate-pulse'
                    : 'border-indigo-200 dark:border-[#2a2a3a] bg-indigo-50 dark:bg-[#12121e]'
                )}
                style={{ minHeight: '90px' }}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 200) + 'px';
                }}
              />

              <div className="flex gap-2">
                {isLoading ? (
                  <button
                    type="button"
                    onClick={stop}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-all"
                  >
                    <Square size={12} /> Stop
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-violet-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 shadow-md shadow-sky-500/20 transition-all"
                  >
                    <Play size={12} /> Run analysis
                  </button>
                )}

                {isSupported && (
                  <button
                    type="button"
                    onClick={() => isListening ? stopListening() : startListening()}
                    className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 border',
                      isListening
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-indigo-50 dark:bg-[#1a1a28] border-indigo-200 dark:border-[#2a2a3a] text-gray-500 hover:text-brand-500 hover:border-brand-500'
                    )}
                  >
                    {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                  </button>
                )}
              </div>
            </form>

            {/* Quick prompts */}
            {!hasMessages && (
              <>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-1">Quick prompts</p>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        handleInputChange({ target: { value: s } } as React.ChangeEvent<HTMLTextAreaElement>);
                        inputRef.current?.focus();
                      }}
                      className="text-left text-xs px-3 py-2 rounded-lg border border-indigo-200 dark:border-[#2a2a3a] bg-indigo-50 dark:bg-[#12121e] text-gray-600 dark:text-gray-400 hover:border-brand-500 hover:text-brand-600 hover:bg-indigo-100 dark:hover:bg-[#1a1a2e] transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Active tools */}
            <div className="mt-auto pt-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Active tools</p>
              <div className="flex flex-col gap-1.5">
                {settings.enableRAG && activeTools.ragSearch && (
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <Database size={11} className="text-brand-500" /> Document search
                  </div>
                )}
                {settings.enableWebSearch && activeTools.webSearch && (
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <Globe size={11} className="text-emerald-500" /> Web search
                  </div>
                )}
                {activeTools.generateReport && (
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <FileText size={11} className="text-amber-500" /> Report generation
                  </div>
                )}
              </div>
            </div>

            {/* Model tag */}
            <div className="rounded-lg border border-indigo-200 dark:border-[#2a2a3a] bg-indigo-50 dark:bg-[#12121e] px-3 py-2">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">{settings.modelId} · {settings.personality}</p>
              {isSupported && <p className="text-[10px] text-brand-500 mt-0.5">Voice ready</p>}
            </div>
          </div>
        </div>

        {/* ── RIGHT — Results Panel ── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Output header */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-indigo-100 dark:border-[#1e1e2e] bg-white dark:bg-[#0a0a0f]">
            <div className="h-2 w-2 rounded-full bg-brand-500" />
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-300">Analysis output</p>
            {hasMessages && (
              <span className="text-xs text-gray-400 truncate max-w-xs">
                — {messages.find(m => m.role === 'user')?.content?.slice(0, 50)}
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setShowOnboarding(true)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-indigo-50 dark:hover:bg-[#7c5cfc10] transition-colors"
                title="Help"
              >
                <HelpCircle size={14} />
              </button>
              {hasMessages && (
                <button
                  onClick={() => { setMessages([]); setThinkingSteps([]); }}
                  className="text-xs px-3 py-1 rounded-lg border border-indigo-200 dark:border-[#2a2a3a] text-gray-500 hover:text-red-500 hover:border-red-300 dark:hover:border-red-500/30 transition-all"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Thinking / loading bar */}
          {(thinkingSteps.length > 0 || isLoading) && (
            <div className="px-5 border-b border-indigo-100 dark:border-[#1e1e2e] bg-indigo-50 dark:bg-[#0d0d16] flex items-center gap-2 flex-wrap py-2 text-xs">
              {thinkingSteps.map((step, i) => (
                <span key={i} className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle2 size={11} />{step}
                  {i < thinkingSteps.length - 1 && <span className="text-gray-300 ml-1">·</span>}
                </span>
              ))}
              {isLoading && (
                <span className="flex items-center gap-1 text-sky-500 dark:text-cyan-400 animate-pulse">
                  {thinkingSteps.length > 0 && <span className="text-gray-300">·</span>}
                  <Loader2 size={11} className="animate-spin" /> Synthesising...
                </span>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-[#f4f3ff] dark:bg-[#0a0a0f]">
            {!hasMessages ? (
              /* Empty state */
              <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-indigo-200 dark:border-[#2a2a3a] flex items-center justify-center">
                  <Sparkles size={24} className="text-brand-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
                    Your AI Research Analyst
                  </h2>
                  <p className="mt-2 text-sm text-gray-500 max-w-sm leading-relaxed">
                    Type your research question below to get structured analysis, insights, and sources.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-2 max-w-md">
                  {[
                    { icon: <Database size={14} />, label: 'Document search', color: 'text-brand-500' },
                    { icon: <Globe size={14} />,    label: 'Web research',    color: 'text-emerald-500' },
                    { icon: <FileText size={14} />, label: 'Report export',   color: 'text-amber-500' },
                  ].map(f => (
                    <div
                      key={f.label}
                      className="rounded-xl border border-indigo-200 dark:border-[#2a2a3a] bg-white dark:bg-[#12121e] p-3 text-center hover-lift"
                    >
                      <div className={cn('flex justify-center mb-1', f.color)}>{f.icon}</div>
                      <p className="text-xs text-gray-500">{f.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Message list */
              <div className="px-5 py-4 space-y-4 max-w-3xl mx-auto w-full">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn('animate-fade-in', message.role === 'user' ? 'flex justify-end' : 'block')}
                  >
                    {message.role === 'user' ? (
                      /* User bubble — only show if has content */
                      message.content ? (
                        <div className="max-w-sm">
                          <p className="text-[10px] text-gray-400 mb-1 text-right uppercase tracking-wide">Query</p>
                          <div className="rounded-2xl rounded-tr-sm bg-gradient-to-r from-sky-600 to-violet-600 px-4 py-3 text-sm text-white shadow-md shadow-sky-500/20">
                            {message.content}
                          </div>
                        </div>
                      ) : null
                    ) : (
                      /* Assistant bubble — only show if has content */
                      message.content ? (
                        <div className="group">
                          <p className="text-[10px] text-gray-400 mb-2 flex items-center gap-1 uppercase tracking-wide">
                            <Sparkles size={9} className="text-brand-500" /> Analysis result
                          </p>
                          <div className="rounded-2xl border border-indigo-200 dark:border-[#2a2a3a] bg-white dark:bg-[#12121e] px-5 py-4 shadow-sm">
                            <div className="prose-chat text-sm leading-relaxed">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                            </div>
                          </div>
                          <SourcesPanel toolInvocations={message.toolInvocations as any} />
                          <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <button
                              onClick={() => { navigator.clipboard.writeText(message.content); toast.success('Copied'); }}
                              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-400 hover:text-brand-500 hover:bg-indigo-50 dark:hover:bg-[#7c5cfc10] transition-all"
                            >
                              <Copy size={10} /> Copy
                            </button>
                            <button
                              onClick={() => submitFeedback(message.id, 'up')}
                              className={cn(
                                'flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-all',
                                feedback[message.id] === 'up'
                                  ? 'text-green-600 bg-green-50 dark:bg-green-500/10'
                                  : 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10'
                              )}
                            >
                              <ThumbsUp size={10} /> Helpful
                            </button>
                            <button
                              onClick={() => submitFeedback(message.id, 'down')}
                              className={cn(
                                'flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-all',
                                feedback[message.id] === 'down'
                                  ? 'text-red-500 bg-red-50 dark:bg-red-500/10'
                                  : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
                              )}
                            >
                              <ThumbsDown size={10} /> Not helpful
                            </button>
                            <span className="ml-2 text-[10px] text-gray-400">via {settings.modelId}</span>
                          </div>
                        </div>
                      ) : null
                    )}
                  </div>
                ))}

                {/* Loading bubble */}
                {isLoading && (
                  <div className="animate-fade-in">
                    <p className="text-[10px] text-gray-400 mb-2 flex items-center gap-1 uppercase tracking-wide">
                      <Sparkles size={9} className="text-sky-500 dark:text-cyan-400 animate-pulse" /> Analysing
                    </p>
                    <div className="rounded-2xl border border-indigo-200 dark:border-[#2a2a3a] bg-white dark:bg-[#12121e] px-5 py-4">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-400 dark:bg-cyan-400 animate-pulse" />
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-400 dark:bg-cyan-400 animate-pulse [animation-delay:0.15s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-400 dark:bg-cyan-400 animate-pulse [animation-delay:0.3s]" />
                        <span className="ml-1">Processing your research query...</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle size={14} />
                    <span>{error.message || 'Something went wrong.'}</span>
                    <button
                      onClick={() => reload()}
                      className="ml-auto flex items-center gap-1 text-xs font-medium"
                    >
                      <RotateCcw size={11} /> Retry
                    </button>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </div>
      </div>
        {/* ── Mobile input bar ── */}
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080c14] p-3 flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e: any) => handleKeyDown(e)}
              placeholder="Ask a research question..."
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-cyan-500"
            />
            {isLoading ? (
              <button type="button" onClick={stop}
                className="px-4 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold flex-shrink-0">
                Stop
              </button>
            ) : (
              <button type="submit" disabled={!input.trim()}
                className="px-4 py-2.5 rounded-xl bg-sky-600 dark:bg-cyan-500 hover:bg-sky-500 dark:hover:bg-cyan-400 text-white dark:text-slate-900 text-xs font-bold disabled:opacity-40 flex-shrink-0 transition-all">
                Send
              </button>
            )}
          </form>
        </div>

    </>
  );
}